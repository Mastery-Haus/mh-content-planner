// Arma el HTML final que se manda a GoHighLevel para las piezas de plataforma 'email'.
// Ver DECISIONS.md Decisión 6 para el contexto de esta integración.
//
// Convención de redacción: el copy de la pieza ya incluye el saludo ({{contact.first_name}},)
// y el cierre/firma/PD como texto normal — el wrapper NO los agrega. Lo único que el wrapper
// inserta que no viene del copy es el botón CTA, en el punto donde el copy tenga una línea
// que diga `{{cta}}` (case-insensitive: `{{CTA}}` también matchea; si no hay ninguna, el
// botón va al final).
//
// El copy puede traer markdown inline (negrita **así**/__así__, itálica *así*/_así_, links
// [texto](url)) — se convierte a HTML real (ver Decisión 9 en DECISIONS.md). No se soporta
// markdown de bloque (encabezados, listas, citas): cada línea sigue siendo un párrafo propio.

const DEFAULT_CTA_COLOR = "#DEA52C";

const FOOTER_HTML = `
        <tr>
          <td align="center" style="padding: 24px 24px 32px 24px; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-top: 1px solid #e0e0e0; padding-top: 24px; text-align: center;">
                  <p style="margin: 0 0 4px 0; font-size: 13px; color: #888888; font-family: Arial, sans-serif; line-height: 1.6;">Sofía Contreras · Mastery Haus</p>
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: #aaaaaa; font-family: Arial, sans-serif; line-height: 1.6;">TEMPUS ROCKET LLC · 1209 Mountain Road Place NE, Albuquerque, NM, USA</p>
                  <p style="margin: 0; font-size: 11px; color: #aaaaaa; font-family: Arial, sans-serif; line-height: 2;">
                    <a href="https://masteryhaus.com/aviso-legal" target="_blank" style="color: #aaaaaa; text-decoration: underline;">Aviso legal</a>
                    &nbsp;·&nbsp;
                    <a href="https://masteryhaus.com/politica-de-privacidad" target="_blank" style="color: #aaaaaa; text-decoration: underline;">Privacidad</a>
                    &nbsp;·&nbsp;
                    <a href="{{email.unsubscribe_link}}" target="_blank" style="color: #aaaaaa; text-decoration: underline;">Cancelar suscripción</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// El copy de las piezas de email puede venir de un .md real (negrita, itálica, links) —
// ver Decisión 9 en DECISIONS.md. Convertimos solo ese subconjunto inline de markdown, no
// bloques (encabezados/listas/citas): el modelo de párrafo de este wrapper es "una línea =
// un párrafo" (ver linesToParagraphs), no el de CommonMark, así que no tiene sentido meter
// un parser de markdown completo acá. Escapamos primero — los caracteres de sintaxis
// markdown (*, _, [, ], (, )) no son especiales para HTML, así que sobreviven el escape
// intactos y son seguros de matchear después.
function renderInlineMarkdown(line: string): string {
  const escaped = escapeHtml(line);
  return escaped
    .replace(
      /\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_m, text: string, url: string) => `<a href="${url}" target="_blank" style="color: inherit;">${text}</a>`
    )
    .replace(/\*\*([^\n*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^\n_]+?)__/g, "<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g, "<em>$1</em>")
    .replace(/_([^\n_]+?)_/g, "<em>$1</em>");
}

// Contraparte de renderInlineMarkdown para texto plano (el preheader oculto): saca la
// sintaxis markdown en vez de convertirla a HTML, porque ahí no se renderiza HTML.
function stripMarkdownSyntax(line: string): string {
  return line
    .replace(/\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/\*\*([^\n*]+?)\*\*/g, "$1")
    .replace(/__([^\n_]+?)__/g, "$1")
    .replace(/\*([^\n*]+?)\*/g, "$1")
    .replace(/_([^\n_]+?)_/g, "$1");
}

// Cada línea no vacía se envuelve en su propio <p> — cubre tanto párrafos sueltos como
// listas tipo "· algo" línea por línea, que es como vienen redactados los mails de origen.
function linesToParagraphs(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p style="margin: 0 0 20px 0;">${renderInlineMarkdown(line)}</p>`)
    .join("\n");
}

function buildCtaButtonHtml(ctaUrl: string, ctaLabel: string, color: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px 0;">
              <tr>
                <td align="center">
                  <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${color}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                    <span style="color: #ffffff; text-decoration: none;">${escapeHtml(ctaLabel)}</span>
                  </a>
                </td>
              </tr>
            </table>`;
}

export interface BuildEmailHtmlParams {
  bodyText: string;
  ctaUrl: string;
  ctaLabel: string;
  ctaColor?: string;
}

export function buildEmailHtml({ bodyText, ctaUrl, ctaLabel, ctaColor }: BuildEmailHtmlParams): string {
  const hasCta = !!(ctaUrl.trim() && ctaLabel.trim());
  const ctaHtml = hasCta ? buildCtaButtonHtml(ctaUrl.trim(), ctaLabel.trim(), ctaColor || DEFAULT_CTA_COLOR) : "";

  const markerIdx = bodyText.split("\n").findIndex((l) => l.trim().toLowerCase() === "{{cta}}");
  let bodyHtml: string;
  if (markerIdx === -1) {
    // Sin marcador: el copy entero como párrafos, botón (si hay) al final.
    bodyHtml = linesToParagraphs(bodyText) + (ctaHtml ? "\n" + ctaHtml : "");
  } else {
    const lines = bodyText.split("\n");
    const before = lines.slice(0, markerIdx).join("\n");
    const after = lines.slice(markerIdx + 1).join("\n");
    bodyHtml = [linesToParagraphs(before), ctaHtml, linesToParagraphs(after)].filter(Boolean).join("\n");
  }

  const preheaderSource = bodyText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && l.toLowerCase() !== "{{cta}}");
  const preheader = escapeHtml(stripMarkdownSyntax(preheaderSource || "").slice(0, 150));

  return `<div lang="es"></div>
<meta charset="UTF-8" />

<!-- PREHEADER -->
<div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${preheader}</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px;">
        <tr>
          <td align="left" style="padding: 40px 24px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.75; color: #222222;">
${bodyHtml}
          </td>
        </tr>${FOOTER_HTML}
      </table>
    </td>
  </tr>
</table>`;
}
