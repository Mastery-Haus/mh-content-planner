"use client";

import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { useArmedDelete } from "./useArmedDelete";
import {
  FORMAT_LABEL,
  FREEFORM_META,
  PLATFORM_META,
  STATUS_META,
  ESTADOS,
  formatsFor,
  normalizeUrl,
  usesFreeformFormat,
  type Piece,
  type Platform,
} from "@/lib/pieces";

interface Props {
  piece: Piece;
  defaultOpen: boolean;
  onFieldChange: (id: string, patch: Partial<Piece>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function LinkField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const url = normalizeUrl(value);
  return (
    <div className="linkfield">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <a
        className={"open-btn" + (url ? "" : " disabled")}
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir link"
      >
        <Icon name="i-open" />
      </a>
    </div>
  );
}

export default function PieceItem({ piece, defaultOpen, onFieldChange, onDelete, onDuplicate }: Props) {
  const { armed, handleClick: handleDeleteClick } = useArmedDelete(() => onDelete(piece.id));
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // No pasamos `open` como prop controlada: así el toggle manual del usuario no se
  // pisa en cada re-render (p.ej. al tipear en otro campo). Solo forzamos la apertura
  // una vez, al montar, para piezas recién creadas/duplicadas.
  useEffect(() => {
    if (defaultOpen && detailsRef.current) detailsRef.current.open = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pf = PLATFORM_META[piece.platform] ?? PLATFORM_META.instagram;
  const st = STATUS_META[piece.estado] ?? STATUS_META.pendiente;

  const mini: Array<[string, string, string, string]> = [
    ["copy", "i-copy", piece.copy, "Copy"],
    ["material", "i-material", piece.material, "Material"],
    ["portada", "i-portada", piece.portada, "Portada"],
    ["notas", "i-notas", piece.notas, "Notas"],
    ["publicado", "i-publicado", piece.publicado, "Link publicado"],
  ];

  function handlePlatformChange(next: Platform) {
    const patch: Partial<Piece> = { platform: next };
    if (usesFreeformFormat(next)) {
      patch.format = "";
    } else if (!formatsFor(next).includes(piece.format)) {
      patch.format = formatsFor(next)[0];
    }
    onFieldChange(piece.id, patch);
  }

  return (
    <details className="piece" ref={detailsRef}>
      <summary>
        <span className="p-platform">
          <Icon name={pf.icon} className="picon" />
          {pf.label}
        </span>
        <span className="p-format">{FORMAT_LABEL[piece.format] || piece.format}</span>
        <span className={"angle" + (piece.angle ? "" : " empty")}>{piece.angle || "Sin ángulo cargado"}</span>
        <span className={"pill " + st.cls}>{st.label}</span>
        <span className="mini-links">
          {mini.map(([key, icon, val, label]) => {
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
        <button
          className="mlink-dup"
          title="Duplicar (para otra plataforma)"
          onClick={(e) => {
            e.preventDefault();
            onDuplicate(piece.id);
          }}
        >
          <Icon name="i-duplicate" />
        </button>
        <button
          className={"mlink-del" + (armed ? " armed" : "")}
          title={armed ? "Tocá de nuevo para confirmar" : "Eliminar pieza"}
          onClick={handleDeleteClick}
        >
          <Icon name="i-trash" />
        </button>
      </summary>

      <div className="piece-detail">
        {piece.estado === "error" && (
          <div className="note-banner">
            Esta pieza está marcada <b>Demorado</b> — revisá qué falta para destrabarla.
          </div>
        )}

        <div className="field-row field-row-3">
          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              value={piece.date}
              onChange={(e) => onFieldChange(piece.id, { date: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Plataforma</label>
            <select
              value={piece.platform}
              onChange={(e) => handlePlatformChange(e.target.value as Platform)}
            >
              {Object.keys(PLATFORM_META).map((k) => (
                <option value={k} key={k}>
                  {PLATFORM_META[k as Platform].label}
                </option>
              ))}
            </select>
          </div>
          {usesFreeformFormat(piece.platform) ? (
            <div className="field">
              <label>{FREEFORM_META[piece.platform]?.label}</label>
              <input
                type="text"
                value={piece.format}
                placeholder={FREEFORM_META[piece.platform]?.placeholder}
                onChange={(e) => onFieldChange(piece.id, { format: e.target.value })}
              />
            </div>
          ) : (
            <div className="field">
              <label>Formato</label>
              <select value={piece.format} onChange={(e) => onFieldChange(piece.id, { format: e.target.value })}>
                {formatsFor(piece.platform).map((k) => (
                  <option value={k} key={k}>
                    {FORMAT_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="field">
          <label>Ángulo / título</label>
          <input type="text" value={piece.angle} onChange={(e) => onFieldChange(piece.id, { angle: e.target.value })} />
        </div>

        <div className="field">
          <label>Copy</label>
          <textarea value={piece.copy} onChange={(e) => onFieldChange(piece.id, { copy: e.target.value })} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Material terminado</label>
            <LinkField
              value={piece.material}
              placeholder="Link a la pieza terminada"
              onChange={(v) => onFieldChange(piece.id, { material: v })}
            />
          </div>
          <div className="field">
            <label>Portada</label>
            <LinkField
              value={piece.portada}
              placeholder="Link a la portada"
              onChange={(v) => onFieldChange(piece.id, { portada: v })}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Estado</label>
            <select value={piece.estado} onChange={(e) => onFieldChange(piece.id, { estado: e.target.value as Piece["estado"] })}>
              {ESTADOS.map((k) => (
                <option value={k} key={k}>
                  {STATUS_META[k].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Link publicado</label>
            <LinkField
              value={piece.publicado}
              placeholder="Se completa al publicar"
              onChange={(v) => onFieldChange(piece.id, { publicado: v })}
            />
          </div>
        </div>

        <div className="field">
          <label>Notas</label>
          <textarea value={piece.notas} onChange={(e) => onFieldChange(piece.id, { notas: e.target.value })} />
        </div>

        <div className="piece-detail-footer">
          <button className="btn subtle" onClick={() => onDuplicate(piece.id)}>
            <Icon name="i-duplicate" />
            Duplicar
          </button>
          <button className="danger-btn" onClick={handleDeleteClick}>
            {armed ? "Confirmar borrado" : "Eliminar pieza"}
          </button>
        </div>
      </div>
    </details>
  );
}
