"use client";

import { useEffect, useMemo, useState } from "react";
import { buildEmailHtml } from "@/lib/email-template";
import type { Piece } from "@/lib/pieces";

interface Props {
  piece: Piece;
  onClose: () => void;
  onFieldChange: (id: string, patch: Partial<Piece>) => void;
  onSavePiece: (id: string) => Promise<boolean>;
}

// Vista previa del mail real (el mismo HTML que se sube a GoHighLevel) con un modo de
// edición manual — ver DECISIONS.md Decisión 10. El HTML editado a mano se guarda aparte
// (email_html_override) y no se pisa solo con ediciones de Copy/CTA.
export default function EmailPreviewModal({ piece, onClose, onFieldChange, onSavePiece }: Props) {
  const hasOverride = !!piece.email_html_override.trim();
  const autoHtml = useMemo(
    () => buildEmailHtml({ bodyText: piece.copy, ctaUrl: piece.material, ctaLabel: piece.cta_label }),
    [piece.copy, piece.material, piece.cta_label]
  );
  const currentHtml = hasOverride ? piece.email_html_override : autoHtml;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentHtml);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function startEditing() {
    setDraft(currentHtml);
    setEditing(true);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      onFieldChange(piece.id, { email_html_override: draft });
      await onSavePiece(piece.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToAuto() {
    setSaving(true);
    try {
      onFieldChange(piece.id, { email_html_override: "" });
      await onSavePiece(piece.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal-wide">
        <h2>Vista previa del mail</h2>
        {hasOverride && !editing && (
          <p className="preview-note">
            Estás viendo un HTML editado a mano — los cambios en Copy o CTA ya no lo afectan hasta que toques
            &quot;Volver a generar automático&quot;.
          </p>
        )}
        {editing ? (
          <textarea
            className="html-editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <iframe className="email-preview-frame" srcDoc={currentHtml} sandbox="" title="Vista previa del mail" />
        )}
        <div className="modal-actions">
          {editing ? (
            <>
              <button className="btn subtle" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Guardando…" : "Guardar edición"}
              </button>
            </>
          ) : (
            <>
              {hasOverride && (
                <button className="btn subtle" onClick={handleResetToAuto} disabled={saving}>
                  {saving ? "Restaurando…" : "Volver a generar automático"}
                </button>
              )}
              <button className="btn subtle" onClick={startEditing} disabled={saving}>
                Editar HTML
              </button>
              <button className="btn primary" onClick={onClose}>
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
