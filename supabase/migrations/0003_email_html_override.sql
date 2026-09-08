-- Fase 5B (extensión): edición manual del HTML del mail de piezas Email Marketing.
-- Ver DECISIONS.md (Decisión 10) para el contexto.
--
-- email_html_override: si tiene contenido, ese HTML se usa tal cual (tanto en la vista
-- previa como al crear/actualizar la plantilla en GoHighLevel) en vez de regenerarlo desde
-- copy/material/cta_label. Queda vacío por defecto: sin override, todo sigue funcionando
-- exactamente igual que antes de esta migración.

alter table public.pieces
  add column if not exists email_html_override text not null default '';
