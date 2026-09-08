import { redirect } from "next/navigation";
import Tablero from "@/components/tablero/Tablero";
import { toDateInputValue, type Piece } from "@/lib/pieces";
import { DEFAULT_BRAND_SLUG, PIECE_COLUMNS, supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { data: brands, error: brandsError } = await supabaseAdmin
    .from("brands")
    .select("id, slug, name")
    .order("name", { ascending: true });

  if (brandsError || !brands || brands.length === 0) {
    throw new Error(`No se pudieron cargar las marcas: ${brandsError?.message ?? "sin datos"}`);
  }

  const requestedSlug = (await searchParams)?.brand;
  const brandSlug = typeof requestedSlug === "string" ? requestedSlug : undefined;
  const brand = brands.find((b) => b.slug === brandSlug) ?? brands.find((b) => b.slug === DEFAULT_BRAND_SLUG) ?? brands[0];

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
      brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
      currentBrandSlug={brand.slug}
      initialPieces={(pieces ?? []) as Piece[]}
      serverToday={toDateInputValue(new Date())}
      logoutAction={logout}
    />
  );
}
