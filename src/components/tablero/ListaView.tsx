import type { CSSProperties } from "react";
import Icon from "./Icon";
import { useArmedDelete } from "./useArmedDelete";
import {
  ESTADOS,
  FORMAT_LABEL,
  PLATFORMS,
  PLATFORM_META,
  STATUS_META,
  WD,
  normalizeUrl,
  pad2,
  parseDateLocal,
  type Estado,
  type Piece,
  type Platform,
} from "@/lib/pieces";

const MINI_FIELDS: Array<[keyof Piece, string, string]> = [
  ["copy", "i-copy", "Copy"],
  ["material", "i-material", "Material"],
  ["portada", "i-portada", "Portada"],
  ["notas", "i-notas", "Notas"],
];

interface Props {
  pieces: Piece[];
  filtered: Piece[];
  onDelete: (id: string) => void;
  filtersOpen: boolean;
  onToggleFiltersOpen: () => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  platforms: Set<Platform>;
  onTogglePlatform: (p: Platform) => void;
  estados: Set<Estado>;
  onToggleEstado: (e: Estado) => void;
}

function DeleteCell({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  const { armed, handleClick } = useArmedDelete(() => onDelete(id));
  return (
    <button className={"mlink-del" + (armed ? " armed" : "")} title={armed ? "Tocá de nuevo para confirmar" : "Eliminar pieza"} onClick={handleClick}>
      <Icon name="i-trash" />
    </button>
  );
}

export default function ListaView({
  pieces,
  filtered,
  onDelete,
  filtersOpen,
  onToggleFiltersOpen,
  filtersActive,
  onClearFilters,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  platforms,
  onTogglePlatform,
  estados,
  onToggleEstado,
}: Props) {
  if (!pieces.length) {
    return (
      <div className="empty-month">
        <p>No hay piezas planificadas todavía.</p>
      </div>
    );
  }

  return (
    <div className="lista-view">
      <div className="lista-toolbar">
        <button
          className={"btn subtle" + (filtersActive ? " filter-btn-active" : "")}
          onClick={onToggleFiltersOpen}
          aria-expanded={filtersOpen}
        >
          <Icon name="i-filter" />
          Filtrar
          {filtersActive && <span className="filter-dot" />}
        </button>
        <span className="lista-filters-count">
          {filtered.length} de {pieces.length} {pieces.length === 1 ? "pieza" : "piezas"}
        </span>
        {filtersActive && (
          <button className="btn subtle filter-clear" onClick={onClearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="lista-filters">
          <div className="lista-filters-row">
            <div className="field-inline">
              <label>Desde</label>
              <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
            </div>
            <div className="field-inline">
              <label>Hasta</label>
              <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
            </div>
          </div>
          <div className="lista-filters-row chips">
            {PLATFORMS.map((pf) => {
              const meta = PLATFORM_META[pf];
              const active = platforms.has(pf);
              return (
                <button key={pf} className="filter-chip" data-active={active} onClick={() => onTogglePlatform(pf)}>
                  <Icon name={meta.icon} className="picon-sm" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="lista-filters-row chips">
            {ESTADOS.map((es) => {
              const meta = STATUS_META[es];
              const active = estados.has(es);
              const style = {
                "--chip-color": `var(--st-${meta.cls})`,
                "--chip-bg": `var(--st-${meta.cls}-bg)`,
              } as CSSProperties;
              return (
                <button
                  key={es}
                  className="filter-chip status"
                  data-active={active}
                  style={style}
                  onClick={() => onToggleEstado(es)}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-month">
          <p>Ninguna pieza coincide con estos filtros.</p>
          <button className="btn primary" onClick={onClearFilters}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="lista">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plataforma</th>
                <th>Ángulo</th>
                <th>Estado</th>
                <th>Contenido</th>
                <th>Link</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pf = PLATFORM_META[p.platform] ?? PLATFORM_META.instagram;
                const st = STATUS_META[p.estado] ?? STATUS_META.pendiente;
                const d = parseDateLocal(p.date);
                const publicadoUrl = normalizeUrl(p.publicado);
                return (
                  <tr key={p.id}>
                    <td className="tnum">
                      {WD[d.getDay()]} {pad2(d.getDate())}/{pad2(d.getMonth() + 1)}
                    </td>
                    <td>
                      <div className="cell-platform-stack">
                        <span className="cell-platform">
                          <Icon name={pf.icon} className="picon-sm" />
                          {pf.label}
                        </span>
                        <span className="cell-format-sub">{FORMAT_LABEL[p.format] || p.format}</span>
                      </div>
                    </td>
                    <td className="cell-angle">
                      <span className={"truncate" + (p.angle ? "" : " empty")}>{p.angle || "Sin ángulo"}</span>
                    </td>
                    <td>
                      <span className={"pill " + st.cls}>{st.label}</span>
                    </td>
                    <td>
                      <span className="mini-links">
                        {MINI_FIELDS.map(([key, icon, label]) => {
                          const val = p[key] as string;
                          const filled = !!(val && val.trim());
                          return (
                            <span
                              className={"mlink" + (filled ? " filled" : "")}
                              title={filled ? `${label} cargado` : `Sin ${label.toLowerCase()}`}
                              key={key}
                            >
                              <Icon name={icon} />
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td>
                      {publicadoUrl ? (
                        <a className="mlink filled" href={publicadoUrl} target="_blank" rel="noopener noreferrer" title="Abrir link publicado">
                          <Icon name="i-open" />
                        </a>
                      ) : (
                        <span className="mlink" title="Sin link publicado">
                          <Icon name="i-open" />
                        </span>
                      )}
                    </td>
                    <td>
                      <DeleteCell id={p.id} onDelete={onDelete} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
