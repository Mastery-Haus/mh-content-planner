// Cliente de Supabase con la sesión del usuario (anon key + cookies) — para Server
// Components, Server Actions y Route Handlers. No reemplaza a `supabaseAdmin`
// (service role): éste sigue siendo el que hace las queries reales contra `pieces`;
// este cliente solo se usa para leer/gestionar la sesión de auth (login, logout,
// requireUser).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.");
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Se llamó desde un Server Component, donde no se pueden escribir cookies.
          // Se puede ignorar: `src/proxy.ts` refresca la sesión en cada request igual.
        }
      },
    },
  });
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
