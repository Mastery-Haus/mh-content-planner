import { NextRequest, NextResponse } from "next/server";
import { PIECE_COLUMNS, resolveBrandId, supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/supabase/server";
import { EDITABLE_FIELDS, ESTADOS, PLATFORMS } from "@/lib/pieces";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const brandSlug = request.nextUrl.searchParams.get("brand_slug") ?? undefined;
    const brandId = await resolveBrandId(brandSlug);
    const { data, error } = await supabaseAdmin
      .from("pieces")
      .select(PIECE_COLUMNS)
      .eq("brand_id", brandId)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ pieces: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { date, platform, brand_slug } = body;
    if (!date || !platform) {
      return NextResponse.json({ error: "Faltan date/platform" }, { status: 400 });
    }
    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
    }
    if (body.estado && !ESTADOS.includes(body.estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const row: Record<string, unknown> = { date, platform };
    for (const key of EDITABLE_FIELDS) {
      if (key === "date" || key === "platform") continue;
      if (key in body) row[key] = body[key];
    }

    const brandId = await resolveBrandId(brand_slug);
    const { data, error } = await supabaseAdmin
      .from("pieces")
      .insert({ brand_id: brandId, ...row })
      .select(PIECE_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ piece: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
