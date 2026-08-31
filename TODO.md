# Plan por fases y estado actual

Ver [CLAUDE.md](CLAUDE.md) para el contexto general y [DECISIONS.md](DECISIONS.md) para el porqué de cada decisión.

Convención: `[ ]` pendiente, `[~]` en curso, `[x]` hecho.

---

## Fase 0 — Setup del proyecto
- [ ] Inicializar repo git y hacer el primer commit (incluyendo `mockup.html`, `CLAUDE.md`, `DECISIONS.md`, `TODO.md`).
- [ ] Scaffold de Next.js (App Router, TypeScript).
- [ ] Crear proyecto en Supabase (Postgres + Auth + Storage).
- [ ] Variables de entorno: credenciales de Supabase, App ID / App Secret de Meta (el token permanente se agrega en Fase 5).
- [ ] Conectar el repo a Vercel para deploy automático (ambiente de preview + producción).

## Fase 1 — Modelo de datos
- [ ] Diseñar esquema: `brands` (Mastery Haus, Sofia Contreras), `users`, `pieces` (con `brand_id` FK).
- [ ] Migrar el modelo de `pieces` visto en el JSON embebido de `mockup.html` (date, platform, format, angle, copy, material, portada, estado, notas, publicado) a columnas de la tabla.
- [ ] Script de seed para cargar el contenido ya existente en `mockup.html` como datos reales de Mastery Haus.
- [ ] Definir constraints/enums de `platform`, `format` (dependiente de `platform`) y `estado` según `PLATFORM_FORMATS` / `STATUS_META` del JS del mockup.

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

Recién terminado: definición de alcance y decisiones de arquitectura (ver DECISIONS.md). Documentos de contexto creados. **Todavía no se escribió código de la app nueva** — el único artefacto existente es `mockup.html` (la referencia de diseño).

**Próximo paso al retomar**: arrancar Fase 0 (scaffold de Next.js + proyecto de Supabase).
