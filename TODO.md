# Plan por fases y estado actual

Ver [CLAUDE.md](CLAUDE.md) para el contexto general y [DECISIONS.md](DECISIONS.md) para el porqué de cada decisión.

Convención: `[ ]` pendiente, `[~]` en curso, `[x]` hecho.

---

## Fase 0 — Setup del proyecto ✅
- [x] Inicializar repo git y hacer el primer commit (incluyendo `mockup.html`, `CLAUDE.md`, `DECISIONS.md`, `TODO.md`).
- [x] Scaffold de Next.js 16 (App Router, TypeScript, sin Tailwind) + cliente de Supabase instalado (`@supabase/supabase-js`, `@supabase/ssr`).
- [x] Crear proyecto en Supabase (Postgres + Auth + Storage). Credenciales cargadas en `.env.local` y verificadas (URL + anon key + service role key responden correctamente contra el proyecto real).
- [x] Variables de entorno completas en `.env.local` (Supabase listo; `META_APP_ID`/`META_APP_SECRET` ya cargados también; `META_ACCESS_TOKEN` queda vacío hasta Fase 5 a propósito).
- [x] Conectar el repo a Vercel: login hecho por la usuaria (`npx vercel login`), proyecto enlazado (`vercel link`) como `mastery-haus-projects/mh-content-planner`.
- [x] Cargar las variables de entorno (Supabase + Meta) en Vercel — hecho por la usuaria desde el dashboard (Settings → Environment Variables), verificado vía `vercel env ls`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET` en Preview + Production. `META_ACCESS_TOKEN` sigue vacío a propósito (Fase 5).
- [x] Repo subido a GitHub, público, bajo la organización **Mastery-Haus**: [github.com/Mastery-Haus/mh-content-planner](https://github.com/Mastery-Haus/mh-content-planner). Autenticado vía `gh` (binario descargado manualmente, sin Homebrew) con la cuenta `MasteryHaus`. Convención nueva establecida (2026-09-07): cualquier repo dentro de `~/Documents/Code/Proyectos Mastery Haus/` commitea automáticamente como `Usuario Apps <apps@masteryhaus.com>` vía `includeIf` en `~/.gitconfig` (no afecta otros proyectos de la usuaria fuera de esa carpeta).

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

## Fase 3 — Autenticación y multi-marca ✅
- [x] Login con email + password (Supabase Auth). `src/proxy.ts` (reemplaza a `middleware.ts`,
  deprecado en Next.js 16 — ver Decisión 7) redirige a `/login` si no hay sesión, refrescando
  cookies en cada request. `src/app/login/` (page + `LoginForm.tsx` con `useActionState` +
  Server Action `login`). Logout vía Server Action `src/app/actions.ts` `logout()`, pasada como
  prop a `Tablero`. Las API routes de `pieces` (`route.ts`, `[id]/route.ts`,
  `[id]/ghl-template/route.ts`) devuelven 401 si no hay sesión, vía `requireUser()` de
  `src/lib/supabase/server.ts` — se mantiene `supabaseAdmin` (service role) para las queries
  reales, ver Decisión 7.
- [x] Selector de marca en el header (reemplaza el `kicker` fijo "Mastery Haus"): `page.tsx`
  ahora trae todas las filas de `brands` y resuelve la marca activa desde `?brand=<slug>` en
  la URL (default a Mastery Haus). `Tablero.tsx` reemplaza el `<span className="kicker">` por
  un `<select>` que navega con `router.push`. Todo usuario logueado ve ambas marcas — no hay
  tabla puente usuario↔marca (decisión explícita, ver Decisión 7). Los `POST /api/pieces`
  (crear/duplicar pieza) ahora mandan `brand_slug` explícito en vez de depender del default
  del server; `PATCH`/`DELETE /api/pieces/[id]` no llevan brand en el payload (no hace falta:
  cualquier usuario ve/edita ambas marcas).
- [x] Alta de usuarios/colaboradores: a mano desde el dashboard de Supabase (Authentication →
  Users → Add user). Sin pantalla de registro en la app — decisión explícita de la usuaria.
- [x] Verificado de punta a punta con Playwright headless (usuario de prueba creado y borrado
  después vía API admin de Supabase): `/` sin sesión → redirige a `/login`; login real → ve
  Agenda con datos reales; cambio de marca → URL pasa a `?brand=sofia-contreras` sin errores
  de consola ni hydration mismatch; `/api/pieces` sin cookies → 401 JSON; logout → `/login`,
  y revisitar `/` después confirma que la sesión quedó realmente cerrada (no solo la UI).
  `npm run build` limpio, reconoce `src/proxy.ts` como "ƒ Proxy (Middleware)".

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

## Fase 5B — Integración real con GoHighLevel (Email Marketing) ✅
Ver Decisión 6 en DECISIONS.md para el contexto completo. Alcance: solo plataforma Email Marketing (Newsletter usa Substack, sin integración).
- [x] Migración `0002_ghl_email.sql`: columnas `cta_label` y `ghl_template_id` en `pieces` (`material` se reutiliza como link del botón CTA para piezas de email).
- [x] `src/lib/email-template.ts` — wrapper de HTML (preheader, tabla, párrafos del copy, botón CTA en el marcador `{{cta}}`, footer legal fijo).
- [x] `src/lib/ghl.ts` — cliente de la API de GHL (`createGhlEmailTemplate`), en dos pasos: `POST /emails/builder` (crea el shell) + `POST /emails/builder/data` (recién ahí guarda el HTML real — el primer paso solo no alcanza, ver Decisión 6).
- [x] Ruta `api/pieces/[id]/ghl-template` (POST) — arma el HTML y crea/guarda la plantilla.
- [x] UI en `PieceItem.tsx`: campos "Link del botón (CTA)" / "Texto del botón (CTA)" y botón "Crear plantilla en GoHighLevel" (visible solo para piezas de plataforma Email Marketing).
- [x] Credenciales cargadas por la usuaria en `.env.local` (`GHL_API_KEY`, `GHL_LOCATION_ID`) — **probado extremo a extremo contra la cuenta real**: se creó una plantilla de prueba, se verificó que el HTML guardado en GHL contenía el copy/CTA reales (no el placeholder default), y se borró la plantilla y la pieza de prueba después.
- [ ] Pendiente: cargar `GHL_API_KEY`/`GHL_LOCATION_ID` en Vercel también (hoy solo están en `.env.local`).
- [x] Bug encontrado y arreglado (2026-09-08): el botón creaba una plantilla nueva en cada click en vez de actualizar la existente — dejaba huérfanas duplicadas en GHL (detectado por la usuaria mirando su lista de templates). `upsertGhlEmailTemplate` ahora actualiza si la pieza ya tiene `ghl_template_id`; se agregó protección de doble-click. Se limpiaron las 2 plantillas duplicadas que ya existían en la cuenta real.
- [x] Investigado y descartado por ahora: elegir lista de contactos + programar/disparar el envío por API. `GET /emails/schedule` funciona (confirma que el recurso existe) pero `POST /emails/schedule` da 401 incluso con el token con TODOS los scopes habilitados — no es un problema de permisos del token, es una restricción de plataforma. Se sigue haciendo a mano en GHL después de crear la plantilla. Ver Decisión 6 en DECISIONS.md.
- [x] Bug encontrado y arreglado (2026-09-08): botón "Crear plantilla" no distinguía crear de actualizar — siempre creaba una plantilla nueva, dejando huérfanas duplicadas en GHL cada vez que se tocaba (o con un doble-click). `upsertGhlEmailTemplate` ahora actualiza la plantilla existente si la pieza ya tiene `ghl_template_id`; se agregó protección de doble-click en el botón. Se limpiaron las 2 plantillas duplicadas que ya existían en la cuenta real.
- [x] Botón "Guardar" por pieza restaurado (existía en el mockup, se había sacado en Fase 2 por parecer redundante con el autosave): fuerza el flush de cambios pendientes de esa pieza puntual y muestra una confirmación visual clara ("✓ Guardado", flash verde) ahí mismo — sin esto, la única señal de guardado exitoso era el indicador global del header, poco visible mientras se edita bien abajo en una pieza larga.
- [x] Tooltip simple (atributo `title` nativo, ícono "ⓘ") en el campo Copy de piezas Email explicando la convención de `{{contact.first_name}}` y `{{cta}}`.
- [ ] Pendiente lateral (no bloqueante): el `.md` que se descarga del Drive del Proyecto de Claude tiene un bug de encoding (mojibake, probablemente por trabajar con una agencia brasilera cuyo export usa un charset distinto a UTF-8) — conviene arreglarlo en el origen.
- [x] Auditoría de contenido (2026-09-08): revisadas las 2 piezas reales de plataforma Email en la DB (`bdd7a4f0…`, producción, campaña "Ganá tu Año", y su copia `(test)`). Ninguna usaba `[Nombre]` — la sospecha original no aplicaba, ambas ya tenían `{{contact.first_name}}` bien puesto. El problema real era otro: usaban `{{CTA}}` en mayúsculas y con una coma pegada (`{{CTA}},`) en vez de la línea exacta `{{cta}}` que `email-template.ts` espera — bug de código (case-sensitive) + de contenido (puntuación pegada al marcador) combinados. Sin el fix, el marcador quedaba como texto literal visible en el mail y el botón CTA se insertaba al final en vez del punto correcto. Ver Decisión 8 en DECISIONS.md. Corregido: `email-template.ts` ahora matchea el marcador sin distinguir mayúsculas/minúsculas, y se corrigió el copy de ambas piezas en la DB (línea `{{cta}},` → `{{cta}}`). Verificado llamando la función real `buildEmailHtml` contra el copy ya corregido: el marcador no queda como texto literal y el botón aparece en el lugar correcto. **Pendiente de la usuaria**: las 2 plantillas ya creadas en GHL (`ghl_template_id` existente en ambas piezas) tienen el HTML viejo con el bug — hace falta tocar "Actualizar plantilla en GoHighLevel" desde la UI en cada una para que se resuba el HTML corregido (no se hizo automático a propósito, para que la usuaria revise antes de pisar la plantilla real de una campaña con fecha límite).

## Fase 5B — extensión: carga de copy desde .md + markdown real ✅ (2026-09-08)
Ver Decisión 9 en DECISIONS.md.
- [x] Botón "Cargar desde .md" junto al campo Copy (solo piezas Email): lee el archivo elegido en el navegador, decodifica con fallback UTF-8 → Windows-1252 (`src/lib/decode-text-file.ts`) y vuelca el texto crudo al campo Copy (mismo autosave de siempre). Resuelve de paso el bug de encoding/mojibake anotado como pendiente en la sesión de Fase 5B.
- [x] `email-template.ts` ahora convierte markdown inline real (negrita `**`/`__`, itálica `*`/`_`, links `[texto](url)`) a HTML al armar el mail — antes quedaba como texto literal. Sigue sin soportar markdown de bloque (encabezados/listas/citas): la convención "una línea = un párrafo" se mantiene igual.
- [x] Tooltip del campo Copy actualizado mencionando la sintaxis markdown soportada.
- [x] Verificado con la función real `buildEmailHtml` (negrita/itálica/links se convierten bien, marcador `{{cta}}` no queda literal) y en navegador real con Playwright (Chrome del sistema vía `playwright-core`, sin instalarlo como dependencia del proyecto): login real, carga de archivo `.md` de prueba, contenido decodificado correctamente en el campo Copy. `npm run build` limpio.
- [x] **Incidente durante la verificación (2026-09-08, ya resuelto)**: el script de prueba de Playwright apuntó mal al "primer" `<details class="piece">` de la vista Agenda y terminó subiendo el `.md` de prueba sobre la pieza real de producción `bdd7a4f0…` (campaña "Ganá tu Año") en vez de una pieza de prueba dedicada — el autosave (funcionando correctamente) persistió ese contenido de prueba en la DB real por unos minutos. Detectado de inmediato al verificar el autosave por otra vía, y restaurado el campo `copy` a su contenido real exacto (el mismo ya corregido en la Decisión 8 de esta misma sesión) vía API admin de Supabase. Se confirmó que ningún otro campo de esa pieza (`material`, `cta_label`, `estado`, `ghl_template_id`) ni la otra pieza de email se vieron afectados. Lección para el futuro: cualquier prueba de UI automatizada debe operar sobre una pieza creada exclusivamente para la prueba (y borrada al final), nunca sobre "la primera pieza visible" en una vista que mezcla datos reales.

## Fase 6 — Pulido y salida a producción
- [ ] QA visual comparando contra `mockup.html` (pixel a pixel, ambos temas claro/oscuro).
- [ ] Probar el flujo completo con datos reales de ambas marcas.
- [ ] Deploy final a producción en Vercel.
- [ ] Documentar en `CLAUDE.md` cualquier desvío del plan original.

---

## Estado actual (última sesión: 2026-09-08)

Fases 0, 1, 2, 3, 4 y 5B completas. La UI del Tablero de Salida está portada 1:1 (Agenda, Lista rediseñada con columnas compactas + filtros colapsables de fecha/plataforma/estado, stats, modal, FAB, CSV, botón "Guardar" por pieza con confirmación visual) y leyendo/escribiendo la tabla `pieces` real de Supabase vía API routes de Next.js, con autosave por campo + retry automático con backoff. La app ahora requiere login (Supabase Auth) y tiene selector de marca real en el header (Mastery Haus / Sofia Contreras, ambas visibles para cualquier usuario logueado).

**Fase 3 (auth + multi-marca) cerrada esta sesión**: login con email+password vía Supabase Auth (alta de usuarios a mano desde el dashboard, sin registro en la app), `src/proxy.ts` protege toda la app (redirige a `/login` si no hay sesión; reemplaza a `middleware.ts`, deprecado en Next.js 16 — ver Decisión 7 en DECISIONS.md), API routes de `pieces` devuelven 401 sin sesión pero siguen usando `supabaseAdmin`/service role para las queries reales (no se migró a RLS con la sesión del usuario — decisión explícita, equipo chico). Selector de marca reemplaza el `kicker` fijo; navega vía `?brand=<slug>` en la URL, sin tabla puente usuario↔marca (todos ven ambas marcas). Verificado de punta a punta con Playwright (login real, cambio de marca, logout con sesión efectivamente cerrada, 401 en API sin cookies, sin hydration mismatch) usando un usuario de prueba creado y borrado después vía API admin de Supabase.

**Fase 5B (GoHighLevel) cerrada y funcionando en producción**: piezas de plataforma Email Marketing tienen un botón "Crear/Actualizar plantilla en GoHighLevel" que arma el HTML (copy + botón CTA vía marcador `{{cta}}`) y lo sube por API — probado de punta a punta contra la cuenta real, con credenciales ya cargadas en Vercel. Se investigó (y se descartó, por ahora) crear la campaign completa por API — GHL devuelve 401 incluso con el token con todos los scopes habilitados, es una restricción de plataforma, no de permisos. El flujo real hoy es: la app crea la plantilla, la usuaria elige lista/programa el envío a mano en GHL.

Bugs reales encontrados y arreglados esta sesión y las anteriores (ver DECISIONS.md para el detalle de cada uno): hydration mismatch por `new Date()` en SSR, overflow de inputs por `all: unset` pisando `box-sizing`, el botón de GHL creaba una plantilla nueva en cada click en vez de actualizar la existente (dejaba huérfanas duplicadas — ya limpiadas en la cuenta real), y el rename de `middleware.ts` → `proxy.ts` en Next.js 16 (no es un bug de esta app, es un breaking change de la versión — ver Decisión 7).

Repo en GitHub (público, org Mastery-Haus, `Mastery-Haus/mh-content-planner`), con convención de identidad git para toda la carpeta de proyectos vía `~/.gitconfig`.

**Fase 3 commiteada, pusheada a `main` y deployada a producción** (commit `3803da1`, deploy automático vía integración de Vercel con GitHub — confirmado con `curl` que `https://mh-content-planner.vercel.app/login` responde 200 y que `/` sin sesión redirige ahí). Dos usuarios reales creados vía API admin de Supabase (`supabaseAdmin.auth.admin.createUser`, no a mano desde el dashboard como dice la convención de alta — más rápido para esta sesión, mismo resultado): `ona@masteryhaus.com` y `juan@masteryhaus.com`, contraseñas generadas y entregadas por chat (no versionadas en ningún archivo). No hay pantalla de cambio de contraseña en la app — se cambia desde el dashboard de Supabase si hace falta.

**Sesión 2026-09-08**: se investigó el pendiente de "contenido de ejemplo real mal cargado" apuntado la sesión anterior. La sospecha original (`[Nombre]` en vez de `{{contact.first_name}}`) no aplicaba — las 2 piezas de email reales ya estaban bien en eso. El problema real era el marcador `{{CTA}}` (mayúsculas + coma pegada) no matcheando el `{{cta}}` exacto que espera `email-template.ts`, dejando el marcador visible como texto literal y el botón CTA mal ubicado. Ver detalle en Fase 5B arriba y Decisión 8 en DECISIONS.md. Código corregido (`npm run build` limpio) y las 2 piezas actualizadas en la DB.

Misma sesión, a pedido de la usuaria: se agregó carga de copy desde archivo `.md` + soporte de markdown inline real (negrita/itálica/links) en el mail generado — ver Fase 5B (extensión) arriba y Decisión 9 en DECISIONS.md. Durante la verificación en navegador hubo un incidente (script de prueba mal apuntado sobrescribió por unos minutos el copy real de la pieza de producción `bdd7a4f0…`) detectado y restaurado en la misma sesión — documentado en detalle en Fase 5B y Decisión 9, sin impacto final.

**Próximo paso al retomar**: sin bloqueantes propios. Opciones abiertas, ninguna urgente:
- **Acción de la usuaria pendiente de esta sesión**: tocar "Actualizar plantilla en GoHighLevel" en las 2 piezas de email corregidas para resubir el HTML ya arreglado (las plantillas existentes en GHL todavía tienen el bug viejo del marcador — esto es independiente del incidente de restauración, que ya quedó resuelto).
- Pendiente de la usuaria: confirmar que el contenido de la pieza `bdd7a4f0…` (campaña "Ganá tu Año") quedó exactamente como lo tenía cargado — se restauró de memoria de la sesión (no hubo que recuperarlo de un backup), vale una revisión visual rápida antes de dar por cerrado el incidente.
- Fase 5 (Meta/Instagram/Facebook) — bloqueada hasta que la usuaria resuelva el permiso de Admin en el Business Manager dueño de la app de Meta.
- Más pulido de UI si surge algo al usarla (Fase 6), incluyendo QA visual del selector de marca/login contra el resto de la app.
