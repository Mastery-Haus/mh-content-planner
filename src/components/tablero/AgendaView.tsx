"use client";

import { useEffect, useRef } from "react";
import Icon from "./Icon";
import PieceItem from "./PieceItem";
import { MO_SHORT, PLATFORM_META, WD, parseDateLocal, type Piece } from "@/lib/pieces";

interface Props {
  pieces: Piece[];
  todayStr: string;
  forceOpenId: string | null;
  onFieldChange: (id: string, patch: Partial<Piece>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddToDay: (date: string) => void;
  onOpenModal: () => void;
  onCreateGhlTemplate: (id: string) => Promise<void>;
  onSavePiece: (id: string) => Promise<boolean>;
  // Solo en la vista "Todas las marcas" (Decisión 13) — mapa brand_id -> nombre, para
  // taggear de qué marca es cada pieza. `null` en cualquier otra vista.
  brandNameById: Record<string, string> | null;
}

function DayCard({
  date,
  dayPieces,
  isToday,
  forceOpen,
  ...rest
}: {
  date: string;
  dayPieces: Piece[];
  isToday: boolean;
  forceOpen: boolean;
} & Pick<
  Props,
  "forceOpenId" | "onFieldChange" | "onDelete" | "onDuplicate" | "onAddToDay" | "onCreateGhlTemplate" | "onSavePiece" | "brandNameById"
>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (forceOpen && detailsRef.current) detailsRef.current.open = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = parseDateLocal(date);
  const counts: Record<string, number> = { pendiente: 0, produccion: 0, listo: 0, publicado: 0, error: 0 };
  dayPieces.forEach((p) => counts[p.estado]++);
  const platformCounts: Record<string, number> = {};
  dayPieces.forEach((p) => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  return (
    <details className={"day-card" + (isToday ? " today" : "")} ref={detailsRef}>
      <summary>
        <div className="date-block">
          <span className="dnum tnum">{d.getDate()}</span>
          <div className="wdmo">
            <span className="wd">{WD[d.getDay()]}</span>
            <span className="mo">{MO_SHORT[d.getMonth()]}</span>
          </div>
        </div>
        <div className="platform-summary">
          {Object.keys(platformCounts).map((pf) => (
            <span className="chip-mini" key={pf}>
              <Icon name={PLATFORM_META[pf as keyof typeof PLATFORM_META].icon} className="picon-sm" />
              {platformCounts[pf]}
            </span>
          ))}
        </div>
        <div className="status-bar">
          {(["pendiente", "produccion", "listo", "publicado", "error"] as const)
            .filter((k) => counts[k] > 0)
            .map((k) => (
              <span className={`b-${k}`} style={{ width: `${(counts[k] / dayPieces.length) * 100}%` }} key={k} />
            ))}
        </div>
        <span className="day-count">
          {dayPieces.length} {dayPieces.length === 1 ? "pieza" : "piezas"}
        </span>
        <span className="chevron">
          <Icon name="i-chevron" />
        </span>
      </summary>
      <div className="pieces">
        {dayPieces.map((p) => (
          <PieceItem
            key={p.id}
            piece={p}
            defaultOpen={p.id === rest.forceOpenId}
            onFieldChange={rest.onFieldChange}
            onDelete={rest.onDelete}
            onDuplicate={rest.onDuplicate}
            onCreateGhlTemplate={rest.onCreateGhlTemplate}
            onSavePiece={rest.onSavePiece}
            brandName={rest.brandNameById?.[p.brand_id]}
          />
        ))}
      </div>
      <div className="add-piece-row">
        {rest.brandNameById ? (
          <span className="add-piece-hint">Usá &quot;Nueva pieza&quot; arriba para elegir la marca.</span>
        ) : (
          <button onClick={() => rest.onAddToDay(date)}>+ Agregar pieza a este día</button>
        )}
      </div>
    </details>
  );
}

export default function AgendaView({
  pieces,
  todayStr,
  forceOpenId,
  onFieldChange,
  onDelete,
  onDuplicate,
  onAddToDay,
  onOpenModal,
  onCreateGhlTemplate,
  onSavePiece,
  brandNameById,
}: Props) {
  if (!pieces.length) {
    return (
      <div className="empty-month">
        <p>No hay piezas planificadas para este mes todavía.</p>
        <button className="btn primary" onClick={onOpenModal}>
          <Icon name="i-plus" />
          Agregar la primera pieza
        </button>
      </div>
    );
  }

  const byDate = new Map<string, Piece[]>();
  pieces.forEach((p) => {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  });
  const dates = Array.from(byDate.keys()).sort();
  const forcedDate = forceOpenId ? pieces.find((p) => p.id === forceOpenId)?.date : undefined;

  return (
    <div className="rundown">
      {dates.map((date) => (
        <DayCard
          key={date}
          date={date}
          dayPieces={byDate.get(date)!}
          isToday={date === todayStr}
          forceOpen={date === forcedDate}
          forceOpenId={forceOpenId}
          onFieldChange={onFieldChange}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onAddToDay={onAddToDay}
          onCreateGhlTemplate={onCreateGhlTemplate}
          onSavePiece={onSavePiece}
          brandNameById={brandNameById}
        />
      ))}
    </div>
  );
}
