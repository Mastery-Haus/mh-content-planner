// Carga piezas definidas en el chat (skill "cargar-tablero") a la tabla `pieces` real.
// Ver DECISIONS.md Decisión 16 para el contexto de este flujo.
//
// Uso: node --env-file=.env.local scripts/cargar-piezas.mjs <piezas.json> [--dry-run]
//
// El JSON es un array de piezas. Cada pieza puede ir a varias plataformas a la vez (mismo
// contenido cross-posteado, que en el tablero es una fila por plataforma):
//   {
//     "brand": "sofia-contreras",            // slug de la marca
//     "date": "2026-10-14",                   // YYYY-MM-DD
//     "platforms": ["instagram", "facebook"], // o "platform": "instagram"
//     "format": "CARRUSEL",                   // código o etiqueta ("Carrusel"); libre en email/newsletter
//     "angle": "Placa: La calidad de tus preguntas",
//     "copy": "…caption…",
//     "material": "https://drive.google.com/drive/folders/…", // o ruta local de Drive Desktop
//     "portada": "",                          // opcional, link o ruta local
//     "notas": "",                            // opcional
//     "estado": "listo"                       // opcional, default "listo" (Decisión 16)
//   }
//
// Upsert por marca+fecha+plataforma+ángulo (misma clave normalizada que import-csv.mjs,
// Decisión 14): si la fila ya existe se actualizan solo los campos que vienen con contenido
// (nunca se pisa algo cargado con un vacío). Las piezas ya publicadas no se tocan.

import { readFileSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { PLATFORMS, ESTADOS, PLATFORM_META, FORMAT_LABEL, STATUS_META, formatsFor, usesFreeformFormat } from "../src/lib/pieces.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [jsonPath] = args.filter((a) => a !== "--dry-run");
if (!jsonPath) {
  console.error("Uso: node --env-file=.env.local scripts/cargar-piezas.mjs <piezas.json> [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const APP_URL = "https://mh-content-planner.vercel.app";
const INSTAGRAM_BY_BRAND = { "mastery-haus": "instagram_mh", "sofia-contreras": "instagram" };
const TEXT_FIELDS =["format", "angle", "copy", "material", "portada", "notas", "estado"];

function normKey(date, platform, angle) {
  return `${date}|${platform}|${(angle || "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

// material/portada pueden venir como ruta local dentro de Google Drive Desktop (ej. la
// carpeta de la pieza en la Bóveda): se convierten al link real de Drive leyendo el id que
// Drive Desktop guarda como atributo extendido del archivo/carpeta.
function toDriveUrl(value, where, errors) {
  const v = (value || "").trim();
  if (!v.startsWith("/") && !v.startsWith("~")) return v;
  const path = v.replace(/^~/, homedir());
  try {
    const id = execFileSync("xattr", ["-p", "com.google.drivefs.item-id#S", path], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return statSync(path).isDirectory()
      ? `https://drive.google.com/drive/folders/${id}`
      : `https://drive.google.com/file/d/${id}/view`;
  } catch {
    errors.push(`${where}: no se pudo obtener el link de Drive de "${v}" (¿existe y está dentro de Google Drive Desktop?)`);
    return v;
  }
}

// Las piezas de la Bóveda se entregan en dos subcarpetas por tamaño: Instagram publica el
// 4:5 y el resto de las plataformas el 1:1 (Decisión 16). Si `material` es la carpeta de la
// pieza y tiene esas subcarpetas, cada plataforma recibe el link a la suya.
function materialFor(value, platform) {
  const v = (value || "").trim();
  if (!v.startsWith("/") && !v.startsWith("~")) return v;
  const sub = platform === "instagram" || platform === "instagram_mh" ? "4:5" : "1:1";
  const candidate = `${v.replace(/\/+$/, "")}/${sub}`;
  return existsSync(candidate.replace(/^~/, homedir())) ? candidate : v;
}

const formatByLabel = Object.fromEntries(Object.entries(FORMAT_LABEL).map(([k, v]) => [v.toLowerCase(), k]));

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase REST error ${res.status} en ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Valida y expande una pieza del JSON a una fila por plataforma.
function expand(item, i, brandIdBySlug, errors) {
  const where = `Pieza ${i + 1} (${item.angle || "sin ángulo"})`;
  const brandId = brandIdBySlug[item.brand];
  if (!brandId) errors.push(`${where}: marca desconocida "${item.brand}" (válidas: ${Object.keys(brandIdBySlug).join(", ")})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date || "") || Number.isNaN(Date.parse(item.date)))
    errors.push(`${where}: fecha inválida "${item.date}" (formato YYYY-MM-DD)`);
  if (!(item.angle || "").trim()) errors.push(`${where}: falta el ángulo/título`);
  const estado = item.estado || "listo";
  if (!ESTADOS.includes(estado)) errors.push(`${where}: estado inválido "${estado}" (válidos: ${ESTADOS.join(", ")})`);

  const platforms = item.platforms || (item.platform ? [item.platform] : []);
  if (!platforms.length) errors.push(`${where}: falta la plataforma`);
  const portada = toDriveUrl(item.portada, where, errors);

  return platforms.map((requested) => {
    // La cuenta de Instagram la define la marca, no la elección de cada carga: Mastery Haus
    // publica en instagram_mh y Sofia Contreras en instagram (Decisión 16).
    const platform = requested === "instagram" || requested === "instagram_mh" ? INSTAGRAM_BY_BRAND[item.brand] || requested : requested;
    if (!PLATFORMS.includes(platform)) {
      errors.push(`${where}: plataforma desconocida "${platform}" (válidas: ${PLATFORMS.join(", ")})`);
      return null;
    }
    let format = (item.format || "").trim();
    if (!usesFreeformFormat(platform)) {
      format = FORMAT_LABEL[format.toUpperCase()] ? format.toUpperCase() : formatByLabel[format.toLowerCase()] || format;
      if (!formatsFor(platform).includes(format))
        errors.push(`${where}: formato "${item.format}" no existe para ${platform} (válidos: ${formatsFor(platform).join(", ")})`);
    }
    const material = toDriveUrl(materialFor(item.material, platform), where, errors);
    return {
      brand_id: brandId,
      date: item.date,
      platform,
      format,
      angle: (item.angle || "").trim(),
      copy: item.copy || "",
      material,
      portada,
      notas: (item.notas || "").trim(),
      estado,
    };
  });
}

async function main() {
  const items = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (!Array.isArray(items) || !items.length) throw new Error("El JSON tiene que ser un array con al menos una pieza.");

  const brands = await sb("/brands?select=id,slug,name");
  const brandIdBySlug = Object.fromEntries(brands.map((b) => [b.slug, b.id]));
  const brandNameById = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const errors = [];
  const rows = items.flatMap((item, i) => expand(item, i, brandIdBySlug, errors)).filter(Boolean);
  if (errors.length) {
    console.error(`${errors.length} error(es) — no se cargó nada:`);
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  const brandIds = [...new Set(rows.map((r) => r.brand_id))];
  const existing = await sb(`/pieces?brand_id=in.(${brandIds.join(",")})&select=id,brand_id,date,platform,angle,estado`);
  const existingByKey = new Map(existing.map((p) => [`${p.brand_id}|${normKey(p.date, p.platform, p.angle)}`, p]));

  const toInsert = [];
  const toUpdate = [];
  const skipped = [];
  for (const row of rows) {
    const match = existingByKey.get(`${row.brand_id}|${normKey(row.date, row.platform, row.angle)}`);
    if (!match) toInsert.push(row);
    else if (match.estado === "publicado") skipped.push(row);
    else {
      const patch = Object.fromEntries(TEXT_FIELDS.filter((f) => row[f]).map((f) => [f, row[f]]));
      toUpdate.push({ id: match.id, row, patch });
    }
  }

  const line = (tag, r, extra = "") =>
    ` ${tag} ${r.date} | ${brandNameById[r.brand_id]} | ${PLATFORM_META[r.platform].label} | ${FORMAT_LABEL[r.format] || r.format} | ${r.angle} | ${STATUS_META[r.estado].label}${extra}`;
  console.log(`Filas: ${rows.length} — nuevas (+): ${toInsert.length}, a actualizar (~): ${toUpdate.length}, ya publicadas, no se tocan (=): ${skipped.length}`);
  toInsert.forEach((r) => console.log(line("+", r, r.material ? "" : " | ⚠ sin material")));
  toUpdate.forEach((u) => console.log(line("~", u.row, ` | cambia: ${Object.keys(u.patch).join(", ")}`)));
  skipped.forEach((r) => console.log(line("=", r)));

  if (dryRun) {
    console.log("--dry-run: no se cargó nada.");
    return;
  }
  if (toInsert.length) await sb("/pieces", { method: "POST", body: JSON.stringify(toInsert) });
  for (const u of toUpdate) await sb(`/pieces?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify(u.patch) });

  console.log(`Listo: ${toInsert.length} insertadas, ${toUpdate.length} actualizadas.`);
  const brandSlugs = [...new Set(items.map((i) => i.brand))];
  console.log(`Ver en el tablero: ${APP_URL}/?brand=${brandSlugs.length === 1 ? brandSlugs[0] : "all"}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
