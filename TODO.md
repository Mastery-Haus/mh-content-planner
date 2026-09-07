# Plan por fases y estado actual

Ver [CLAUDE.md](CLAUDE.md) para el contexto general y [DECISIONS.md](DECISIONS.md) para el porqué de cada decisión.

Convención: `[ ]` pendiente, `[~]` en curso, `[x]` hecho.

---

## Fase 0 — Setup del proyecto
- [x] Inicializar repo git y hacer el primer commit (incluyendo `mockup.html`, `CLAUDE.md`, `DECISIONS.md`, `TODO.md`).
- [x] Scaffold de Next.js 16 (App Router, TypeScript, sin Tailwind) + cliente de Supabase instalado (`@supabase/supabase-js`, `@supabase/ssr`).
- [x] Crear proyecto en Supabase (Postgres + Auth + Storage). Credenciales cargadas en `.env.local` y verificadas (URL + anon key + service role key responden correctamente contra el proyecto real).
- [x] Variables de entorno completas en `.env.local` (Supabase listo; `META_APP_ID`/`META_APP_SECRET` ya cargados también; `META_ACCESS_TOKEN` queda vacío hasta Fase 5 a propósito).
- [x] Conectar el repo a Vercel: login hecho por la usuaria (`npx vercel login`), proyecto enlazado (`vercel link`) como `mastery-haus-projects/mh-content-planner`.
- [ ] Cargar las variables de entorno (Supabase + Meta) en Vercel (Production/Preview/Development). El intento de hacerlo vía `vercel env add` automáticamente fue bloqueado por el modo auto de Claude Code (acción sensible sobre servicio externo) — pendiente hacerlo a mano desde el dashboard de Vercel (Settings → Environment Variables) o re-autorizar el comando explícitamente.

## Fase 1 — Modelo de datos ✅
- [x] Diseñar esquema: `brands` (Mastery Haus, Sofia Contreras), `pieces` (con `brand_id` FK). `users` se maneja vía Supabase Auth nativo (`auth.users`), sin tabla propia — no hace falta con auth simple sin roles (Decisión 4).
- [x] Migrar el modelo de `pieces` visto en el JSON embebido de `mockup.html` (date, platform, format, angle, copy, material, portada, estado, notas, publicado) a columnas de la tabla. Migración en `supabase/migrations/0001_init.sql`, aplicada al proyecto real vía SQL Editor.
- [x] Script de seed (`scripts/seed.mjs`, `npm run seed`) que extrae las piezas del JSON embebido en `mockup.html` y las migra a la tabla `pieces` real, scoped a la marca Mastery Haus. Corrido y verificado: 36 piezas migradas correctamente (12 Instagram, 10 LinkedIn, 8 Facebook, 6 YouTube). Es idempotente — si ya hay datos para la marca, no vuelve a insertar.
- [x] Constraints de `platform` y `estado` como CHECK (no enum de Postgres, para poder agregar valores con un ALTER TABLE simple en vez de ALTER TYPE). `format` queda como texto libre validado a nivel app (depende de la plataforma, según `PLATFORM_FORMATS` del mockup).
- [x] RLS habilitado en ambas tablas: cualquier usuario autenticado puede leer marcas y gestionar piezas (sin scope por marca todavía — se ajusta si hace falta en Fase 3).

## Fase 2 — UI replicada (sin auth ni publicación real todavía) ✅
- [x] Portar el CSS del mockup literal (custom properties, paleta de estados, dark mode automático) al sistema de estilos de Next.js. `src/app/globals.css`, calcado 1:1.
- [x] Vista Agenda: day cards colapsables con resumen por plataforma, barra de estados, detalle de pieza expandible. `src/components/tablero/AgendaView.tsx` + `PieceItem.tsx`.
- [x] Vista Lista: tabla con las mismas columnas del mockup. `src/components/tablero/ListaView.tsx`.
- [x] Stats strip (conteo por estado), navegación de mes, toggle Agenda/Lista. `StatsStrip.tsx` + estado en `Tablero.tsx`.
- [x] Modal "Nueva pieza" y FAB de agregar. `NewPieceModal.tsx`.
- [x] Exportar CSV — vía Blob + link de descarga del navegador (reemplaza `window.claude.use('downloads')` del mockup, que no existe fuera de Artifacts).
- [x] Los datos vienen de la DB real vía API routes de Next.js (`src/app/api/pieces/`), todavía sin login (acceso directo para desarrollo, marca hardcodeada a `mastery-haus`).
- [x] Decisión de UX (confirmada con la usuaria): autosave con debounce (~600ms) por campo en vez del "Guardar manual" del mockup — ver DECISIONS.md 2026-09-07. Esto ya resuelve gran parte de los puntos de Fase 4 (CRUD real + indicador de guardado real).
- [x] Verificado en navegador (Playwright headless): vista Agenda y Lista con datos reales, autosave con PATCH real confirmado (200 + cambio de estado pendiente→guardando→guardado), dark mode automático, modal "Nueva pieza". Sin errores de consola.
- Pendiente menor, no bloqueante: el botón "Guardar" del header ahora sirve para forzar el flush de cambios pendientes (siempre debería estar todo autoguardado); se quitó el botón "Guardar" individual de cada pieza del mockup por quedar redundante con el autosave.
- [x] Filtros en la vista Lista por fecha (rango desde/hasta), plataforma y estado (chips multi-select, colores de estado reutilizados). El rango de fechas de Lista es independiente del navegador de mes — las flechas de mes siguen controlando solo Agenda. `ListaView.tsx` recibe el dataset completo de la marca en vez del acotado al mes.
- [x] Iteración de UX sobre los filtros (pedido de la usuaria tras ver el primer intento): colapsados por defecto detrás de un botón "Filtrar" (con puntito indicador si hay filtros activos) en vez de siempre visibles — evita el peso visual de 3 filas de controles permanentes. El stats-strip ahora refleja lo que Lista efectivamente muestra (todo, o el subconjunto filtrado) en vez de quedarse pegado al mes de Agenda, que daba contadores en 0 mientras la tabla de abajo tenía datos — ya no hay esa desconexión. Estado y cálculo de filtros viven en `Tablero.tsx` (father-owns-state), `ListaView.tsx` quedó presentacional. No se agregó una vista/tab nueva de "Filtros" — se descartó por fragmentar la navegación sin necesidad, ya que filtros y Lista siempre se usan juntos.

## Fase 3 — Autenticación y multi-marca
**Pospuesta a pedido de la usuaria (2026-09-07)**: prefiere seguir probando la app en el navegador sin tener que loguearse cada vez mientras se sigue iterando sobre la UI/funcionalidad. No arrancar esta fase hasta que ella lo pida explícitamente.
- [ ] Login con email + password (Supabase Auth).
- [ ] Selector de marca en el header (reemplaza el `kicker` fijo "Mastery Haus"), scoping de todas las queries por `brand_id`.
- [ ] Alta de usuarios/colaboradores.

## Fase 4 — Persistencia real (reemplazo del mecanismo de autopublish del mockup) ✅
- [x] CRUD completo de piezas contra la DB (crear, editar, duplicar, borrar) vía API routes — resuelto en Fase 2 junto con la decisión de autosave.
- [x] Indicador de estado de guardado (`save-status`) conectado a las llamadas de red reales (pendiente/guardando/guardado/error), no a un `docVersion` en memoria — resuelto en Fase 2.
- [x] Manejo de errores de guardado (estado `error` visible si falla la escritura), con **retry automático con backoff exponencial** (1.5s, 3s, 6s, 12s, 15s tope — 5 intentos) sin que el usuario tenga que intervenir. Mensaje `save-status` muestra "reintentando (n/5)…" durante los reintentos; si se agotan, pide guardar a mano. Un edit nuevo o un clic en "Guardar" reinicia el contador de intentos. Implementado y probado en `Tablero.tsx` (`flushPiece`/`queuePatch`/`flushAll`) interceptando requests con Playwright para forzar fallas — reintenta y se recupera correctamente.

## Fase 5 — Publicación real a Meta (bloqueada parcialmente — ver pendiente de la usuaria)
- [ ] **Bloqueante — acción de la usuaria**: obtener token de acceso permanente desde Business Settings de Meta (System User token o Page Access Token de larga duración).
- [ ] Resolver el problema de medios: los links de Google Drive de `material`/`portada` no sirven directo para la Graph API — evaluar subida a Supabase Storage u otro paso intermedio (ver Decisión 5 en DECISIONS.md).
- [ ] Integrar Graph API para publicar en Instagram (Reels, Carrusel, Post) y Facebook (Reels, Carrusel, Post) desde la app.
- [ ] Al publicar con éxito, completar automáticamente el campo `publicado` con el link real y pasar `estado` a `publicado`.
- [ ] Manejo de fallos de publicación (marcar como `error` con detalle del motivo).

## Fase 6 — Pulido y salida a producción
- [ ] QA visual comparando contra `mockup.html` (pixel a pixel, ambos temas claro/oscuro).
- [ ] Probar el flujo completo con datos reales de ambas marcas.
- [ ] Deploy final a producción en Vercel.
- [ ] Documentar en `CLAUDE.md` cualquier desvío del plan original.

---

## Estado actual (última sesión: 2026-09-07)

Fases 0 (salvo la carga de env vars en Vercel), 1, 2 y 4 completas. La UI del Tablero de Salida está portada 1:1 (Agenda, Lista rediseñada con columnas compactas, stats, modal, FAB, CSV) y leyendo/escribiendo la tabla `pieces` real de Supabase vía API routes de Next.js, con autosave por campo + retry automático con backoff si falla el guardado. Sin auth todavía (acceso directo, marca hardcodeada a Mastery Haus).

Bug real encontrado y arreglado esta sesión: hydration mismatch por usar `new Date()` directo durante el render en `Tablero`/`AgendaView` (SSR vs. cliente pueden diferir de zona horaria en producción). Se resolvió con `useSyncExternalStore` (snapshot de servidor vía prop `serverToday` desde `page.tsx`, corregido al del cliente real post-hidratación) — verificado forzando un reloj de cliente en otro mes que el servidor, sin warning y con el mes correcto.

Pendiente de Fase 0: cargar las env vars (Supabase + Meta) en Vercel — bloqueado por el modo auto de Claude Code, pendiente hacerlo a mano desde el dashboard.

Filtros de Lista (fecha/plataforma/estado) implementados y verificados.

**Próximo paso al retomar**: la Fase 3 (login) sigue pospuesta a pedido de la usuaria. Opciones abiertas: más pulido de UI, o Fase 5 en cuanto la usuaria consiga el token de Meta.
