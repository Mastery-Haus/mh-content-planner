import { redirect } from "next/navigation";
import Tablero from "@/components/tablero/Tablero";
import { ALL_BRANDS_SLUG, toDateInputValue, type Piece } from "@/lib/pieces";
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
  // "Todas las marcas" (Decisión 13): sin filtro de brand_id, mezcla el contenido de
  // todas las marcas. Cualquier otro valor (o ninguno) cae al comportamiento de siempre.
  const isAllBrands = brandSlug === ALL_BRANDS_SLUG;
  const brand = isAllBrands
    ? null
    : (brands.find((b) => b.slug === brandSlug) ?? brands.find((b) => b.slug === DEFAULT_BRAND_SLUG) ?? brands[0]);

  let piecesQuery = supabaseAdmin.from("pieces").select(PIECE_COLUMNS);
  if (brand) piecesQuery = piecesQuery.eq("brand_id", brand.id);
  const { data: pieces, error: piecesError } = await piecesQuery
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (piecesError) {
    throw new Error(`No se pudieron cargar las piezas: ${piecesError.message}`);
  }

  return (
    <Tablero
      brands={brands}
      currentBrandSlug={isAllBrands ? ALL_BRANDS_SLUG : brand!.slug}
      initialPieces={(pieces ?? []) as Piece[]}
      serverToday={toDateInputValue(new Date())}
      logoutAction={logout}
    />
  );
}
