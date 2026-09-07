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

## Fase 2 — UI replicada (sin auth ni publicación real todavía)
- [ ] Portar el CSS del mockup literal (custom properties, paleta de estados, dark mode automático) al sistema de estilos de Next.js.
- [ ] Vista Agenda: day cards colapsables con resumen por plataforma, barra de estados, detalle de pieza expandible.
- [ ] Vista Lista: tabla con las mismas columnas del mockup.
- [ ] Stats strip (conteo por estado), navegación de mes, toggle Agenda/Lista.
- [ ] Modal "Nueva pieza" y FAB de agregar.
- [ ] Exportar CSV.
- [ ] En esta fase los datos vienen de la DB vía API routes de Next.js, pero todavía sin login (acceso directo para desarrollo).

## Fase 3 — Autenticación y multi-marca
- [ ] Login con email + password (Supabase Auth).
- [ ] Selector de marca en el header (reemplaza el `kicker` fijo "Mastery Haus"), scoping de todas las queries por `brand_id`.
- [ ] Alta de usuarios/colaboradores.

## Fase 4 — Persistencia real (reemplazo del mecanismo de autopublish del mockup)
- [ ] CRUD completo de piezas contra la DB (crear, editar, duplicar, borrar) vía API routes.
- [ ] Indicador de estado de guardado (`save-status`) conectado a las llamadas de red reales, no a un `docVersion` en memoria.
- [ ] Manejo de errores de guardado (estado `error` visible si falla la escritura).

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

## Estado actual (última sesión: 2026-08-31)

Fase 1 completa. Proyecto de Supabase real conectado y con datos: `brands` (Mastery Haus, Sofia Contreras) y `pieces` con las 36 piezas reales migradas desde `mockup.html`, ya verificadas.

Único pendiente de Fase 0: conectar el repo a Vercel — CLI instalada, falta que la usuaria corra `npx vercel login` desde su terminal (login interactivo) y avise para correr `vercel link`. No bloquea el resto del desarrollo local.

**Próximo paso al retomar**: arrancar Fase 2 (UI replicada del mockup, conectada a la DB real vía API routes de Next.js, todavía sin auth).
