# Decisiones del proyecto

Registro de decisiones de arquitectura/producto, en orden cronológico. Cada entrada explica qué se decidió, por qué, y qué alternativas se descartaron.

---

## 2026-08-31 — Kickoff: stack, alcance de publicación, multi-marca y auth

**Contexto**: Se parte de `mockup.html`, un Artifact autocontenido (HTML+CSS+JS embebido) que guarda sus datos como JSON embebido y se "autopublica" reescribiendo el HTML completo. El objetivo es llevarlo a una app real con base de datos y capacidad de publicar de verdad en redes.

**Decisión 1 — Stack técnico**: Next.js (App Router) + Postgres vía Supabase + deploy en Vercel.
- **Por qué**: permite replicar el HTML/CSS del mockup casi literal en componentes React, tiene funciones serverless listas para hablar con la API de Meta sin infra propia, Supabase da Postgres + Auth + Storage en un solo servicio (útil para el problema de medios, ver Decisión 5), y Vercel simplifica el deploy.
- **Alternativa descartada**: Node/Express + SQLite self-hosted — más liviano pero exige administrar servidor/hosting propio y no da auth/storage listos.

**Decisión 2 — Alcance de "publicar" en la v1**: auto-publish real solo para **Instagram + Facebook** vía Graph API de Meta. El resto de plataformas (LinkedIn, YouTube, TikTok, Email, Newsletter) se mantienen manuales, tal cual el mockup (se pega el link una vez publicado a mano).
- **Por qué**: la app de Meta ya existe (App ID + Secret ya obtenidos), es la integración con menor fricción para arrancar. Agregar LinkedIn/YouTube/TikTok requeriría crear y aprobar apps nuevas en cada plataforma, lo cual es trabajo y tiempo de aprobación adicional no justificado para la v1.
- **Alternativa descartada**: integrar todas las plataformas desde el arranque — se pospone a una fase futura, evaluar demanda real primero.

**Decisión 3 — Relación entre Mastery Haus y Sofia Contreras**: una sola app con selector de marca en el header, compartiendo la misma base de datos (`brand_id` como scope, no instancias separadas).
- **Por qué**: las cuentas "se apalancan mutuamente" — se necesita poder ver/coordinar contenido cruzado entre ambas marcas desde un mismo lugar. Mantener una sola base de datos facilita reportes combinados y cross-posting a futuro.
- **Alternativa descartada**: dos instancias/deploys separados — más simple de razonar pero impide cualquier vista o coordinación conjunta.

**Decisión 4 — Autenticación**: login simple con email + password, sin SSO ni sistema de roles/permisos granular.
- **Por qué**: equipo chico (la usuaria + eventuales colaboradores), no se justifica la complejidad de roles por ahora.
- **Alternativa descartada**: acceso sin login protegido solo por URL (rechazado por seguridad), y sistema de roles/permisos por persona (rechazado por sobre-ingeniería para el tamaño del equipo actual — reconsiderar si se suman colaboradores con necesidades de acceso distintas).

**Decisión 5 — Medios (material/portada) y Meta Graph API (riesgo abierto, no resuelto aún)**: el mockup usa links de Google Drive para material y portada. La Graph API de Instagram/Facebook para publicar contenido necesita URLs de medios públicas y servidas directamente, no una página de "ver" de Drive.
- **Pendiente de resolver en Fase 5**: probablemente haga falta subir el archivo a Supabase Storage (u otro storage con URLs directas) antes de invocar la API de publicación, en vez de pasarle el link de Drive tal cual. Evaluar cuando se llegue a esa fase.

**Pendiente de la usuaria**: obtener el token de acceso permanente desde Business Settings de Meta (System User token, o Page Access Token de larga duración). No bloquea el desarrollo hasta la Fase 5.
