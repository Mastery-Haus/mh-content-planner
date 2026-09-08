import Link from "next/link";
import { ESTADOS, PLATFORM_META, PLATFORMS, STATUS_META } from "@/lib/pieces";

// Descripción "en criollo" de cada estado — el label/color oficial sale de STATUS_META
// (misma fuente que usa el resto de la app), así que si un estado cambia de nombre o de
// color acá se actualiza solo. Solo esta descripción hay que tocarla a mano.
const ESTADO_DESC: Record<(typeof ESTADOS)[number], string> = {
  pendiente: "Todavía no se empezó.",
  produccion: "Se está grabando, diseñando o escribiendo.",
  listo: "Terminado, esperando el día de salir.",
  publicado: "Ya salió a la calle.",
  error: "Quedó trabado — falta algo para poder avanzarla (no es un error de guardado del Tablero).",
};

export default function AyudaPage() {
  return (
    <div className="help">
      <Link href="/" className="help-back">
        ← Volver al Tablero
      </Link>

      <div className="help-head">
        <div className="help-eyebrow">SOP · Tablero de Salida</div>
        <h1>Cómo funciona el Tablero</h1>
        <p className="help-lede">
          Esto es un instructivo corto (un &quot;SOP&quot;: Procedimiento Operativo Estándar — un
          instructivo escrito para que cualquiera pueda hacer algo siempre de la misma forma, sin
          tener que preguntar cada vez). Se va actualizando a medida que la app suma o saca
          funcionalidad, así que siempre refleja lo que hay hoy. No hace falta saber nada técnico
          para seguirlo.
        </p>
      </div>

      <section className="help-section">
        <h2>Para quién es esto</h2>
        <p className="help-muted">Cualquiera que cargue o revise contenido de Mastery Haus o de Sofia Contreras.</p>
        <div className="help-chips">
          <div className="help-chip">
            <div className="who">Vos (Ona)</div>
            <div className="why">Armás el contenido y administrás las cuentas del equipo.</div>
          </div>
          <div className="help-chip">
            <div className="who">Juan</div>
            <div className="why">Colaborador con acceso propio para cargar y revisar piezas.</div>
          </div>
          <div className="help-chip">
            <div className="who">El jefe</div>
            <div className="why">Contenido de Sofia Contreras — la idea es que use esta app en vez de la versión anterior.</div>
          </div>
          <div className="help-chip">
            <div className="who">Quien se sume después</div>
            <div className="why">Esta página le sirve para arrancar sin que nadie se lo tenga que explicar de cero.</div>
          </div>
        </div>
      </section>

      <section className="help-section">
        <h2>Qué es (y para qué sirve)</h2>
        <p>
          Es un <b>calendario de contenido compartido</b>: un solo lugar donde se anota qué se
          publica, cuándo, en qué red, y en qué estado está cada pieza — un reel, un carrusel, un
          posteo, un mail, lo que sea.
        </p>
        <p className="help-muted">
          Los datos quedan guardados en una base de datos real: lo que carga una persona lo ve
          cualquier otra al toque, y no se pierde si se cierra la pestaña o se apaga la
          computadora.
        </p>
        <p className="help-muted">
          El objetivo es simple: tener claro qué falta, qué está en camino y qué ya salió, para
          las dos marcas, sin tener que preguntarle a nadie &quot;¿en qué quedó tal posteo?&quot;.
        </p>
      </section>

      <section className="help-section">
        <h2>Quién lo hizo</h2>
        <p>
          Lo construyó <b>Ona</b>, con ayuda de Claude Code, a partir de un diseño (el
          &quot;mockup&quot;) que el equipo ya usaba día a día. La idea fue mantener exactamente
          el mismo aspecto y la misma forma de trabajar, pero con datos reales de verdad detrás.
        </p>
      </section>

      <section className="help-section">
        <h2>Qué hace hoy</h2>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Login con usuario y contraseña — nadie se puede crear una cuenta solo.</span>
        </div>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Selector de marca: Mastery Haus, Sofia Contreras, o las dos juntas (&quot;Todas las marcas&quot;).</span>
        </div>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Dos formas de ver el contenido: Agenda (día por día) y Lista (tabla con filtros).</span>
        </div>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Todo se guarda solo — no existe un botón &quot;Guardar&quot; que te puedas olvidar de tocar.</span>
        </div>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Exportar todo a un archivo CSV (se abre en Excel/Sheets) con un click.</span>
        </div>
        <div className="help-feature done">
          <span className="mark">✓</span>
          <span>Para piezas de Email: arma y sube sola la plantilla a GoHighLevel, lista para programar el envío.</span>
        </div>
        <div className="help-feature soon">
          <span className="mark">→</span>
          <span>
            Publicar solo en Instagram, Facebook, YouTube o LinkedIn: todavía no. Hoy, cuando
            publicás de verdad en la red, tenés que pegar vos el link en el campo
            &quot;Publicado&quot;. Se va sumando de a una red por vez (primero YouTube, después
            LinkedIn, más adelante Instagram/Facebook).
          </span>
        </div>
        <p className="help-muted" style={{ marginTop: 4 }}>
          Plataformas que ya soporta hoy: {PLATFORMS.map((pf) => PLATFORM_META[pf].label).join(", ")}.
        </p>
      </section>

      <section className="help-section">
        <h2>Cómo usarlo, paso a paso</h2>
        <ol className="help-steps">
          <li>
            Entrá con tu usuario y contraseña. ¿No tenés cuenta todavía? Pedísela a Ona — no hay
            forma de crearte una vos mismo.
          </li>
          <li>
            Arriba, elegí qué marca querés ver: Mastery Haus, Sofia Contreras, o &quot;Todas las
            marcas&quot; para ver las dos juntas.
          </li>
          <li>
            Elegí cómo mirar el contenido: Agenda (como un calendario, día por día) o Lista (una
            tabla con todo, con filtros de fecha/red/estado).
          </li>
          <li>
            Tocá una pieza para abrirla y ver o editar sus datos: fecha, red, formato,
            ángulo/título, copy, material, portada, estado, notas y link publicado.
          </li>
          <li>
            Escribí lo que necesites. No apretás nada para guardar: arriba vas a ver un cartelito
            que pasa de &quot;Guardando…&quot; a &quot;Guardado&quot; solo. Si en cambio dice
            &quot;error&quot;, esperá unos segundos (reintenta solo) o tocá el botón
            &quot;Guardar&quot; de esa pieza puntual.
          </li>
          <li>¿Contenido nuevo? Tocá &quot;Nueva pieza&quot; (o el botón &quot;+&quot;), completá los datos y elegí a qué marca pertenece.</li>
          <li>A medida que avanza el trabajo, cambiá el Estado de la pieza: pendiente → en producción → listo → publicado.</li>
          <li>Cuando la pieza salga de verdad (se publique en la red o se envíe el mail), volvé y pegá el link real en el campo &quot;Publicado&quot;.</li>
        </ol>
      </section>

      <section className="help-section">
        <h2>Los estados, en criollo</h2>
        <p className="help-muted">
          Ojo: esto es el <b>estado de la pieza</b> (dónde va cada contenido en el proceso). Es
          distinto del cartelito &quot;Guardando…/Guardado&quot; de arriba, que solo avisa si el
          Tablero guardó bien el cambio en la base de datos.
        </p>
        <div className="help-states">
          {ESTADOS.map((estado) => (
            <div className="help-state-row" key={estado}>
              <span className={`pill ${STATUS_META[estado].cls}`}>{STATUS_META[estado].label}</span>
              <span className="desc">{ESTADO_DESC[estado]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="help-section">
        <h2>Cositas básicas para no meter la pata</h2>
        <div className="help-care">
          <span className="dot" />
          <span>No hay forma de crear tu propia cuenta: si sos nuevo, pedile un usuario a Ona.</span>
        </div>
        <div className="help-care">
          <span className="dot" />
          <span>
            &quot;Material&quot; y &quot;Portada&quot; son links (hoy, de Google Drive) — el
            Tablero no guarda el archivo en sí, solo el link. Si no abre para cualquiera que lo
            reciba, revisalo.
          </span>
        </div>
        <div className="help-care">
          <span className="dot" />
          <span>
            Si estás parado en &quot;Todas las marcas&quot; y creás una pieza nueva, tenés que
            elegir vos a qué marca va — el Tablero no lo adivina.
          </span>
        </div>
        <div className="help-care">
          <span className="dot" />
          <span>Duplicar una pieza siempre la deja en la misma marca que la original.</span>
        </div>
        <div className="help-care">
          <span className="dot" />
          <span>
            Publicar en redes sigue siendo manual: vos publicás en la red, y después pegás el link
            acá. La única excepción es el mail, donde el Tablero arma la plantilla sola (el envío
            final igual se dispara a mano en GoHighLevel).
          </span>
        </div>
        <div className="help-care">
          <span className="dot" />
          <span>Si algo se ve raro o no guarda, avisale a Ona antes de tratar de arreglarlo por tu cuenta.</span>
        </div>
      </section>

      <footer className="help-footer">
        <Link href="/" className="btn primary">
          Volver al Tablero
        </Link>
        <span className="help-muted">¿Dudas o algo no anda? Hablá con Ona.</span>
      </footer>
    </div>
  );
}
