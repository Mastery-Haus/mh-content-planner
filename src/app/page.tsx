import Tablero from "@/components/tablero/Tablero";
import { toDateInputValue, type Piece } from "@/lib/pieces";
import { DEFAULT_BRAND_SLUG, PIECE_COLUMNS, supabaseAdmin } from "@/lib/supabase-admin";

export default async function Home() {
  const { data: brand, error: brandError } = await supabaseAdmin
    .from("brands")
    .select("id, name")
    .eq("slug", DEFAULT_BRAND_SLUG)
    .single();

  if (brandError || !brand) {
    throw new Error(`No se encontró la marca "${DEFAULT_BRAND_SLUG}": ${brandError?.message ?? "sin datos"}`);
  }

  const { data: pieces, error: piecesError } = await supabaseAdmin
    .from("pieces")
    .select(PIECE_COLUMNS)
    .eq("brand_id", brand.id)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (piecesError) {
    throw new Error(`No se pudieron cargar las piezas: ${piecesError.message}`);
  }

  return (
    <Tablero
      brandName={brand.name}
      initialPieces={(pieces ?? []) as Piece[]}
      serverToday={toDateInputValue(new Date())}
    />
  );
}
