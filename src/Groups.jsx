import { useState } from "react";
import { Copy, Dice5, RotateCcw, Shuffle } from "lucide-react";

/* Armado de parejas al azar, sin repetir. Si la cantidad es impar, el último grupo queda de 3.
   Usa crypto.getRandomValues cuando existe (mejor que Math.random para un sorteo). */

const MAX = 200;

function randInt(n) {
  try {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n; // evita el sesgo del módulo
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

/** Saca del pool un grupo de 2 (o de 3 si quedan 3). Devuelve [grupo, pool restante]. */
function drawGroup(pool) {
  const size = pool.length === 3 ? 3 : Math.min(2, pool.length);
  const rest = [...pool];
  const group = [];
  for (let i = 0; i < size; i++) group.push(rest.splice(randInt(rest.length), 1)[0]);
  return [group.sort((a, b) => a - b), rest];
}

export default function Groups() {
  const [raw, setRaw] = useState("24");
  const [names, setNames] = useState("");
  const [state, setState] = useState(null); // { total, pool, groups, labels }

  const list = names.split("\n").map((s) => s.trim()).filter(Boolean);
  const usingNames = list.length > 0;
  const parsed = Math.floor(Number(raw));
  const total = usingNames ? list.length : parsed;
  const valid = Number.isFinite(total) && total >= 2 && total <= MAX;
  const labelOf = (i) => (state?.labels ? state.labels[i - 1] : String(i));

  const start = () => ({ total, pool: range(total), groups: [], labels: usingNames ? list : null });
  // Si cambió la cantidad o los nombres, el sorteo anterior ya no vale
  const current = state && state.total === total && (state.labels ? usingNames : !usingNames) ? state : null;

  const drawOne = () => {
    if (!valid) return;
    const s = current ?? start();
    if (!s.pool.length) return;
    const [g, rest] = drawGroup(s.pool);
    setState({ ...s, pool: rest, groups: [...s.groups, g] });
  };
  const drawAll = () => {
    if (!valid) return;
    let s = start();
    while (s.pool.length) {
      const [g, rest] = drawGroup(s.pool);
      s = { ...s, pool: rest, groups: [...s.groups, g] };
    }
    setState(s);
  };
  const reset = () => setState(null);

  const shown = current;
  const done = shown && shown.pool.length === 0;
  const text = shown ? shown.groups.map((g, i) => `Grupo ${i + 1}: ${g.map(labelOf).join(" y ")}`).join("\n") : "";
  const copy = () => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* sin portapapeles: el docente puede seleccionar el texto a mano */
    }
  };

  return (
    <div>
      <h3 className="ex-title">Armar grupos de 2</h3>
      <p className="eval-note">
        Indicá cuántos estudiantes hay (o pegá la lista de nombres) y sorteá parejas al azar, sin repetir. Si la cantidad
        es impar, el último grupo queda de 3.
      </p>

      <div className="groups-form">
        <label className="groups-field">
          <span className="eval-field__label">Cantidad de estudiantes</span>
          <input
            type="number"
            min={2}
            max={MAX}
            className="ans-input"
            style={{ width: 90 }}
            value={usingNames ? list.length : raw}
            disabled={usingNames}
            onChange={(e) => setRaw(e.target.value)}
          />
        </label>
        <label className="groups-field groups-field--wide">
          <span className="eval-field__label">Nombres (opcional, uno por línea)</span>
          <textarea
            className="groups-names"
            rows={4}
            value={names}
            placeholder={"Si lo dejás vacío se sortean los números 1, 2, 3…"}
            onChange={(e) => setNames(e.target.value)}
          />
        </label>
      </div>

      {!valid && <p className="ans-hint">Ingresá entre 2 y {MAX} estudiantes.</p>}

      <div className="ex-actions" style={{ marginTop: 10 }}>
        <button className="btn btn--primary" onClick={drawOne} disabled={!valid || done}>
          <Dice5 size={14} /> sortear una pareja
        </button>
        <button className="btn btn--ghost" onClick={drawAll} disabled={!valid}>
          <Shuffle size={14} /> {shown ? "sortear todo de nuevo" : "sortear todos los grupos"}
        </button>
        {shown && (
          <>
            <button className="btn btn--ghost" onClick={reset}>
              <RotateCcw size={14} /> reiniciar
            </button>
            <button className="btn btn--ghost" onClick={copy}>
              <Copy size={14} /> copiar
            </button>
          </>
        )}
      </div>

      {shown && (
        <>
          <p className="eval-note" style={{ marginTop: 12 }}>
            {shown.groups.length} {shown.groups.length === 1 ? "grupo" : "grupos"} formados
            {done ? " · todos asignados" : ` · faltan sortear ${shown.pool.length}`}
          </p>
          <div className="groups-grid">
            {shown.groups.map((g, i) => (
              <div className="groups-card" key={i}>
                <div className="groups-card__title">Grupo {i + 1}</div>
                <div className="groups-card__members">
                  {g.map((m) => (
                    <span className="groups-chip" key={m}>
                      {labelOf(m)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
