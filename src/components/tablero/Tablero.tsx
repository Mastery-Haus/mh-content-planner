"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import AgendaView from "./AgendaView";
import IconSprite from "./IconSprite";
import Icon from "./Icon";
import ListaView from "./ListaView";
import NewPieceModal from "./NewPieceModal";
import StatsStrip from "./StatsStrip";
import Toast, { type ToastMessage } from "./Toast";
import {
  ALL_BRANDS_SLUG,
  ESTADOS,
  FORMAT_LABEL,
  MO_FULL,
  PLATFORMS,
  PLATFORM_META,
  STATUS_META,
  monthKey,
  pad2,
  toDateInputValue,
  type Estado,
  type Piece,
  type Platform,
} from "@/lib/pieces";

interface Props {
  brands: { id: string; slug: string; name: string }[];
  currentBrandSlug: string;
  initialPieces: Piece[];
  // "Hoy" calculado en el servidor al momento del render (string YYYY-MM-DD). Sirve como
  // snapshot de servidor para useSyncExternalStore (ver más abajo) — evita el hydration
  // mismatch que daría llamar `new Date()` directo en el render, que difiere de forma
  // previsible cuando el servidor corre en otra zona horaria que el visitante (p.ej.
  // Vercel en UTC vs. Argentina).
  serverToday: string;
  logoutAction: () => Promise<void>;
}

type SaveState = "saved" | "pending" | "saving" | "error";
type ViewMode = "agenda" | "lista";
type YearMonth = { y: number; m: number };

function csvEscape(v: string | null | undefined): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function yearMonthOf(dateStr: string): YearMonth {
  const [y, m] = monthKey(dateStr).split("-").map(Number);
  return { y, m };
}

const MAX_AUTO_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1500;
const RETRY_MAX_DELAY_MS = 15000;

function noopSubscribe() {
  return () => {};
}
function getClientToday() {
  return toDateInputValue(new Date());
}

export default function Tablero({ brands, currentBrandSlug, initialPieces, serverToday, logoutAction }: Props) {
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  // Hidration-safe: usa serverToday para el render del servidor y la primera pasada del
  // cliente (deben coincidir exactamente), y React sincroniza el valor real del navegador
  // apenas termina de hidratar — sin el mismatch que daría llamar new Date() directo acá.
  const todayStr = useSyncExternalStore(noopSubscribe, getClientToday, () => serverToday);
  // Mes que el usuario navegó manualmente (prev/next), si lo hizo; si no, se muestra el
  // mes de "hoy" derivado de todayStr (así no hace falta un efecto para inicializarlo).
  const [monthOverride, setMonthOverride] = useState<YearMonth | null>(null);
  const currentMonth = monthOverride ?? yearMonthOf(todayStr);
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  // Filtros de la vista Lista — independientes del mes de Agenda (ver DECISIONS.md).
  // Colapsados por defecto: no tiene sentido mostrar tanto control siempre visible.
  const [listaFiltersOpen, setListaFiltersOpen] = useState(false);
  const [listaDateFrom, setListaDateFrom] = useState("");
  const [listaDateTo, setListaDateTo] = useState("");
  const [listaPlatforms, setListaPlatforms] = useState<Set<Platform>>(() => new Set(PLATFORMS));
  const [listaEstados, setListaEstados] = useState<Set<Estado>>(() => new Set(ESTADOS));
  const [modalOpen, setModalOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("Guardado");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [forceOpenId, setForceOpenId] = useState<string | null>(null);

  const pendingPatches = useRef<Map<string, Partial<Piece>>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlightCount = useRef(0);
  const retryAttempts = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((text: string) => {
    setToast({ text, id: Date.now() + Math.random() });
  }, []);

  // Se consume una sola vez: alcanza para forzar la apertura en el mount inicial de la
  // pieza recién creada/duplicada (los efectos hijos corren antes que este), y luego se
  // limpia para que un remount posterior (p.ej. cambiar de vista) no la vuelva a abrir.
  useEffect(() => {
    if (!forceOpenId) return;
    const t = setTimeout(() => setForceOpenId(null), 50);
    return () => clearTimeout(t);
  }, [forceOpenId]);

  function recomputeSaveStatus(errorMessage?: string) {
    if (errorMessage) {
      setSaveState("error");
      setSaveMessage(errorMessage);
      return;
    }
    if (inFlightCount.current > 0) {
      setSaveState("saving");
      setSaveMessage("Guardando…");
      return;
    }
    if (pendingPatches.current.size > 0) {
      setSaveState("pending");
      setSaveMessage("Cambios sin guardar");
      return;
    }
    setSaveState("saved");
    setSaveMessage("Guardado");
  }

  // Solo se usa en la vista "Todas las marcas" (Decisión 13), para poder mostrar de qué
  // marca es cada pieza — en cualquier otra vista se pasa `null` y no se muestra nada.
  const brandNameById = useMemo(() => {
    if (currentBrandSlug !== ALL_BRANDS_SLUG) return null;
    return Object.fromEntries(brands.map((b) => [b.id, b.name]));
  }, [brands, currentBrandSlug]);

  const monthPieces = useMemo(() => {
    const mk = currentMonth.y + "-" + pad2(currentMonth.m);
    return pieces.filter((p) => monthKey(p.date) === mk);
  }, [pieces, currentMonth]);

  const listaFilteredPieces = useMemo(() => {
    return pieces
      .filter((p) => (!listaDateFrom || p.date >= listaDateFrom) && (!listaDateTo || p.date <= listaDateTo))
      .filter((p) => listaPlatforms.has(p.platform) && listaEstados.has(p.estado))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [pieces, listaDateFrom, listaDateTo, listaPlatforms, listaEstados]);

  const listaFiltersActive =
    listaDateFrom !== "" ||
    listaDateTo !== "" ||
    listaPlatforms.size < PLATFORMS.length ||
    listaEstados.size < ESTADOS.length;

  function clearListaFilters() {
    setListaDateFrom("");
    setListaDateTo("");
    setListaPlatforms(new Set(PLATFORMS));
    setListaEstados(new Set(ESTADOS));
  }

  function toggleListaPlatform(pf: Platform) {
    setListaPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(pf)) next.delete(pf);
      else next.add(pf);
      return next;
    });
  }

  function toggleListaEstado(es: Estado) {
    setListaEstados((prev) => {
      const next = new Set(prev);
      if (next.has(es)) next.delete(es);
      else next.add(es);
      return next;
    });
  }

  // En Lista, los contadores reflejan lo que la tabla efectivamente muestra (con sus
  // propios filtros) en vez del mes de Agenda — para que nunca "mientan" mostrando 0
  // mientras la tabla de abajo tiene datos de otro mes.
  const statsPieces = viewMode === "lista" ? listaFilteredPieces : monthPieces;

  function updateLocal(id: string, patch: Partial<Piece>) {
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function flushPiece(id: string): Promise<boolean> {
    const patch = pendingPatches.current.get(id);
    if (!patch) return true;
    pendingPatches.current.delete(id);
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);

    inFlightCount.current++;
    recomputeSaveStatus();
    try {
      const res = await fetch(`/api/pieces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el cambio");
      }
    } catch (err) {
      const existing = pendingPatches.current.get(id) || {};
      pendingPatches.current.set(id, { ...patch, ...existing });
      inFlightCount.current--;

      const attempt = (retryAttempts.current.get(id) ?? 0) + 1;
      retryAttempts.current.set(id, attempt);
      if (attempt <= MAX_AUTO_RETRIES) {
        const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        timers.current.set(
          id,
          setTimeout(() => flushPiece(id), delay)
        );
        recomputeSaveStatus(`No se pudo guardar — reintentando (${attempt}/${MAX_AUTO_RETRIES})…`);
      } else {
        showToast("No se pudo guardar un cambio después de varios intentos — revisá tu conexión y tocá Guardar.");
        recomputeSaveStatus((err as Error).message);
      }
      return false;
    }
    retryAttempts.current.delete(id);
    inFlightCount.current--;
    recomputeSaveStatus();
    return true;
  }

  // Guardado manual de UNA pieza puntual (botón "Guardar" en su detalle) — reinicia el
  // contador de reintentos (como flushAll) y devuelve si quedó efectivamente guardada,
  // para que el botón pueda mostrar una confirmación visual clara ahí mismo.
  async function savePieceNow(id: string): Promise<boolean> {
    retryAttempts.current.delete(id);
    return flushPiece(id);
  }

  function queuePatch(id: string, patch: Partial<Piece>) {
    updateLocal(id, patch);
    retryAttempts.current.delete(id);
    const existing = pendingPatches.current.get(id) || {};
    pendingPatches.current.set(id, { ...existing, ...patch });
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.set(
      id,
      setTimeout(() => flushPiece(id), 600)
    );
    recomputeSaveStatus();
  }

  function flushAll() {
    const ids = Array.from(pendingPatches.current.keys());
    if (ids.length === 0) {
      showToast("Ya está todo guardado.");
      return;
    }
    // Un reintento manual arranca la cuenta de reintentos de nuevo — el usuario acaba de
    // pedir explícitamente que se guarde, así que merece un ciclo completo de backoff.
    ids.forEach((id) => retryAttempts.current.delete(id));
    ids.forEach((id) => flushPiece(id));
  }

  async function addPiece(date: string, platform: Platform, format: string, angle: string, brandSlug: string) {
    try {
      const res = await fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, platform, format, angle, brand_slug: brandSlug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo crear la pieza");
      }
      const { piece } = (await res.json()) as { piece: Piece };
      setPieces((prev) => [...prev, piece]);
      setMonthOverride(yearMonthOf(piece.date));
      setForceOpenId(piece.id);
    } catch (err) {
      showToast((err as Error).message || "No se pudo crear la pieza.");
    }
  }

  async function removePiece(id: string) {
    const backup = pieces;
    setPieces((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/pieces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar la pieza");
      showToast("Pieza eliminada.");
    } catch (err) {
      setPieces(backup);
      showToast((err as Error).message || "No se pudo eliminar la pieza.");
    }
  }

  async function duplicatePiece(id: string) {
    const source = pieces.find((p) => p.id === id);
    if (!source) return;
    try {
      const res = await fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: source.date,
          platform: source.platform,
          format: source.format,
          angle: source.angle,
          copy: source.copy,
          material: source.material,
          portada: source.portada,
          notas: source.notas,
          cta_label: source.cta_label,
          // brand_id directo (no brand_slug): duplicar siempre va a la misma marca que
          // el original, sin depender de cuál sea "la marca actual" — importa en la
          // vista "Todas las marcas", donde eso es ambiguo. Ver Decisión 13.
          brand_id: source.brand_id,
        }),
      });
      if (!res.ok) throw new Error("No se pudo duplicar la pieza");
      const { piece } = (await res.json()) as { piece: Piece };
      setPieces((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        const next = [...prev];
        next.splice(idx + 1, 0, piece);
        return next;
      });
      setForceOpenId(piece.id);
      showToast("Pieza duplicada — ajustá la plataforma y el copy.");
    } catch (err) {
      showToast((err as Error).message || "No se pudo duplicar la pieza.");
    }
  }

  async function createGhlTemplate(id: string) {
    try {
      const res = await fetch(`/api/pieces/${id}/ghl-template`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No se pudo crear la plantilla en GoHighLevel");
      updateLocal(id, { ghl_template_id: body.templateId });
      showToast("Plantilla creada en GoHighLevel — terminá el envío (lista y programación) desde ahí.");
    } catch (err) {
      showToast((err as Error).message || "No se pudo crear la plantilla en GoHighLevel.");
    }
  }

  function handleAddToDay(date: string) {
    // En la vista "Todas las marcas" no hay una marca "actual" de la que partir — el
    // botón de alta rápida por día queda oculto ahí (ver AgendaView), esto es solo
    // defensivo por si se llegara a invocar igual.
    if (currentBrandSlug === ALL_BRANDS_SLUG) return;
    addPiece(date, "instagram", "REEL", "", currentBrandSlug);
  }

  function goPrevMonth() {
    setMonthOverride((prev) => {
      const base = prev ?? currentMonth;
      const m = base.m - 1;
      return m < 1 ? { y: base.y - 1, m: 12 } : { y: base.y, m };
    });
  }
  function goNextMonth() {
    setMonthOverride((prev) => {
      const base = prev ?? currentMonth;
      const m = base.m + 1;
      return m > 12 ? { y: base.y + 1, m: 1 } : { y: base.y, m };
    });
  }

  function buildCsv(): string {
    const header = ["Fecha", "Plataforma", "Formato", "Ángulo", "Copy", "Material", "Portada", "Estado", "Notas", "Link publicado"];
    const sorted = [...pieces].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const lines = [header.join(",")];
    sorted.forEach((p) => {
      const pf = PLATFORM_META[p.platform];
      const st = STATUS_META[p.estado as Estado];
      lines.push(
        [
          p.date,
          pf?.label || p.platform,
          FORMAT_LABEL[p.format] || p.format,
          p.angle,
          p.copy,
          p.material,
          p.portada,
          st?.label || p.estado,
          p.notas,
          p.publicado,
        ]
          .map(csvEscape)
          .join(",")
      );
    });
    return lines.join("\r\n");
  }

  function exportCsv() {
    const csv = "﻿" + buildCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tablero-contenidos.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV descargado.");
  }

  return (
    <div className="app">
      <IconSprite />

      <header className="topbar">
        <div className="heading">
          <select
            className="kicker brand-select"
            value={currentBrandSlug}
            onChange={(e) => router.push(`/?brand=${e.target.value}`)}
            aria-label="Marca"
          >
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
            <option value={ALL_BRANDS_SLUG}>Todas las marcas</option>
          </select>
          <h1>Tablero de Salida</h1>
          <div className="save-status" data-state={saveState}>
            <span className="dot" />
            <span className="txt">{saveMessage}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn save-cta" onClick={flushAll}>
            <Icon name="i-save" />
            <span className="btn-label">Guardar</span>
          </button>
          <button className="btn subtle" onClick={exportCsv}>
            <Icon name="i-download" />
            Exportar CSV
          </button>
          <button className="btn primary" onClick={() => setModalOpen(true)}>
            <Icon name="i-plus" />
            Nueva pieza
          </button>
          <form action={logoutAction}>
            <button className="btn subtle" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <div className="controls-row">
        <div className="month-nav">
          <button aria-label="Mes anterior" onClick={goPrevMonth}>
            <Icon name="i-chevron-left" />
          </button>
          <span className="month-label tnum">
            {MO_FULL[currentMonth.m - 1]} {currentMonth.y}
          </span>
          <button aria-label="Mes siguiente" onClick={goNextMonth}>
            <Icon name="i-chevron" />
          </button>
        </div>
        <div className="segmented">
          <button className={viewMode === "agenda" ? "active" : ""} onClick={() => setViewMode("agenda")}>
            Agenda
          </button>
          <button className={viewMode === "lista" ? "active" : ""} onClick={() => setViewMode("lista")}>
            Lista
          </button>
        </div>
      </div>

      <StatsStrip pieces={statsPieces} />

      <main>
        {viewMode === "agenda" ? (
          <AgendaView
            pieces={monthPieces}
            todayStr={todayStr}
            forceOpenId={forceOpenId}
            onFieldChange={queuePatch}
            onDelete={removePiece}
            onDuplicate={duplicatePiece}
            onAddToDay={handleAddToDay}
            onOpenModal={() => setModalOpen(true)}
            onCreateGhlTemplate={createGhlTemplate}
            onSavePiece={savePieceNow}
            brandNameById={brandNameById}
          />
        ) : (
          <ListaView
            pieces={pieces}
            filtered={listaFilteredPieces}
            onDelete={removePiece}
            filtersOpen={listaFiltersOpen}
            onToggleFiltersOpen={() => setListaFiltersOpen((v) => !v)}
            filtersActive={listaFiltersActive}
            onClearFilters={clearListaFilters}
            dateFrom={listaDateFrom}
            onDateFromChange={setListaDateFrom}
            dateTo={listaDateTo}
            onDateToChange={setListaDateTo}
            platforms={listaPlatforms}
            onTogglePlatform={toggleListaPlatform}
            estados={listaEstados}
            onToggleEstado={toggleListaEstado}
            brandNameById={brandNameById}
          />
        )}
      </main>

      <footer className="app-footer">
        <Link href="/ayuda">Cómo funciona el Tablero</Link>
      </footer>

      <button className="fab" aria-label="Nueva pieza" onClick={() => setModalOpen(true)}>
        <Icon name="i-plus" />
      </button>

      {modalOpen && (
        <NewPieceModal
          brands={brands}
          defaultBrandSlug={currentBrandSlug}
          onClose={() => setModalOpen(false)}
          onSubmit={(date, platform, format, angle, brandSlug) => {
            addPiece(date, platform, format, angle, brandSlug);
            setModalOpen(false);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
