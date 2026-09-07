"use client";

import { useRef, useState } from "react";

// Confirmación de borrado en 2 toques: el primer click "arma" el botón por 4s,
// el segundo (mientras sigue armado) confirma. Igual al mockup.
export function useArmedDelete(onConfirm: () => void) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (armed) {
      onConfirm();
      return;
    }
    setArmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 4000);
  }

  return { armed, handleClick };
}
