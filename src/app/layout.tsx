import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tablero de Salida",
  description: "Planificador de contenidos de Mastery Haus",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning: extensiones de navegador (ColorZilla, Grammarly, etc.)
          inyectan atributos en <body> antes de que React hidrate (p.ej. cz-shortcut-listen).
          No es un mismatch real de nuestro código — Next.js recomienda esto puntualmente
          para <html>/<body> en vez de andar ignorando warnings de hidratación en general. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
