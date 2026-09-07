"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  text: string;
  id: number;
}

function ToastBubble({ text }: { text: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);
  return <div className={"toast" + (show ? " show" : "")}>{text}</div>;
}

export default function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return <div className="toast" />;
  return <ToastBubble key={toast.id} text={toast.text} />;
}
