import { NextRequest, NextResponse } from "next/server";
import { PIECE_COLUMNS, supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/supabase/server";
import { buildEmailHtml } from "@/lib/email-template";
import { upsertGhlEmailTemplate } from "@/lib/ghl";
import type { Piece } from "@/lib/pieces";

type Params = { params: Promise<{ id: string }> };

// Crea (o re-crea) la plantilla de email en GoHighLevel para una pieza de plataforma
// 'email', a partir de su copy + CTA (material = link del botón, cta_label = texto del
// botón). Ver DECISIONS.md Decisión 6.
export async function POST(_request: NextRequest, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: piece, error: fetchError } = await supabaseAdmin
    .from("pieces")
    .select(PIECE_COLUMNS)
    .eq("id", id)
    .single<Piece>();

  if (fetchError || !piece) {
    return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  }
  if (piece.platform !== "email") {
    return NextResponse.json({ error: "Esta pieza no es de plataforma Email Marketing" }, { status: 400 });
  }
  if (!piece.copy.trim()) {
    return NextResponse.json({ error: "La pieza no tiene copy cargado" }, { status: 400 });
  }

  try {
    // Si la usuaria editó el HTML a mano (Decisión 10), ese HTML manda tal cual — no se
    // regenera desde copy/material/cta_label.
    const html = piece.email_html_override.trim()
      ? piece.email_html_override
      : buildEmailHtml({
          bodyText: piece.copy,
          ctaUrl: piece.material,
          ctaLabel: piece.cta_label,
        });

    const { templateId } = await upsertGhlEmailTemplate({
      existingTemplateId: piece.ghl_template_id,
      title: piece.angle || "Sin asunto",
      html,
    });

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("pieces")
      .update({ ghl_template_id: templateId })
      .eq("id", id)
      .select(PIECE_COLUMNS)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ piece: updated, templateId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
