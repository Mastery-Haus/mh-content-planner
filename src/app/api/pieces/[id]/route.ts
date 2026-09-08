import { NextRequest, NextResponse } from "next/server";
import { PIECE_COLUMNS, supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/supabase/server";
import { EDITABLE_FIELDS, ESTADOS, PLATFORMS } from "@/lib/pieces";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key];
  }
  if (patch.platform && !PLATFORMS.includes(patch.platform as (typeof PLATFORMS)[number])) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  }
  if (patch.estado && !ESTADOS.includes(patch.estado as (typeof ESTADOS)[number])) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("pieces")
    .update(patch)
    .eq("id", id)
    .select(PIECE_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ piece: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("pieces").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
