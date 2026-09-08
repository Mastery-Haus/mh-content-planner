// Importa un CSV exportado con el botón "Exportar CSV" del mockup/Artifact (mismo header
// que genera buildCsv() en mockup.html: Fecha,Plataforma,Formato,Ángulo,Copy,Material,
// Portada,Estado,Notas,Link publicado) a la tabla `pieces` real, para una marca dada.
//
// Uso: node --env-file=.env.local scripts/import-csv.mjs <archivo.csv> <brand-slug>
// Ej:  node --env-file=.env.local scripts/import-csv.mjs tablero-contenidos.csv sofia-contreras
//
// Las etiquetas en español (plataforma/formato/estado) se revierten a los códigos internos
// usando PLATFORM_META/FORMAT_LABEL/STATUS_META de src/lib/pieces.ts — misma fuente de
// verdad que usa la app, para no duplicar el mapeo a mano.
//
// Idempotente por defecto (Decisión 14): antes de insertar, trae las piezas ya cargadas
// para esa marca y salta cualquier fila del CSV que coincida en fecha+plataforma+ángulo
// (normalizando espacios) — así correr este script de nuevo sobre un export más nuevo del
// mismo Artifact (que sigue teniendo todo el contenido viejo) solo agrega lo genuinamente
// nuevo, sin duplicar lo que ya está.

import { readFileSync } from "node:fs";
import { PLATFORM_META, FORMAT_LABEL, STATUS_META } from "../src/lib/pieces.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [csvPath, brandSlug] = args.filter((a) => a !== "--dry-run");
if (!csvPath || !brandSlug) {
  console.error("Uso: node --env-file=.env.local scripts/import-csv.mjs <archivo.csv> <brand-slug> [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

// Parser CSV mínimo (RFC4180): comillas dobles para escapar campos con comas/comillas/saltos
// de línea, "" para una comilla literal dentro de un campo entrecomillado.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignorado, \n lo maneja el else if de abajo
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normKey(date, platform, angle) {
  return `${date}|${platform}|${(angle || "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function invert(labelMap) {
  const out = {};
  for (const [key, meta] of Object.entries(labelMap)) {
    const label = typeof meta === "string" ? meta : meta.label;
    out[label] = key;
  }
  return out;
}

const platformByLabel = invert(
  Object.fromEntries(Object.entries(PLATFORM_META).map(([k, v]) => [k, v.label]))
);
const statusByLabel = invert(Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label])));
const formatByLabel = invert(FORMAT_LABEL);

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

async function main() {
  const raw = readFileSync(csvPath, "utf8").replace(/^﻿/, ""); // sacar el BOM
  const rows = parseCsv(raw).filter((r) => r.length > 1 || r[0] !== "");
  const header = rows[0];
  const expected = ["Fecha", "Plataforma", "Formato", "Ángulo", "Copy", "Material", "Portada", "Estado", "Notas", "Link publicado"];
  if (header.join("|") !== expected.join("|")) {
    console.error("El header del CSV no coincide con el esperado.");
    console.error("Esperado:", expected.join(","));
    console.error("Encontrado:", header.join(","));
    process.exit(1);
  }
  const dataRows = rows.slice(1);

  const brands = await sb(`/brands?slug=eq.${brandSlug}&select=id`);
  if (!brands.length) throw new Error(`No se encontró la marca "${brandSlug}"`);
  const brandId = brands[0].id;

  const existingRows = await sb(`/pieces?brand_id=eq.${brandId}&select=date,platform,angle`);
  const existingKeys = new Set(existingRows.map((p) => normKey(p.date, p.platform, p.angle)));

  const pieces = [];
  const skipped = [];
  const errors = [];
  dataRows.forEach((cols, i) => {
    const [fecha, plataformaLabel, formatoLabel, angulo, copy, material, portada, estadoLabel, notas, publicado] = cols;
    const platform = platformByLabel[plataformaLabel];
    const estado = statusByLabel[estadoLabel];
    if (!platform) {
      errors.push(`Fila ${i + 2}: plataforma desconocida "${plataformaLabel}"`);
      return;
    }
    if (!estado) {
      errors.push(`Fila ${i + 2}: estado desconocido "${estadoLabel}"`);
      return;
    }
    const angleTrimmed = (angulo || "").trim();
    if (existingKeys.has(normKey(fecha, platform, angleTrimmed))) {
      skipped.push(`${fecha} | ${plataformaLabel} | ${angleTrimmed}`);
      return;
    }

    // Formato: si la etiqueta matchea un formato fijo conocido, se revierte al código
    // interno; si no (campos libres, ej. campañas de Email Marketing), se deja tal cual.
    const format = formatByLabel[formatoLabel] ?? (formatoLabel || "").trim();
    pieces.push({
      brand_id: brandId,
      date: fecha,
      platform,
      format,
      angle: angleTrimmed,
      copy: copy || "",
      material: (material || "").trim(),
      portada: (portada || "").trim(),
      estado,
      notas: (notas || "").trim(),
      publicado: (publicado || "").trim(),
    });
  });

  if (errors.length) {
    console.error(`${errors.length} fila(s) con datos que no se pudieron mapear — no se importó nada:`);
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  console.log(`Filas del CSV: ${dataRows.length}. Ya existentes (salteadas): ${skipped.length}. Nuevas a insertar: ${pieces.length}.`);
  if (pieces.length === 0) {
    console.log("Nada nuevo para importar.");
    return;
  }
  if (dryRun) {
    console.log("--dry-run: no se insertó nada. Piezas nuevas que se insertarían:");
    console.log(JSON.stringify(pieces, null, 2));
    return;
  }
  const inserted = await sb("/pieces", { method: "POST", body: JSON.stringify(pieces) });
  console.log(`Insertadas: ${inserted.length} piezas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
