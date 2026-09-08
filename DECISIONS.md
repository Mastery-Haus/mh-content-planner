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

---

## 2026-09-07 — Bug real: inputs de `.field` desbordaban su contenedor (`all: unset` pisa `box-sizing`)

**Contexto**: la usuaria reportó los campos del detalle de pieza "muy pegados" / tocando el borde derecho, incluso a zoom 100%. Se confirmó con un diagnóstico de `scrollWidth` vs `clientWidth` en varios anchos de viewport: cada `<input>`/`<select>` dentro de `.field` desbordaba su contenedor por exactamente `padding-horizontal×2 + borde×2` (26px con el padding vigente), en todos los anchos probados — no era zoom ni un problema de layout responsive.

**Causa raíz**: `.field input[type="text"], ...` usa `all: unset` para resetear los estilos default del navegador (heredado tal cual del mockup). `all: unset` también resetea `box-sizing` a su valor inicial (`content-box`), pisando el `* { box-sizing: border-box }` global de la app. Con `content-box` + `width: 100%` + padding + borde, el elemento renderiza más ancho que su contenedor — exactamente por el padding y el borde. Los campos que usan `.linkfield` (input + botón "abrir") no mostraban el problema porque ese input tiene `flex: 1` dentro de un contenedor flex, lo que hace que el navegador ignore la propiedad `width` como base de cálculo (flex-basis 0%) y listado el bug quede oculto ahí — pero afecta a **cualquier** `<input>`/`<select>` directo de `.field` (fecha, plataforma, formato/campaña, ángulo, estado, y los nuevos de CTA). Este bug ya estaba en el mockup original (mismo patrón `all: unset` + `width: 100%`), solo que no se había notado.

**Fix**: agregar `box-sizing: border-box;` explícito justo después de `all: unset` en esa regla. Verificado con el mismo diagnóstico de `scrollWidth`/`clientWidth` en varios anchos (700–1440px) — el desborde desapareció por completo.

---

## 2026-09-08 — Bug real: "Crear plantilla en GoHighLevel" creaba una plantilla nueva en cada click

**Contexto**: la usuaria detectó, mirando la lista de templates en GHL, dos plantillas duplicadas con el mismo nombre y timestamp casi idéntico — consecuencia de un doble-click en el botón. `upsertGhlEmailTemplate` (antes `createGhlEmailTemplate`) siempre hacía `POST /emails/builder` (crear) sin chequear si la pieza ya tenía un `ghl_template_id` — cada click, exitoso o repetido, generaba una plantilla huérfana nueva en la cuenta real de GHL, dejando basura acumulándose.

**Fix**: `upsertGhlEmailTemplate` ahora recibe `existingTemplateId` — si la pieza ya tiene `ghl_template_id`, se saltea el paso de creación y va directo a `POST /emails/builder/data` sobre esa misma plantilla (actualiza en vez de crear). Además se agregó protección de doble-click en el botón (estado `creatingGhl` en `PieceItem.tsx`, deshabilita el botón mientras la request está en curso). Verificado llamando la ruta dos veces seguidas sobre la misma pieza: el `templateId` devuelto es idéntico y no aparece una segunda plantilla en GHL. Las dos plantillas duplicadas preexistentes de la usuaria se identificaron (comparando contra el `ghl_template_id` real guardado en la pieza) y se borró la huérfana.

**Investigación en paralelo — ¿se puede crear una campaign real (no solo template) por API?**: la usuaria preguntó si convenía repensar esto para evitar el paso manual de armar el envío en GHL. Se confirmó contra la cuenta real: `GET /emails/schedule` **funciona** con el token actual y devuelve campañas reales existentes (confirma que el recurso existe y tiene esta forma: `name`, `campaignType`, `status`, `templateId`, etc.), pero `POST /emails/schedule` devuelve 401 "the token is not authorized for this scope".

**Actualización**: la usuaria confirmó que el token YA tenía todos los scopes disponibles marcados (incluido `emails/schedule.write`, `emails/campaigns.write`, etc. — ver captura de Configuración de scopes) desde el vamos, no algo que haya cambiado recién. El 401 persiste igual. Conclusión: esto no es un problema de scopes del token — es una restricción a nivel de plataforma/endpoint que GHL aplica más allá del modelo de scopes visible (probablemente por las mismas razones de compliance/anti-spam que motivan a la mayoría de los ESP a no dejar disparar envíos masivos vía un token simple sin review adicional). **Se pausa esta línea de investigación** — no vale la pena seguir insistiendo sin soporte directo de GHL. La integración se queda en "crear/actualizar plantilla por API + enviar a mano desde GHL", que es lo que ya funciona.

---

## 2026-09-07 — Decisión 6: integración real con GoHighLevel (Fase 5B, solo Email Marketing)

**Contexto**: La usuaria redacta el copy de los mails en un Proyecto de Claude aparte, lo baja como `.md` de Drive, lo envuelve a mano en un boilerplate HTML (preheader, tabla, botón CTA, firma, footer legal) y lo pega en GoHighLevel (Marketing → Emails → Email Campaigns → carpeta → Blank → Code Editor). Quiere automatizar ese pegado manual.

**Investigación previa a decidir**: antes de proponer arquitectura, se verificó contra código real de un cliente open-source de la API de GHL (no solo marketing docs) que `POST https://services.leadconnectorhq.com/emails/builder` (header `Version: 2021-07-28`, Bearer token) crea una plantilla de email con HTML custom. Lo que NO se pudo confirmar con el mismo nivel de certeza es si elegir la lista de contactos + programar/disparar el envío también es automatizable por API (existe el scope `emails/schedule.write`, pero no se encontró código real que lo use) — **fuera de alcance de esta fase**: la plantilla se crea por API, pero programar el envío se sigue haciendo a mano en GHL.

**Corrección tras probar contra la cuenta real (importante)**: el `POST /emails/builder` inicial **ignora el campo `html`** — crea la plantilla con el placeholder default de GHL ("Welcome to email", botón "Start creating"), no con nuestro contenido. Hace falta un segundo llamado, `POST /emails/builder/data` con `{ locationId, templateId, html, editorType: 'html', updatedBy: '<string no vacío>' }`, para que el HTML real quede guardado (`updatedBy` es obligatorio — sin él GHL responde 422 "updatedBy should not be empty"). `createGhlEmailTemplate` en `src/lib/ghl.ts` encadena ambos pasos. Verificado extremo a extremo contra la cuenta real: se creó una plantilla de prueba, se confirmó que el HTML contenía el copy/CTA reales (no el placeholder), y se borró después.

**Decisión**: 
- Alcance solo **Email Marketing** (no Newsletter — usa Substack, herramienta aparte, sin integración).
- Una sola cuenta/location de GHL (no hace falta un token distinto por marca).
- `material` se reutiliza en piezas `platform: email` como el link del botón CTA (relabeled en la UI a "Link del botón (CTA)"); se agregaron dos columnas nuevas a `pieces`: `cta_label` (texto del botón) y `ghl_template_id` (id de la plantilla ya creada, si la hay). El asunto/título de la plantilla sale de `angle`.
- Convención de redacción: el copy ya incluye saludo y firma/PD como texto normal (tal cual lo redacta la usuaria); el wrapper de HTML (`src/lib/email-template.ts`) NO los agrega — solo inserta el botón CTA en el punto donde el copy tenga una línea que diga exactamente `{{cta}}` (si no hay marcador, el botón va al final). Cada línea no vacía del copy se envuelve en su propio `<p>`.
- Footer legal (Mastery Haus / Tempus Rocket LLC, aviso legal, privacidad, `{{email.unsubscribe_link}}`) queda fijo en el wrapper — no varía por pieza.
- **Nota de bug lateral detectada**: el `.md` exportado desde Drive tiene problemas de encoding (mojibake, `Ã­` en vez de `í`) — vale la pena arreglarlo en el origen (el proceso de export del Proyecto de Claude/Drive), no es algo que este wrapper corrija.
- **Pendiente de la usuaria**: generar el Private Integration Token en GHL (scopes `emails/builder.readonly` + `.write`) y el `GHL_LOCATION_ID`, cargarlos en `.env.local` y en Vercel.

---

## 2026-09-08 — Decisión 7: Fase 3 (auth + selector de marca) y rename middleware→proxy en Next.js 16

**Contexto**: se retoma la Fase 3, pospuesta desde el kickoff a pedido de la usuaria mientras se iteraba rápido sobre la UI sin loguearse. Antes de escribir código se confirmaron tres decisiones de alcance con la usuaria:

- **Alta de usuarios**: a mano desde el dashboard de Supabase (Authentication → Users → Add user). Sin pantalla de registro en la app — más simple y evita que cualquiera con el link se cree una cuenta sola.
- **Acceso a marcas**: todo usuario logueado ve ambas marcas (Mastery Haus + Sofia Contreras) y cambia libremente con el selector. No se creó ninguna tabla puente usuario↔marca — coherente con la Decisión 4 (equipo chico, sin roles/permisos granulares) y con que ambas marcas "se apalancan mutuamente".
- **Autorización de las API routes de `pieces`**: se mantiene `supabaseAdmin` (service role, bypassa RLS) para las queries reales, pero cada handler ahora exige sesión válida (`requireUser()`) antes de ejecutar cualquier operación, devolviendo 401 si no hay sesión. **No** se migró a RLS real con la sesión del usuario (cliente anon + policies que autoricen por `brand_id`/usuario) — sería más "correcto" en términos de defensa en profundidad, pero es un refactor grande sin beneficio real dado que cualquier usuario logueado puede ver/editar ambas marcas de todos modos. Las policies de RLS de `0001_init.sql` (Fase 1) quedan tal cual, efectivamente vestigiales.

**Hallazgo real durante la implementación — `middleware.ts` ya no existe en Next.js 16**: está deprecado a favor de `proxy.ts` (export nombrado `proxy`, mismo `config.matcher`; hay un codemod `npx @next/codemod@canary middleware-to-proxy .` para migrar código viejo). Cambio adicional relevante: el Proxy corre en runtime **Node.js por defecto** (antes Edge en middleware), lo cual en este caso es una mejora — sin fricción para `@supabase/ssr`. Se implementó `src/proxy.ts` desde cero (no había `middleware.ts` previo que migrar). Confirmado con `npm run build`: la ruta se reconoce como "ƒ Proxy (Middleware)" en el output.

**Diseño implementado**:
- `src/lib/supabase/server.ts` — cliente de Supabase con la sesión del usuario (anon key + cookies vía `@supabase/ssr`, API vigente `getAll`/`setAll`, no el patrón viejo `get/set/remove` que está deprecado en la versión instalada). `requireUser()` se usa tanto en Server Components (`page.tsx`, `login/page.tsx`) como en las API routes.
- `src/proxy.ts` — refresca la sesión en cada request (llama `supabase.auth.getUser()`, que revalida contra el servidor de Auth, no solo decodifica el JWT localmente) y redirige a `/login` si no hay usuario, excepto en `/login` mismo y en `/api/*` (esas rutas devuelven 401 JSON en vez de una redirección a HTML — cada handler hace su propio chequeo).
- Login: `src/app/login/` con `LoginForm.tsx` (Client Component, `useActionState` de React 19) + Server Action `login()` en `actions.ts`. Logout: Server Action `logout()` en `src/app/actions.ts`, pasada como prop a `Tablero` (los Server Actions se pueden pasar como prop a un Client Component sin problema) para el botón "Cerrar sesión" del header.
- Selector de marca: `page.tsx` ahora trae todas las filas de `brands` y resuelve la marca activa desde `?brand=<slug>` en la URL (default a Mastery Haus si no hay query param o el slug no existe). El `<span className="kicker">` fijo de `Tablero.tsx` se reemplazó por un `<select>` que navega con `router.push(\`/?brand=${slug}\`)` — recarga server-side, sin duplicar fetch client-side. Los `POST /api/pieces` (crear/duplicar) ahora mandan `brand_slug` explícito en el body en vez de depender del default silencioso de `resolveBrandId()`.
- **No se tocó** el scoping por `brand_id` de `PATCH`/`DELETE /api/pieces/[id]` (siguen filtrando solo por `id` de pieza) — no hace falta dado que cualquier usuario ve/edita ambas marcas; queda anotado como no-goal explícito de esta fase, no como deuda técnica olvidada.

**Verificación**: recorrido completo con Playwright headless (usuario de prueba creado y borrado después vía API admin de Supabase, `supabaseAdmin.auth.admin.createUser`/`deleteUser`) — `/` sin sesión redirige a `/login`; login real funciona y muestra datos reales; cambio de marca actualiza la URL y las piezas mostradas sin errores de consola ni hydration mismatch (nota de timing, no bug: el cambio de URL tras elegir la marca tarda ~1-1.5s en reflejarse por el round-trip de navegación de Next, relevante solo para tests automatizados futuros); `/api/pieces` sin cookies devuelve 401; logout cierra la sesión de verdad (revisitar `/` después vuelve a redirigir a `/login`). `npm run build` sin errores de tipos.

---

## 2026-09-08 — Decisión 8: bug real en el marcador `{{cta}}` de las piezas de Email (case + puntuación)

**Contexto**: se retomó el pendiente anotado al cierre de la sesión anterior ("revisar contenido de ejemplo real cargado con `[Nombre]` en vez de `{{contact.first_name}}`"). Se auditaron las 2 piezas reales de plataforma Email existentes en la DB (`bdd7a4f0…`, estado producción, campaña "Ganá tu Año" de Sofía Contreras, y su copia de prueba `1ffe7111…`) vía consultas directas a la API REST de Supabase.

**Hallazgo**: la sospecha original no aplicaba — ninguna de las 2 piezas usaba `[Nombre]`, ambas ya tenían `{{contact.first_name}}` correctamente. El problema real, no sospechado hasta auditar el contenido real, era el marcador de posición del botón CTA: el copy tenía la línea `{{CTA}},` (mayúsculas y con una coma pegada) en vez de la línea exacta `{{cta}}` que `src/lib/email-template.ts` busca con `l.trim() === "{{cta}}"`. Sin fix, esto causaba dos problemas simultáneos en el mail final: (1) el marcador quedaba como texto literal visible para el destinatario ("{{CTA}},") en vez de ser reemplazado, y (2) el botón CTA se insertaba al final del cuerpo del mail en vez de en el punto narrativo correcto (justo después de "la puerta todavía está abierta:"). La pieza de producción ya tenía un `ghl_template_id` — es decir, ya existía una plantilla creada en GHL con este bug adentro.

**Decisión — alcance del fix**:
- Código: `buildEmailHtml` en `email-template.ts` ahora matchea el marcador con `l.trim().toLowerCase() === "{{cta}}"` (case-insensitive) — cubre variantes futuras como `{{Cta}}` o `{{CTA}}` sin puntuación pegada. La convención de "línea exacta" (documentada en el comentario del archivo) se mantiene deliberadamente estricta en cuanto a puntuación — no se relajó a un regex más permisivo que ignore comas/puntos, para no arriesgar falsos positivos matcheando texto narrativo que casualmente contenga `cta` entre llaves.
- Contenido: se corrigió el copy de las 2 piezas afectadas directamente en la DB (vía API REST con la service role key, no a mano en el dashboard) para que la línea del marcador sea exactamente `{{cta}}`, sin la coma.
- Verificación: se importó y corrió la función real `buildEmailHtml` (no una reimplementación) contra el copy ya corregido — confirmado que el marcador no queda como texto literal en el HTML final y que el botón aparece antes de "Te espero adentro" (inline, no al final). `npm run build` limpio.
- **No se resubió automáticamente a GHL**: las 2 plantillas ya creadas ahí (`ghl_template_id` existente en ambas piezas) siguen teniendo el HTML viejo con el bug. Queda como acción pendiente de la usuaria tocar "Actualizar plantilla en GoHighLevel" en la UI para cada una — decisión deliberada de no automatizar ese último paso, dado que una de las piezas es contenido real de una campaña con fecha límite ("mañana es el último día para sumarte") y conviene que la usuaria revise antes de pisar la plantilla real.

---

## 2026-09-08 — Decisión 9: carga de copy desde `.md` + markdown inline real en el mail

**Contexto**: la usuaria redacta el copy en un Proyecto de Claude, baja un `.md` de Drive y hoy lo abre y pega a mano en el campo Copy de la pieza. Pidió (a) poder editar la plantilla del mail (pendiente, no entra en esta decisión) y (b) poder subir el `.md` directamente en vez de copiar y pegar. Se confirmó con la usuaria que esos `.md` sí traen markdown real (negrita, itálica, links), no solo texto plano — esto cambia el alcance: no alcanza con volcar el archivo tal cual, hay que convertir esa sintaxis a HTML real en el mail (antes quedaba como texto literal, ej. `**así**` se veía literalmente con los asteriscos).

**Decisión**:
- Botón "Cargar desde .md" junto al campo Copy (solo piezas Email): dispara un `<input type="file" accept=".md,text/markdown,text/plain">` oculto, lee el archivo con `file.arrayBuffer()` y decodifica con `src/lib/decode-text-file.ts` — intenta UTF-8 estricto (`fatal: true`) y si falla (secuencia de bytes inválida, típico de un archivo en realidad Windows-1252) cae a `windows-1252`. Resuelve de paso el bug de encoding/mojibake que quedó anotado como pendiente lateral en la sesión de Fase 5B, sin necesitar una librería de detección de charset.
- El contenido se vuelca crudo (as-is, con la sintaxis markdown incluida) al campo Copy — mismo mecanismo de autosave de siempre, ningún camino nuevo de guardado.
- `email-template.ts` ahora convierte ese markdown a HTML al armar el mail: negrita (`**texto**`/`__texto__`), itálica (`*texto*`/`_texto_`) y links (`[texto](url)`, solo `http(s)://`). Deliberadamente **no** se soporta markdown de bloque (encabezados `#`, listas `-`/`*`, citas `>`) — el modelo de párrafo de este wrapper sigue siendo "una línea no vacía = un párrafo propio" (ver comentario en `linesToParagraphs`), no el de CommonMark; meter un parser de markdown completo habría chocado con esa convención ya afinada a como redacta la usuaria (sin líneas en blanco entre párrafos). Se escapa primero el HTML del texto y recién después se aplican las conversiones — los caracteres de sintaxis markdown no son especiales para HTML así que sobreviven el escape intactos, y evita que el texto de la usuaria pueda inyectar HTML arbitrario en el mail.
- El preheader oculto (primera línea no vacía, hasta 150 caracteres) usa una función separada que **saca** la sintaxis markdown en vez de convertirla a etiquetas, porque ese texto no se renderiza como HTML.
- Verificado con la función real `buildEmailHtml` importada directamente (no una reimplementación): negrita/itálica/links se convierten correctamente, el marcador `{{cta}}` no queda como texto literal, y con `decodeTextFile` para ambos casos de encoding (UTF-8 real y un archivo simulado en Windows-1252 con un byte inválido en UTF-8).

**Incidente durante la verificación en navegador (mismo día, ya resuelto)**: para probar el flujo real end-to-end se instaló `playwright-core` (sin guardarlo como dependencia, `npm install --no-save`) y se usó el Chrome del sistema (`channel: "chrome"`) para no descargar un navegador aparte. El script de prueba localizaba la pieza a editar como "la primera `<details class="piece">` en la vista Agenda" — pero esa vista mezcla piezas reales con cualquier pieza de prueba creada, y el `<details>` resultante fue en realidad la pieza real de producción `bdd7a4f0…` (campaña "Ganá tu Año", ver Decisión 8), no la pieza de prueba recién creada. El upload del `.md` de prueba se ejecutó igual (Playwright puede setear un `<input type="file">` y leer un `<textarea>` sin que el elemento esté visualmente visible, a diferencia de un click), y el autosave —funcionando correctamente, como debía— persistió ese contenido de prueba sobre el campo `copy` de la pieza real por unos minutos (`updated_at` quedó en `03:17:39Z`). Se detectó al verificar el autosave por otra vía (consulta directa a la tabla buscando el texto de prueba) y se restauró de inmediato el `copy` real exacto (el mismo ya corregido en la Decisión 8) vía API admin de Supabase, confirmando que ningún otro campo de esa pieza ni la otra pieza de email se vieron afectados. Se limpiaron el usuario de prueba, el proceso de `next dev`, `playwright-core` y los archivos temporales al cerrar.

- **Lección para pruebas futuras**: cualquier verificación automatizada en navegador debe operar sobre una pieza creada exclusivamente para la prueba (con un ángulo/identificador inconfundible) y borrarla al final — nunca asumir "la primera pieza visible" en una vista que combina datos reales de la usuaria con datos de prueba.

---

## 2026-09-08 — Decisión 10: vista previa del mail + edición manual del HTML (override)

**Contexto**: siguiendo con el pedido original de la usuaria ("que se pudiera editar el template"), se definió el diseño concreto: un botón "Vista previa" que muestra el mail tal cual va a salir, con un modo "Editar HTML" para retocarlo a mano ahí mismo. Se confirmó con la usuaria que el HTML editado a mano debe guardarse aparte y no pisarse solo cuando se vuelve a tocar Copy/CTA — la alternativa más simple (regenerar siempre desde Copy, perdiendo cualquier edición manual al primer cambio) se descartó explícitamente por ese motivo.

**Decisión**:
- Columna nueva `email_html_override` en `pieces` (migración `0003_email_html_override.sql`, texto, default `''`). Vacío = "sin override, generar automático" — el comportamiento existente no cambia para ninguna pieza hasta que alguien use el editor manual.
- `EmailPreviewModal.tsx`: modal con un `<iframe sandbox="">` mostrando el HTML real (el mismo `buildEmailHtml()` que ya se usaba para subir a GHL, o el override si existe) y un modo de edición (`<textarea>` con el HTML crudo). "Guardar edición" persiste el HTML editado en `email_html_override` vía el mismo mecanismo de autosave de siempre (`onFieldChange` + `onSavePiece` para flush inmediato, igual que el botón "Guardar" por pieza). "Volver a generar automático" limpia el override.
- `api/pieces/[id]/ghl-template` ahora usa `email_html_override` tal cual si tiene contenido, en vez de regenerar desde copy/material/cta_label — así lo que se ve en la vista previa es exactamente lo que se sube a GoHighLevel.
- El iframe usa `sandbox=""` (sin ningún permiso) porque el HTML del mail no necesita ejecutar nada — es solo para verlo renderizado tal cual llegaría al destinatario.

**Incidente durante el rollout (resuelto, sin impacto en datos)**: al pedirle a la usuaria que corriera la migración en el SQL Editor de Supabase, el primer intento devolvió `relation "public.pieces" does not exist`. Se verificó contra la API REST que el proyecto real de la app (`tcksfyftssdsnkiblwkc.supabase.co`, tomado de `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`) sí tiene la tabla `pieces` con 38 filas reales — el error ocurrió porque la usuaria abrió el SQL Editor de un proyecto de Supabase distinto (no identificado cuál) sin darse cuenta. La usuaria además comentó, antes de confirmar esto, que no le preocupaba borrar datos porque "la mayoría son mock" — se le aclaró que la tabla real tiene contenido real desde Fase 5B (la campaña de email "Ganá tu Año" con plantilla ya publicada en GHL, más las cuentas de login reales) y que esta migración en particular es aditiva (`add column if not exists`, sin riesgo de pérdida de datos de por sí). Una vez que corrió el SQL en el proyecto correcto, la columna quedó creada y confirmada por API antes de seguir.

**Orden de deploy importante**: como `PIECE_COLUMNS` (el `select` que usan todas las rutas de `pieces`) ahora incluye `email_html_override`, la migración tiene que estar aplicada en Supabase **antes** de deployar este código — si el código sale primero, cualquier `GET /api/pieces` fallaría porque pediría una columna inexistente. Se verificó la columna por API antes de levantar el servidor de desarrollo local (que apunta al mismo proyecto real, no hay entorno separado) y antes de dar por lista la verificación en navegador.

**Verificación**: recorrido con Playwright + Chrome del sistema (`playwright-core` instalado con `--no-save`, sin quedar como dependencia) contra una pieza creada expresamente para la prueba (ángulo `PLAYWRIGHT-TEST-EMAIL-PREVIEW-DELETE-ME`, insertada y borrada por API) y localizada por ese texto exacto — nunca "la primera pieza visible", aplicando la lección de la Decisión 9. Confirmado: la vista previa muestra el markdown ya convertido a HTML real (`<strong>`), el marcador `{{cta}}` no queda literal, la edición manual persiste con un `PATCH` real (200) y queda marcada con la nota "editado a mano", y "Volver a generar automático" limpia el override correctamente (confirmado leyendo la fila directo de la DB). `npm run build` limpio. Pieza y usuario de prueba borrados al cerrar.

---

## 2026-09-08 — Decisión 11: orden de publicación real más allá de Meta (YouTube → LinkedIn → Meta)

**Contexto**: Fase 5 (Meta) sigue bloqueada por el permiso de Admin en el Business Manager dueño de la app (ver Decisión 1/kickoff y TODO.md). Se conversó con la usuaria sobre herramientas alternativas para no quedar completamente frenados por ese bloqueo.

**Alternativas evaluadas y descartadas para reemplazar/evitar el problema de Meta específicamente**:
- **Zapier**: tiene integraciones pre-aprobadas de partner para Instagram/Facebook/LinkedIn/YouTube/TikTok — conectando por el OAuth propio de Zapier (no nuestra app de Meta) probablemente evita el gate de Business Manager, pero cambia la dependencia a la cuenta/plan de Zapier en vez de tener el código de la integración en este repo.
- **n8n**: se descartó como atajo para Meta puntualmente — n8n no tiene una integración de partner pre-aprobada como Zapier para Instagram/Facebook; llamaría a la Graph API cruda vía HTTP Request, necesitando la misma app propia de Meta con los mismos permisos que ya nos bloquean. Sí serviría como capa de orquestación general (ej. "cuando una pieza pasa a listo → publicar → actualizar la DB"), pero no resuelve el problema puntual de Meta.
- La usuaria mencionó que ya tiene n8n disponible (no aclaró si self-hosted o cloud, ni si ya está en uso en Mastery Haus para otra cosa) — **no se decidió usarlo todavía**, queda anotado como opción a evaluar más adelante, sin acción concreta por ahora.

**Decisión — orden de plataformas a partir de acá**: en vez de esperar a que se resuelva el permiso de Meta, se prioriza sumar publicación real a otras plataformas que no dependen de ese bloqueo específico, en este orden:
1. **YouTube** (Data API v3) — API propia de Google, sin nada equivalente al Business Manager de Meta bloqueando. Nueva Fase 5C en TODO.md, sin arrancar.
2. **LinkedIn** — con la salvedad de que publicar a una Página de empresa (no un perfil personal) sí exige su propia aprobación de partner de LinkedIn, con una fricción similar a la de Meta; hay que confirmar esto al arrancar la fase antes de asumir que no tiene el mismo problema. Nueva Fase 5D en TODO.md, sin arrancar.
3. Recién después se retoma Fase 5 (Meta), cuando la usuaria resuelva el permiso de Business Manager.

- **Por qué**: no tiene sentido bloquear todo el avance de publicación real esperando un permiso que no depende del equipo de desarrollo — YouTube en particular no comparte ese cuello de botella y puede arrancar ya.
- **Alcance de YouTube y LinkedIn**: todavía sin definir en detalle (queda para cuando se arranque cada fase) — ver los checklists iniciales en Fase 5C/5D de TODO.md.

---

## 2026-09-08 — Decisión 12: migración del contenido que el jefe acumuló en su Artifact (Sofia Contreras)

**Contexto**: mientras se construía esta app, el jefe de la usuaria seguía usando directo el Artifact original de `mockup.html` (no la app nueva) para cargar contenido real día a día. Había acumulado así 145 piezas reales (28 de agosto al 9 de septiembre) que había que migrar a la base real antes de que él pudiera pasarse a usar esta app.

**Decisión — formato de exportación**: en vez de pedirle al jefe que exporte JSON a mano (requeriría abrir consola del navegador o ver código fuente, poco práctico para alguien no técnico), se usó el botón **"Exportar CSV"** que ya viene incorporado en el diseño original del mockup (`buildCsv()`/`exportCsv()` en `mockup.html`, vía `window.claude.use('downloads')` — funciona dentro del runtime de un Artifact real, a diferencia de la app nueva donde tuvo que reemplazarse por un Blob del navegador, ver Fase 2 en TODO.md). Un solo click, cero pasos técnicos para el jefe.

**Problema del CSV**: `buildCsv()` exporta **etiquetas en español** (labels de `PLATFORM_META`/`FORMAT_LABEL`/`STATUS_META`), no los códigos internos que la DB espera (`instagram`, `pendiente`, `REEL`, etc.). Se escribió `scripts/import-csv.mjs`, que:
- Parsea el CSV con un parser RFC4180 mínimo escrito a mano (comillas dobles para escapar comas/saltos de línea/comillas internas — mismo escaping que ya hace `csvEscape()` en el mockup, sin necesitar una librería).
- Revierte las etiquetas a códigos internos importando directamente `PLATFORM_META`/`FORMAT_LABEL`/`STATUS_META` de `src/lib/pieces.ts` (vía `node --experimental-strip-types`, sin duplicar el mapeo a mano en el script) — así el mapeo nunca se desincroniza de la fuente real usada por la app.
- Formato (`Formato`) revierte a código fijo solo si la etiqueta matchea uno conocido; si no (campos libres, como los nombres de campaña de Email Marketing: "Venta GTA", "Captación Gana tu día"), se deja el texto tal cual — coherente con que ese campo es freeform para esa plataforma.
- Soporta `--dry-run` para ver una muestra de las piezas mapeadas antes de insertar de verdad.

**Marca de destino**: se confirmó con la usuaria que las 145 piezas de este export son enteramente de la marca **Sofia Contreras** — el CSV no distingue marca en ningún campo (ni siquiera aparece la etiqueta "Instagram MH"), así que no había forma de inferirlo automáticamente; hacía falta la confirmación explícita. La marca Sofia Contreras estaba vacía (0 piezas) antes de este import, así que no hubo riesgo de duplicados. Se verificó además que ninguna fila del CSV coincide con las 2 piezas de email que ya existían en Mastery Haus (Decisión 8/9) — son contenido distinto, sin superposición.

**Resultado**: 145 piezas insertadas, verificadas contra la DB real (conteo total y distribución por plataforma/estado coinciden exactamente con lo calculado del CSV antes de insertar). Dos observaciones de calidad de datos que se importaron tal cual (no se "corrigieron" sin confirmar con la usuaria): 122 de 123 piezas marcadas "Publicado" no tienen el link real cargado en "Link publicado", y 3 piezas de Email Marketing tienen el formato "Venga GTA" que probablemente sea un typo de "Venta GTA" (20 piezas) — pendiente de confirmar.

**El CSV no se versiona**: el repo es público (`github.com/Mastery-Haus/mh-content-planner`) y el archivo contiene copy real de marketing — se agregó `*.csv` a `.gitignore` y se borró el archivo local una vez confirmado el import. El script `scripts/import-csv.mjs` sí quedó commiteado (reutilizable para futuros imports, sin datos reales adentro).
