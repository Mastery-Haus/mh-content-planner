import { ESTADOS, STATUS_META, type Piece } from "@/lib/pieces";

export default function StatsStrip({ pieces }: { pieces: Piece[] }) {
  const counts: Record<string, number> = { pendiente: 0, produccion: 0, listo: 0, publicado: 0, error: 0 };
  pieces.forEach((p) => {
    if (counts[p.estado] !== undefined) counts[p.estado]++;
  });

  return (
    <section className="stats-strip">
      {ESTADOS.map((k) => (
        <div className="stat" data-status={k} key={k}>
          <div className="top">
            <span className="swatch" />
            <span className="n tnum">{counts[k]}</span>
          </div>
          <span className="label">{STATUS_META[k].label}</span>
        </div>
      ))}
    </section>
  );
}
