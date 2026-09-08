// Modelo de dominio de las piezas de contenido — portado 1:1 desde el JS de
// mockup.html (PLATFORM_META, FORMAT_LABEL, PLATFORM_FORMATS, STATUS_META, etc).
// Ver CLAUDE.md para el contexto del modelo de datos.

export type Platform =
  | "instagram"
  | "instagram_mh"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "email"
  | "newsletter";

export type Estado = "pendiente" | "produccion" | "listo" | "publicado" | "error";

// Valor especial de "marca" para la vista combinada (Decisión 13) — no es un slug real de
// la tabla brands, así que nunca se manda como brand_slug real a resolveBrandId().
export const ALL_BRANDS_SLUG = "all";

export interface Piece {
  id: string;
  brand_id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  format: string;
  angle: string;
  copy: string;
  material: string;
  portada: string;
  estado: Estado;
  notas: string;
  publicado: string;
  // Fase 5B (GoHighLevel): solo tienen sentido cuando platform === 'email'. `material` se
  // reutiliza ahí como el link del botón CTA — ver DECISIONS.md Decisión 6.
  cta_label: string;
  ghl_template_id: string;
  // Fase 5B (extensión): HTML editado a mano que reemplaza al generado automáticamente
  // desde copy/material/cta_label — vacío significa "sin override, generar automático".
  // Ver DECISIONS.md Decisión 10.
  email_html_override: string;
}

export const PLATFORMS: Platform[] = [
  "instagram",
  "instagram_mh",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "email",
  "newsletter",
];

export const ESTADOS: Estado[] = ["pendiente", "produccion", "listo", "publicado", "error"];

export const PLATFORM_META: Record<Platform, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "i-instagram" },
  instagram_mh: { label: "Instagram MH", icon: "i-instagram" },
  facebook: { label: "Facebook", icon: "i-facebook" },
  linkedin: { label: "LinkedIn", icon: "i-linkedin" },
  youtube: { label: "YouTube", icon: "i-youtube" },
  tiktok: { label: "TikTok", icon: "i-tiktok" },
  email: { label: "Email Marketing", icon: "i-email" },
  newsletter: { label: "Newsletter", icon: "i-newsletter" },
};

export const FORMAT_LABEL: Record<string, string> = {
  REEL: "Reel",
  CARRUSEL: "Carrusel",
  HISTORIAS: "Historias",
  POST: "Post",
  SHORTS: "Shorts",
  LONG_VIDEO: "Video largo",
  CANAL_DIFUSION: "Canal de difusión",
};

export const PLATFORM_FORMATS: Partial<Record<Platform, string[]>> = {
  instagram: ["REEL", "CARRUSEL", "HISTORIAS", "POST", "CANAL_DIFUSION"],
  instagram_mh: ["REEL", "CARRUSEL", "HISTORIAS", "POST", "CANAL_DIFUSION"],
  facebook: ["REEL", "CARRUSEL", "HISTORIAS", "POST"],
  linkedin: ["REEL", "CARRUSEL", "HISTORIAS", "POST"],
  youtube: ["LONG_VIDEO", "SHORTS", "POST"],
  tiktok: ["REEL"],
};

export function formatsFor(platform: Platform): string[] {
  return PLATFORM_FORMATS[platform] || Object.keys(FORMAT_LABEL);
}

export const FREEFORM_META: Partial<Record<Platform, { label: string; placeholder: string }>> = {
  email: { label: "Campaña", placeholder: "Ej: Lanzamiento Full Day agosto" },
  newsletter: { label: "Edición", placeholder: "Ej: #42" },
};

export function usesFreeformFormat(platform: Platform): boolean {
  return Object.prototype.hasOwnProperty.call(FREEFORM_META, platform);
}

export const STATUS_META: Record<Estado, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "pendiente" },
  produccion: { label: "En producción", cls: "produccion" },
  listo: { label: "Listo para salir", cls: "listo" },
  publicado: { label: "Publicado", cls: "publicado" },
  error: { label: "Demorado", cls: "error" },
};

export const WD = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
export const MO_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
export const MO_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateInputValue(d: Date): string {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

export function normalizeUrl(v: string | null | undefined): string | null {
  const trimmed = (v || "").trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return "https://" + trimmed;
  return trimmed;
}

export const EDITABLE_FIELDS = [
  "date",
  "platform",
  "format",
  "angle",
  "copy",
  "material",
  "portada",
  "estado",
  "notas",
  "publicado",
  "cta_label",
  "email_html_override",
] as const;
