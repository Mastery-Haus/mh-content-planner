import { NextRequest, NextResponse } from "next/server";
import { PIECE_COLUMNS, resolveBrandId, supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/supabase/server";
import { ALL_BRANDS_SLUG, EDITABLE_FIELDS, ESTADOS, PLATFORMS } from "@/lib/pieces";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const brandSlug = request.nextUrl.searchParams.get("brand_slug") ?? undefined;
    let query = supabaseAdmin.from("pieces").select(PIECE_COLUMNS);
    // "Todas las marcas" (Decisión 13): sin filtro de brand_id.
    if (brandSlug !== ALL_BRANDS_SLUG) {
      const brandId = await resolveBrandId(brandSlug);
      query = query.eq("brand_id", brandId);
    }
    const { data, error } = await query.order("date", { ascending: true }).order("created_at", { ascending: true });
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
    const { date, platform, brand_slug, brand_id } = body;
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

    // Duplicar una pieza (Decisión 13) manda brand_id directo — la nueva pieza va a la
    // misma marca que el original, sin pasar por un slug (útil en la vista "todas las
    // marcas", donde no hay una sola marca "actual" de la que inferirlo).
    const brandId = brand_id ? brand_id : await resolveBrandId(brand_slug);
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
