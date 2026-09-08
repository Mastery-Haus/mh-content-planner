// Cliente mínimo de la API de GoHighLevel (LeadConnector) — server-only. Ver DECISIONS.md
// Decisión 6.
//
// IMPORTANTE, confirmado probando contra una cuenta real (no solo docs ni código de
// referencia): POST /emails/builder crea la plantilla pero IGNORA el campo `html` — el
// contenido queda con el placeholder default de GHL ("Welcome to email"). Hace falta un
// segundo POST a /emails/builder/data con el templateId para que el HTML real quede
// guardado. Por eso createGhlEmailTemplate encadena ambos pasos.

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

function ghlHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function requireGhlEnv(): { apiKey: string; locationId: string } {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    throw new Error("Faltan GHL_API_KEY o GHL_LOCATION_ID en el entorno.");
  }
  return { apiKey, locationId };
}

async function parseGhlResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // deja data como {} — el texto crudo va en el mensaje de error si res no fue ok
  }
  if (!res.ok) {
    throw new Error(`GoHighLevel respondió ${res.status}: ${text.slice(0, 500)}`);
  }
  return data as Record<string, unknown>;
}

// Crea una plantilla nueva SOLO si `existingTemplateId` no viene (piezas nuevas, sin
// ghl_template_id todavía). Si ya existe, actualiza esa misma plantilla en vez de crear
// otra — antes esto siempre creaba una plantilla nueva en cada click de "Crear plantilla",
// dejando plantillas huérfanas duplicadas en GHL. Ver DECISIONS.md Decisión 6.
export async function upsertGhlEmailTemplate({
  existingTemplateId,
  title,
  html,
}: {
  existingTemplateId?: string | null;
  title: string;
  html: string;
}): Promise<{ templateId: string }> {
  const { apiKey, locationId } = requireGhlEnv();

  let templateId = existingTemplateId || undefined;
  if (!templateId) {
    const createRes = await fetch(`${GHL_BASE_URL}/emails/builder`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify({ locationId, type: "html", title }),
    });
    const created = await parseGhlResponse(createRes);
    templateId =
      (created.id as string | undefined) ??
      (created.templateId as string | undefined) ??
      ((created.template as Record<string, unknown> | undefined)?.id as string | undefined);
    if (!templateId) {
      throw new Error(`GoHighLevel no devolvió un id de plantilla reconocible al crearla: ${JSON.stringify(created).slice(0, 500)}`);
    }
  }

  // Acá se guarda (o actualiza) el HTML real — ver nota arriba sobre por qué hace falta este paso.
  const updateRes = await fetch(`${GHL_BASE_URL}/emails/builder/data`, {
    method: "POST",
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({ locationId, templateId, html, editorType: "html", updatedBy: "Tablero de Salida (auto)" }),
  });
  await parseGhlResponse(updateRes);

  return { templateId };
}
