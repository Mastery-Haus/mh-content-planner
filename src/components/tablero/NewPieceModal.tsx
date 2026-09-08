"use client";

import { useEffect, useState } from "react";
import {
  FORMAT_LABEL,
  FREEFORM_META,
  PLATFORM_META,
  formatsFor,
  toDateInputValue,
  usesFreeformFormat,
  type Platform,
} from "@/lib/pieces";

interface Props {
  brands: { slug: string; name: string }[];
  defaultBrandSlug: string;
  onClose: () => void;
  onSubmit: (date: string, platform: Platform, format: string, angle: string, brandSlug: string) => void;
}

// Se monta/desmonta desde el padre según el estado de apertura del modal — así cada
// apertura es un mount fresco y los campos arrancan con sus valores por defecto sin
// necesitar un efecto que los resetee.
export default function NewPieceModal({ brands, defaultBrandSlug, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [format, setFormat] = useState(() => formatsFor("instagram")[0]);
  const [angle, setAngle] = useState("");
  // defaultBrandSlug puede ser "all" (vista "Todas las marcas", sin marca real) — en ese
  // caso no hay una marca "actual" de la que partir, así que arranca en la primera real.
  const [brandSlug, setBrandSlug] = useState(
    () => brands.find((b) => b.slug === defaultBrandSlug)?.slug ?? brands[0]?.slug ?? ""
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handlePlatformChange(next: Platform) {
    setPlatform(next);
    setFormat(usesFreeformFormat(next) ? "" : formatsFor(next)[0]);
  }

  function handleSubmit() {
    if (!date || !brandSlug) return;
    onSubmit(date, platform, format, angle.trim(), brandSlug);
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h2>Nueva pieza</h2>
        <div className="field">
          <label>Marca</label>
          <select value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)}>
            {brands.map((b) => (
              <option value={b.slug} key={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </div>
        <div className="field-row field-row-3">
          <div className="field">
            <label>Plataforma</label>
            <select value={platform} onChange={(e) => handlePlatformChange(e.target.value as Platform)}>
              {Object.keys(PLATFORM_META).map((k) => (
                <option value={k} key={k}>
                  {PLATFORM_META[k as Platform].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{usesFreeformFormat(platform) ? FREEFORM_META[platform]?.label : "Formato"}</label>
            {usesFreeformFormat(platform) ? (
              <input
                type="text"
                value={format}
                placeholder={FREEFORM_META[platform]?.placeholder}
                onChange={(e) => setFormat(e.target.value)}
              />
            ) : (
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {formatsFor(platform).map((k) => (
                  <option value={k} key={k}>
                    {FORMAT_LABEL[k]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="field">
          <label>Ángulo / título (opcional)</label>
          <input
            type="text"
            value={angle}
            placeholder="Ej: Testimonio Full Day"
            onChange={(e) => setAngle(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn subtle" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={handleSubmit}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
