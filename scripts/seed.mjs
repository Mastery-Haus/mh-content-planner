// Migra las piezas de contenido embebidas en mockup.html (marca Mastery Haus)
// a la tabla real `pieces` de Supabase. Corre una sola vez, después de aplicar
// supabase/migrations/0001_init.sql.
//
// Uso: node --env-file=.env.local scripts/seed.mjs

import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRAND_SLUG = 'mastery-haus';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  console.error('Corré con: node --env-file=.env.local scripts/seed.mjs');
  process.exit(1);
}

function extractPieces(html) {
  const match = html.match(/<script id="seed-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No se encontró el bloque seed-data en mockup.html');
  const data = JSON.parse(match[1]);
  if (!Array.isArray(data.pieces)) throw new Error('seed-data no tiene un array "pieces"');
  return data.pieces;
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase REST error ${res.status} en ${path}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const html = readFileSync(new URL('../mockup.html', import.meta.url), 'utf8');
  const pieces = extractPieces(html);
  console.log(`Encontradas ${pieces.length} piezas en mockup.html.`);

  const brands = await sb(`/brands?slug=eq.${BRAND_SLUG}&select=id`);
  if (!brands.length) {
    throw new Error(`No existe la marca "${BRAND_SLUG}" — ¿corriste la migración 0001_init.sql?`);
  }
  const brandId = brands[0].id;

  const existing = await sb(`/pieces?brand_id=eq.${brandId}&select=id&limit=1`);
  if (existing.length) {
    console.log('La tabla pieces ya tiene datos para Mastery Haus — no se vuelve a sembrar (evita duplicados).');
    return;
  }

  const rows = pieces.map((p) => ({
    brand_id: brandId,
    date: p.date,
    platform: p.platform,
    format: p.format || '',
    angle: p.angle || '',
    copy: p.copy || '',
    material: p.material || '',
    portada: p.portada || '',
    estado: p.estado || 'pendiente',
    notas: p.notas || '',
    publicado: p.publicado || '',
  }));

  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await sb('/pieces', { method: 'POST', body: JSON.stringify(chunk) });
    inserted += chunk.length;
    console.log(`Insertadas ${inserted}/${rows.length}...`);
  }

  console.log(`Listo: ${inserted} piezas migradas a la marca "${BRAND_SLUG}".`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
