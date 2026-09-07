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

---

## 2026-09-07 — Fase 2: autosave con debounce en vez de "Guardar" manual

**Contexto**: El mockup marcaba los cambios como "sin guardar" hasta que se tocaba el botón "Guardar", que republicaba el HTML completo del Artifact (una operación cara). Al portar la UI a la app real con API routes, guardar un campo pasa a ser una sola llamada `PATCH` liviana.

**Decisión**: cada edición de campo se autoguarda ~600ms después de dejar de tipear (debounce por pieza, no por campo individual — todos los campos tocados dentro de esa ventana se mandan juntos). El indicador `save-status` del header refleja el estado real de red (`pendiente` / `guardando` / `guardado` / `error`), no un contador en memoria como el `docVersion` del mockup. El botón "Guardar" del header pasa a ser un "forzar guardado inmediato de lo pendiente" en vez de la única forma de persistir. Se quitó el botón "Guardar" individual de cada pieza (quedaba redundante).

- **Por qué**: confirmado con la usuaria — menos riesgo de perder cambios (no depende de que alguien se acuerde de tocar "Guardar" antes de cerrar la pestaña), y adelanta gran parte de lo que la Fase 4 iba a pedir de todos modos (indicador de guardado conectado a red real).
- **Alternativa descartada**: replicar el comportamiento del mockup (cambios solo en memoria hasta tocar "Guardar" manualmente) — más fiel al mockup pixel a pixel en comportamiento, pero replica una limitación (guardado manual, pensada para publish caro) que ya no aplica con DB real.
- **Manejo de errores**: si el `PATCH` falla, el cambio se re-encola y se reintenta automáticamente con backoff exponencial (1.5s, 3s, 6s, 12s, 15s tope — 5 intentos) antes de pedirle a la usuaria que guarde a mano. Ver Fase 4 en TODO.md.

---

## 2026-09-07 — Cómo calcular "hoy" sin romper la hidratación (Next.js SSR)

**Contexto**: `Tablero` (Client Component) se renderiza en el servidor para el HTML inicial y después se hidrata en el navegador. Usar `new Date()` directo durante el render (para el mes por defecto y el resaltado de "hoy" en Agenda) hacía que, si el reloj/zona horaria del servidor difiere del cliente — algo que va a pasar seguro en producción (Vercel corre en UTC, la usuaria está en Argentina, UTC-3) —, React tire el warning "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties". No era un bug de una extensión del navegador: se reprodujo de forma controlada forzando el reloj del cliente a un mes distinto del servidor.

**Decisión**: `page.tsx` (Server Component) calcula "hoy" una sola vez y lo pasa como prop `serverToday` (string `YYYY-MM-DD`). `Tablero` usa `useSyncExternalStore` con ese valor como snapshot de servidor y `new Date()` real como snapshot de cliente — React se encarga de mostrar el valor del servidor en el primer render (para que SSR e hidratación coincidan exactamente) y sincronizarlo al valor real del cliente apenas termina de hidratar, sin warning. El mes navegable (`currentMonth`) se deriva de ese valor salvo que la usuaria haya tocado los botones de mes (estado separado `monthOverride`), evitando un `useEffect` extra para inicializarlo.

- **Por qué `useSyncExternalStore` y no un `useEffect` que llama `setState` al montar**: es el mecanismo que React expone específicamente para "un valor que puede diferir entre servidor y cliente" (le compilador/eslint de hooks del proyecto además rechaza `setState` síncrono como primera instrucción de un efecto — `react-hooks/set-state-in-effect`). Con `useSyncExternalStore` no hace falta pelear con esa regla ni aceptar un re-render extra manual.
- **Alcance**: cualquier componente nuevo que necesite "la fecha/hora actual" durante el render (no dentro de un handler de evento) debe seguir este mismo patrón — nunca `new Date()` suelto en el cuerpo de un componente que se server-renderea.
