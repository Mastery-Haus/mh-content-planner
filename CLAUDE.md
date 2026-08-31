# mh-content-planner — Contexto del proyecto

## Qué es esto

Reconstrucción del "Tablero de Salida" (`mockup.html`) como aplicación real: mismo look and feel exacto (Apple-style, tema claro/oscuro automático), pero con base de datos real, autenticación, y publicación real a Meta (Instagram + Facebook) en vez de un JSON embebido que se autopublica como Artifact.

`mockup.html` es la fuente de verdad del diseño y del modelo de datos original — no se modifica, se usa como referencia visual y funcional pixel a pixel.

Dos marcas que se apalancan mutuamente y conviven en la misma app con selector de marca:
- **Mastery Haus**
- **Sofia Contreras**

## Documentos de contexto (leer en este orden al retomar una sesión)

1. **[DECISIONS.md](DECISIONS.md)** — decisiones de arquitectura y producto ya tomadas, con el porqué. Antes de proponer un cambio de stack, flujo o modelo de datos, revisar acá si ya se decidió y por qué.
2. **[TODO.md](TODO.md)** — plan por fases y estado actual. Acá se ve en qué fase estamos y qué sigue.

Mantener estos tres archivos (este + los dos de arriba) actualizados al final de cada sesión de trabajo relevante.

## Stack decidido

- **Frontend/Backend**: Next.js (App Router), desplegado en Vercel.
- **Base de datos**: Postgres vía Supabase.
- **Auth**: email + password simple, sin SSO ni roles complejos (equipo chico).
- **Multi-marca**: una sola app, un selector de marca en el header (reemplaza el `kicker` fijo "Mastery Haus" del mockup), datos scoped por `brand_id` en la misma DB.
- **Publicación real**: Graph API de Meta, solo Instagram + Facebook en esta primera etapa. El resto de plataformas (LinkedIn, YouTube, TikTok, Email, Newsletter) se mantienen como en el mockup: campo de link "publicado" que se completa a mano.

## Estado de credenciales de Meta

- App de Meta: **creada**. App ID y App Secret: **ya los tenemos**.
- Falta: token de acceso permanente (System User de Business Settings, o Page Access Token de larga duración vía intercambio OAuth). Esto bloquea únicamente la Fase 5 (integración real de publicación), no bloquea nada anterior.
- Riesgo a validar en Fase 5: los campos `material`/`portada` del mockup son links de Google Drive. La Graph API de Instagram/Facebook para publicar Reels/Carruseles necesita URLs de medios públicamente accesibles y servidas directamente (no una página de "ver" de Drive) — probablemente haga falta un paso de storage propio (Supabase Storage) que reciba el archivo y exponga una URL directa antes de llamar a la API de publicación.

## Modelo de datos (visto en `mockup.html`)

Cada "pieza" de contenido tiene: `id`, `date`, `platform` (instagram, instagram_mh, facebook, linkedin, youtube, tiktok, email, newsletter), `format` (depende de la plataforma — ver `PLATFORM_FORMATS` en el JS del mockup), `angle` (título/ángulo), `copy`, `material` (link), `portada` (link de imagen de portada), `estado` (pendiente, produccion, listo, publicado, error), `notas`, `publicado` (link una vez publicado).

Al migrar a DB real, esto pasa a ser una tabla `pieces` con `brand_id` como FK, más una tabla `brands` (Mastery Haus, Sofia Contreras) y `users`.

## Notas de la versión de Next.js instalada

Se scaffoldeó con `create-next-app@latest`, que instaló **Next.js 16.3.3 + React 19.2.8** (App Router, TypeScript, sin Tailwind). Esta versión es más nueva que el conocimiento de entrenamiento del modelo, así que antes de escribir código que dependa de convenciones de Next.js, revisar `node_modules/next/dist/docs/` y el archivo `AGENTS.md` en la raíz (lo regenera `next dev`/`next build` automáticamente — no editarlo a mano, pero sí commitearlo).

Cosas ya notadas que difieren de versiones anteriores:
- `next build` usa **Turbopack** por defecto (aparece como `▲ Next.js 16.3.3 (Turbopack)` en el output), no falta flag para activarlo.
- Los layouts tipan sus props con helpers generados por ruta, ej. `LayoutProps<"/">` en `src/app/layout.tsx`, en vez de tipar `children` a mano.

## Convenciones de trabajo

- No modificar `mockup.html` — es la referencia de diseño, no el código de producción.
- Replicar el CSS del mockup literal (custom properties, radios, sombras, paleta de estados) en el sistema de diseño de la app nueva — no reinterpretar el estilo.
- Actualizar `TODO.md` al cerrar o avanzar una fase, y `DECISIONS.md` cuando se tome una decisión nueva o se cambie una anterior.
