import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

/* Componentes compartidos por App, GroupedMeasures y Evaluation. */

export function Cell_({ children, state }) {
  return (
    <td className={`fc ${state === "ok" ? "fc--ok" : state === "bad" ? "fc--bad" : ""}`}>
      {children}
    </td>
  );
}

/**
 * hint     (opcional): si la respuesta está mal, muestra "= valor correcto".
 * disabled (opcional): bloquea el campo (se usa al entregar la evaluación).
 */
export function AnswerInput({ value, onChange, state, width = 64, suffix, hint, disabled = false }) {
  return (
    <span className="ans-wrap">
      <input
        type="text"
        className={`ans-input ${state === "ok" ? "ans-input--ok" : state === "bad" ? "ans-input--bad" : ""}`}
        style={{ width }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        disabled={disabled}
      />
      {suffix && <span className="ans-suffix">{suffix}</span>}
      {state === "ok" && <Check size={14} className="ans-icon ans-icon--ok" />}
      {state === "bad" && <X size={14} className="ans-icon ans-icon--bad" />}
      {state === "bad" && hint !== undefined && <span className="ans-hint">= {hint}</span>}
    </span>
  );
}

export function MeasureCard({ label, formula, value, unit, children, open, onToggle }) {
  return (
    <div className="measure-card">
      <div className="measure-card__head" onClick={onToggle}>
        <div>
          <div className="measure-card__label">{label}</div>
          <div className="measure-card__value">
            {value} <span className="measure-card__unit">{unit}</span>
          </div>
        </div>
        <span className="measure-card__toggle">{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="measure-card__body">
          <div className="measure-card__formula">{formula}</div>
          {children}
        </div>
      )}
    </div>
  );
}

/** Datos relevados, con scroll y botón para ordenarlos (útil con muchos datos). */
export function DataBox({ label, data }) {
  const [sorted, setSorted] = useState(false);
  const shown = useMemo(() => (sorted ? [...data].sort((a, b) => a - b) : data), [sorted, data]);
  return (
    <div className="raw-data">
      <div className="raw-data__toolbar">
        <span className="raw-data__label">
          {label} (n = {data.length}):
        </span>
        <button className="btn btn--ghost" onClick={() => setSorted((v) => !v)}>
          {sorted ? "ver como se relevaron" : "ordenar de menor a mayor"}
        </button>
      </div>
      <div className="raw-data__chips raw-data__chips--scroll">
        {shown.map((v, i) => (
          <span className="chip" key={i}>{v}</span>
        ))}
      </div>
    </div>
  );
}
