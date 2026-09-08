-- Fase 5B: integración real con GoHighLevel para piezas de Email Marketing.
-- Ver DECISIONS.md (Decisión 6) para el contexto de esta integración.
--
-- `material` se reutiliza para las piezas de plataforma 'email' como el link del botón
-- CTA (ya no tenía otro uso ahí) — no hace falta columna nueva para eso. Sí hacen falta:
--   cta_label:       texto visible del botón (p.ej. "QUIERO GANAR MI AÑO →").
--   ghl_template_id: id de la plantilla ya creada en GoHighLevel para esta pieza, si la hay.

alter table public.pieces
  add column if not exists cta_label text not null default '',
  add column if not exists ghl_template_id text not null default '';
