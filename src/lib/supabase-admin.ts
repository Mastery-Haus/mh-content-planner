// Cliente de Supabase con la service role key — server-only (nunca importar desde
// un Client Component). Bypassa RLS a propósito: en esta fase no hay sesión de
// usuario (Fase 3 la agrega), así que las API routes son las que autorizan el acceso.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Fase 2: una sola marca hardcodeada. Fase 3 reemplaza esto por el selector de marca real.
export const DEFAULT_BRAND_SLUG = "mastery-haus";

export async function resolveBrandId(slug: string = DEFAULT_BRAND_SLUG): Promise<string> {
  const { data, error } = await supabaseAdmin.from("brands").select("id").eq("slug", slug).single();
  if (error || !data) {
    throw new Error(`No se encontró la marca "${slug}"${error ? `: ${error.message}` : ""}`);
  }
  return data.id;
}

export const PIECE_COLUMNS =
  "id, date, platform, format, angle, copy, material, portada, estado, notas, publicado, cta_label, ghl_template_id, email_html_override";
