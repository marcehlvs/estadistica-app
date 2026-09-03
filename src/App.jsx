import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Check, X, RotateCcw, Eye, EyeOff, Sparkles } from "lucide-react";

/* ---------------------------------------------------------------- */
/* Datos                                                             */
/* ---------------------------------------------------------------- */

const UNGROUPED_SETS = [
  {
    title: "Hermanos y hermanas",
    prompt: "Se les preguntó a 20 estudiantes de 5° año: ¿cuántos hermanos o hermanas tenés?",
    unit: "hermanos/as",
    data: [1, 0, 2, 1, 3, 0, 1, 2, 2, 1, 0, 1, 4, 1, 2, 1, 0, 3, 1, 2],
  },
  {
    title: "Materias previas",
    prompt: "Cantidad de materias previas que rinden 24 estudiantes de 5° año.",
    unit: "materias",
    data: [0, 1, 0, 2, 0, 0, 1, 3, 0, 1, 2, 0, 0, 1, 1, 0, 2, 0, 1, 0, 3, 0, 1, 2],
  },
  {
    title: "Goles por partido",
    prompt: "Goles convertidos por el equipo del colegio en sus últimos 18 partidos.",
    unit: "goles",
    data: [1, 0, 2, 1, 1, 3, 0, 2, 1, 0, 1, 2, 4, 0, 1, 1, 2, 0],
  },
];

const GROUPED_SETS = [
  {
    title: "Notas del examen de Matemática",
    prompt: "Notas (sobre 100) obtenidas por 30 estudiantes en el último examen.",
    unit: "puntos",
    width: 10,
    data: [45, 62, 78, 55, 90, 38, 71, 66, 84, 59, 73, 48, 95, 61, 52, 77, 68, 83, 44, 91, 57, 64, 72, 39, 86, 50, 69, 75, 58, 80],
  },
  {
    title: "Tiempo de viaje a la escuela",
    prompt: "Minutos que tardan en llegar a la escuela 30 estudiantes de 5° año.",
    unit: "minutos",
    width: 10,
    data: [12, 25, 8, 34, 19, 41, 15, 28, 22, 37, 10, 45, 18, 29, 33, 14, 26, 39, 21, 16, 31, 24, 9, 42, 20, 27, 35, 13, 30, 17],
  },
];

const COLORS = ["#5FA8A0", "#E8B33D", "#D97D7D", "#8FBF7F", "#8C7BC4", "#4F8FBF", "#CB9F5A"];

/* ---------------------------------------------------------------- */
/* Cálculos                                                           */
/* ---------------------------------------------------------------- */

function ungroupedRows(data) {
  const n = data.length;
  const values = [...new Set(data)].sort((a, b) => a - b);
  let cum = 0;
  return values.map((v) => {
    const fi = data.filter((x) => x === v).length;
    cum += fi;
    return { label: String(v), fi, fr: Math.round((fi / n) * 1000) / 10, fa: cum };
  });
}

function getIntervals(data, width) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  let start = Math.floor(min / width) * width;
  let end = Math.ceil(max / width) * width;
  if (end === max) end += width;
  const intervals = [];
  for (let l = start; l < end; l += width) intervals.push([l, l + width]);
  return intervals;
}

function groupedRows(data, width) {
  const n = data.length;
  const intervals = getIntervals(data, width);
  let cum = 0;
  return intervals.map(([l, r], idx) => {
    const isLast = idx === intervals.length - 1;
    const fi = data.filter((x) => (isLast ? x >= l && x <= r : x >= l && x < r)).length;
    cum += fi;
    return {
      label: `[${l} - ${r}${isLast ? "]" : ")"}`,
      mark: (l + r) / 2,
      fi,
      fr: Math.round((fi / n) * 1000) / 10,
      fa: cum,
    };
  });
}

function computeStats(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const freqMap = {};
  data.forEach((x) => (freqMap[x] = (freqMap[x] || 0) + 1));
  const maxFreq = Math.max(...Object.values(freqMap));
  const modes = Object.keys(freqMap)
    .filter((k) => freqMap[k] === maxFreq)
    .map(Number)
    .sort((a, b) => a - b);
  const range = Math.max(...data) - Math.min(...data);
  const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return { n, sorted, sum, mean, median, modes, range, variance, stdDev };
}

function round(x, d = 2) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/* ---------------------------------------------------------------- */
/* Componentes chicos                                                */
/* ---------------------------------------------------------------- */

function ChalkTab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`chalk-tab ${active ? "chalk-tab--active" : ""}`}>
      {children}
    </button>
  );
}

function Cell_({ children, state }) {
  return (
    <td className={`fc ${state === "ok" ? "fc--ok" : state === "bad" ? "fc--bad" : ""}`}>
      {children}
    </td>
  );
}

function AnswerInput({ value, onChange, state, width = 64, suffix }) {
  return (
    <span className="ans-wrap">
      <input
        type="text" 
        className={`ans-input ${state === "ok" ? "ans-input--ok" : state === "bad" ? "ans-input--bad" : ""}`}
        style={{ width }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
      />
      {suffix && <span className="ans-suffix">{suffix}</span>}
      {state === "ok" && <Check size={14} className="ans-icon ans-icon--ok" />}
      {state === "bad" && <X size={14} className="ans-icon ans-icon--bad" />}
    </span>
  );
}


/* ---------------------------------------------------------------- */
/* Tabla de frecuencias (ejercicio)                                   */
/* ---------------------------------------------------------------- */

function FrequencyExercise({ set, hasMark, setIndex, onCycle }) {
  const rows = useMemo(
    () => (hasMark ? groupedRows(set.data, set.width) : ungroupedRows(set.data)),
    [set, hasMark]
  );
  const n = set.data.length;

  const emptyAnswers = () => rows.map(() => ({ mark: "", fi: "", fr: "", fa: "" }));
  const [answers, setAnswers] = useState(emptyAnswers);
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);

  React.useEffect(() => {
    setAnswers(emptyAnswers());
    setChecked(false);
    setSolved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, hasMark]);

  const results = useMemo(() => {
    if (!checked) return null;
    return rows.map((row, i) => {
      const a = answers[i];
      const r = {};
      if (hasMark) r.mark = Math.abs(parseFloat(a.mark) - row.mark) < 0.01;
      r.fi = parseInt(a.fi, 10) === row.fi;
      const frInput = parseFloat(String(a.fr).replace("%", "").replace(",", "."));
      r.fr = Math.abs(frInput - row.fr) <= 0.6;
      r.fa = parseInt(a.fa, 10) === row.fa;
      return r;
    });
  }, [checked, answers, rows, hasMark]);

  const allCorrect = results && results.every((r) => Object.values(r).every(Boolean));
  const showCharts = solved || allCorrect;

  const updateAnswer = (i, field, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
    if (checked) setChecked(false);
  };

  const chartRows = showCharts ? rows : [];

  return (
    <div>
      <div className="ex-header">
        <div>
          <h3 className="ex-title">{set.title}</h3>
          <p className="ex-prompt">{set.prompt}</p>
        </div>
        <button className="btn btn--ghost" onClick={onCycle}>
          <RotateCcw size={14} /> otro conjunto
        </button>
      </div>

      <div className="raw-data">
        <span className="raw-data__label">Datos relevados (n = {n}):</span>
        <div className="raw-data__chips">
          {set.data.map((v, i) => (
            <span className="chip" key={i}>{v}</span>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="freq-table">
          <thead>
            <tr>
              <th>{hasMark ? "Intervalo" : "Valor (xᵢ)"}</th>
              {hasMark && <th>Marca de clase</th>}
              <th>Frec. absoluta (fᵢ)</th>
              <th>Frec. relativa (%)</th>
              <th>Frec. acumulada (Fᵢ)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="fc fc--label">{row.label}</td>
                {hasMark && (
                  <Cell_ state={results && (results[i].mark ? "ok" : "bad")}>
                    <AnswerInput
                      value={answers[i].mark}
                      onChange={(v) => updateAnswer(i, "mark", v)}
                      state={results && (results[i].mark ? "ok" : "bad")}
                      width={56}
                    />
                  </Cell_>
                )}
                <Cell_ state={results && (results[i].fi ? "ok" : "bad")}>
                  <AnswerInput
                    value={answers[i].fi}
                    onChange={(v) => updateAnswer(i, "fi", v)}
                    state={results && (results[i].fi ? "ok" : "bad")}
                    width={48}
                  />
                </Cell_>
                <Cell_ state={results && (results[i].fr ? "ok" : "bad")}>
                  <AnswerInput
                    value={answers[i].fr}
                    onChange={(v) => updateAnswer(i, "fr", v)}
                    state={results && (results[i].fr ? "ok" : "bad")}
                    width={48}
                    suffix="%"
                  />
                </Cell_>
                <Cell_ state={results && (results[i].fa ? "ok" : "bad")}>
                  <AnswerInput
                    value={answers[i].fa}
                    onChange={(v) => updateAnswer(i, "fa", v)}
                    state={results && (results[i].fa ? "ok" : "bad")}
                    width={48}
                  />
                </Cell_>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ex-actions">
        <button className="btn btn--primary" onClick={() => setChecked(true)}>
          Verificar respuestas
        </button>
        <button className="btn btn--ghost" onClick={() => setSolved((s) => !s)}>
          {solved ? <EyeOff size={14} /> : <Eye size={14} />} {solved ? "ocultar solución" : "ver solución"}
        </button>
      </div>

      {checked && (
        <p className={`ex-feedback ${allCorrect ? "ex-feedback--ok" : "ex-feedback--bad"}`}>
          {allCorrect
            ? "¡Todo correcto! Mirá cómo se ven estos datos en los gráficos de abajo."
            : "Todavía hay valores para revisar — las celdas en rojo no coinciden. Recontá y volvé a intentar."}
        </p>
      )}
      {solved && !allCorrect && (
        <p className="ex-feedback ex-feedback--info">
          Estás viendo la solución completa. Los gráficos de abajo ya reflejan la tabla correcta.
        </p>
      )}

      <div className={`charts-section ${showCharts ? "charts-section--visible" : ""}`}>
        {showCharts && (
          <>
            <h4 className="charts-title">Gráfico de barras y gráfico circular</h4>
            <div className="charts-grid">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartRows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5A5142" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5A5142" }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="fi" name="Frecuencia" radius={[4, 4, 0, 0]}>
                      {chartRows.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartRows}
                      dataKey="fi"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={(d) => `${d.label}: ${d.fr}%`}
                      labelLine={false}
                    >
                      {chartRows.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Medidas de posición y dispersión                                    */
/* ---------------------------------------------------------------- */

function MeasureCard({ label, formula, value, unit, children, open, onToggle }) {
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

function MeasuresModule({ set, onCycle }) {
  const stats = useMemo(() => computeStats(set.data), [set]);
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const [meanGuess, setMeanGuess] = useState("");
  const [meanChecked, setMeanChecked] = useState(false);
  const meanOk = Math.abs(parseFloat(meanGuess?.replace(",", ".")) - stats.mean) < 0.05;

  return (
    <div>
      <div className="ex-header">
        <div>
          <h3 className="ex-title">{set.title}</h3>
          <p className="ex-prompt">{set.prompt}</p>
        </div>
        <button className="btn btn--ghost" onClick={onCycle}>
          <RotateCcw size={14} /> otro conjunto
        </button>
      </div>

      <div className="raw-data">
        <span className="raw-data__label">Datos ordenados (n = {stats.n}):</span>
        <div className="raw-data__chips">
          {stats.sorted.map((v, i) => (
            <span className="chip" key={i}>{v}</span>
          ))}
        </div>
      </div>

      <div className="mean-practice">
        <p>
          Antes de ver el resultado: calculá vos la <strong>media</strong> y escribila acá.
        </p>
        <div className="mean-practice__row">
          <AnswerInput
            value={meanGuess}
            onChange={(v) => {
              setMeanGuess(v);
              setMeanChecked(false);
            }}
            width={80}
            state={meanChecked ? (meanOk ? "ok" : "bad") : undefined}
          />
          <button className="btn btn--primary" onClick={() => setMeanChecked(true)}>
            Verificar
          </button>
        </div>
        {meanChecked && (
          <p className={meanOk ? "ex-feedback ex-feedback--ok" : "ex-feedback ex-feedback--bad"}>
            {meanOk ? "¡Correcto!" : `Todavía no — la media real es ${round(stats.mean)}. Abrí la tarjeta de abajo para ver el desarrollo.`}
          </p>
        )}
      </div>

      <h4 className="charts-title" style={{ marginTop: 24 }}>Medidas de posición</h4>
      <div className="measures-grid">
        <MeasureCard
          label="Media (x̄)"
          value={round(stats.mean)}
          formula="x̄ = (Σ xᵢ) / n"
          open={!!open.mean}
          onToggle={() => toggle("mean")}
        >
          <p>
            x̄ = ({stats.sorted.join(" + ")}) / {stats.n} = {round(stats.sum)} / {stats.n} ={" "}
            <strong>{round(stats.mean)}</strong>
          </p>
        </MeasureCard>

        <MeasureCard
          label="Mediana (Me)"
          value={round(stats.median)}
          formula="Valor central de la serie ordenada"
          open={!!open.median}
          onToggle={() => toggle("median")}
        >
          <p>
            Con n = {stats.n} ({stats.n % 2 === 0 ? "par" : "impar"}), la mediana es{" "}
            {stats.n % 2 === 0
              ? "el promedio de los dos valores centrales."
              : "el valor que queda justo en el medio."}{" "}
            Me = <strong>{round(stats.median)}</strong>
          </p>
        </MeasureCard>

        <MeasureCard
          label="Moda (Mo)"
          value={stats.modes.join(" y ")}
          formula="Valor(es) que más se repite(n)"
          open={!!open.mode}
          onToggle={() => toggle("mode")}
        >
          <p>
            El valor <strong>{stats.modes.join(" y ")}</strong> es el que aparece con mayor frecuencia
            en el conjunto de datos.
          </p>
        </MeasureCard>
      </div>

      <h4 className="charts-title" style={{ marginTop: 24 }}>Medidas de dispersión</h4>
      <div className="measures-grid">
        <MeasureCard
          label="Rango"
          value={stats.range}
          formula="Rango = máximo − mínimo"
          open={!!open.range}
          onToggle={() => toggle("range")}
        >
          <p>
            Rango = {Math.max(...stats.sorted)} − {Math.min(...stats.sorted)} = <strong>{stats.range}</strong>
          </p>
        </MeasureCard>

        <MeasureCard
          label="Varianza (σ²)"
          value={round(stats.variance)}
          formula="σ² = Σ(xᵢ − x̄)² / n"
          open={!!open.variance}
          onToggle={() => toggle("variance")}
        >
          <p>
            Se toma cada dato, se le resta la media ({round(stats.mean)}), se eleva al cuadrado, se suman
            esos valores y se divide por n = {stats.n}. Resultado: σ² = <strong>{round(stats.variance)}</strong>
          </p>
        </MeasureCard>

        <MeasureCard
          label="Desvío estándar (σ)"
          value={round(stats.stdDev)}
          formula="σ = √σ²"
          open={!!open.std}
          onToggle={() => toggle("std")}
        >
          <p>
            σ = √{round(stats.variance)} = <strong>{round(stats.stdDev)}</strong> {set.unit}
          </p>
        </MeasureCard>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* App                                                                 */
/* ---------------------------------------------------------------- */

export default function App() {
  const [tab, setTab] = useState("sueltos");
  const [ungroupedIdx, setUngroupedIdx] = useState(0);
  const [groupedIdx, setGroupedIdx] = useState(0);
  const [measuresIdx, setMeasuresIdx] = useState(0);

  return (
    <div className="board-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

        .board-app {
          font-family: 'Inter', sans-serif;
          background: #1F3A34;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 26px 26px;
          border-radius: 18px;
          padding: 28px 20px 34px;
          color: #F5F1E8;
          max-width: 920px;
          margin: 0 auto;
        }
        .board-header { text-align: center; margin-bottom: 22px; }
        .board-title {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 30px;
          letter-spacing: 0.2px;
          margin: 0 0 6px;
          color: #FBF8F1;
        }
        .board-subtitle {
          font-size: 14px;
          color: #B9CFC7;
          margin: 0;
        }
        .tabs-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .chalk-tab {
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          color: #CFE3DC;
          background: transparent;
          border: 1.5px solid #3F5B54;
          border-radius: 999px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .chalk-tab:hover { border-color: #E8B33D; color: #FBF8F1; }
        .chalk-tab--active {
          background: #E8B33D;
          border-color: #E8B33D;
          color: #24312C;
        }
        .paper {
          background: #FAF7F0;
          background-image:
            linear-gradient(rgba(95,168,160,0.08) 1px, transparent 1px);
          background-size: 100% 28px;
          border-radius: 12px;
          padding: 22px 22px 26px;
          color: #24312C;
          box-shadow: 0 8px 24px rgba(0,0,0,0.22);
        }
        .ex-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .ex-title {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px;
          color: #1F3A34;
        }
        .ex-prompt { font-size: 13.5px; color: #5A5142; margin: 0; max-width: 480px; }
        .btn {
          font-family: 'Inter', sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .btn--primary { background: #1F3A34; color: #FAF7F0; }
        .btn--primary:hover { background: #14261F; }
        .btn--ghost { background: transparent; color: #5A5142; border: 1.5px solid #D8CFB8; }
        .btn--ghost:hover { border-color: #5FA8A0; color: #1F3A34; }
        .raw-data { margin-bottom: 18px; }
        .raw-data__label { font-size: 12px; font-weight: 600; color: #8A8065; text-transform: uppercase; letter-spacing: 0.4px; }
        .raw-data__chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .chip {
          background: #EFE9D8;
          border: 1px solid #DED2AE;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 12.5px;
          font-variant-numeric: tabular-nums;
          color: #4A4433;
        }
        .table-wrap { overflow-x: auto; margin-bottom: 14px; }
        .freq-table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
        .freq-table th {
          text-align: center;
          font-size: 11.5px;
          font-weight: 700;
          color: #5A5142;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 8px 6px;
          border-bottom: 2px solid #1F3A34;
        }
        .fc { text-align: center; padding: 7px 6px; border-bottom: 1px solid #E4DCC5; }
        .fc--label { font-weight: 600; color: #1F3A34; }
        .fc--ok { background: rgba(95,168,160,0.14); }
        .fc--bad { background: rgba(217,108,108,0.12); }
        .ans-wrap { display: inline-flex; align-items: center; gap: 3px; }
        .ans-input {
          border: 1.5px solid #D8CFB8;
          border-radius: 6px;
          padding: 5px 6px;
          font-size: 13px;
          text-align: center;
          font-family: 'Inter', sans-serif;
          background: #fff;
        }
        .ans-input:focus { outline: none; border-color: #5FA8A0; }
        .ans-input--ok { border-color: #5FA8A0; background: #EEF7F5; }
        .ans-input--bad { border-color: #D96C6C; background: #FBEDED; }
        .ans-suffix { font-size: 12px; color: #8A8065; }
        .ans-icon--ok { color: #4C8F86; }
        .ans-icon--bad { color: #C25454; }
        .ex-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
        .ex-feedback { font-size: 13px; font-weight: 600; margin: 10px 0 0; }
        .ex-feedback--ok { color: #3E7A70; }
        .ex-feedback--bad { color: #B14E4E; }
        .ex-feedback--info { color: #7A6A3E; }
        .charts-section { margin-top: 8px; }
        .charts-title { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 700; color: #1F3A34; margin: 18px 0 10px; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .charts-grid { grid-template-columns: 1fr; } }
        .chart-box { background: #fff; border: 1px solid #E4DCC5; border-radius: 10px; padding: 8px; }
        .mean-practice {
          background: #EFE9D8;
          border: 1px dashed #C9BC94;
          border-radius: 10px;
          padding: 14px 16px;
          margin: 4px 0 4px;
          font-size: 13.5px;
        }
        .mean-practice__row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .measures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 4px; }
        @media (max-width: 700px) { .measures-grid { grid-template-columns: 1fr; } }
        .measure-card { background: #fff; border: 1px solid #E4DCC5; border-radius: 10px; overflow: hidden; }
        .measure-card__head { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; cursor: pointer; }
        .measure-card__label { font-size: 12px; font-weight: 700; color: #8A8065; text-transform: uppercase; letter-spacing: 0.3px; }
        .measure-card__value { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; color: #1F3A34; margin-top: 2px; }
        .measure-card__unit { font-size: 12px; font-weight: 500; color: #8A8065; }
        .measure-card__toggle { font-size: 20px; color: #5FA8A0; font-weight: 700; }
        .measure-card__body { padding: 0 14px 14px; border-top: 1px solid #EFE9D8; }
        .measure-card__formula { font-family: 'Fraunces', serif; font-style: italic; font-size: 13.5px; color: #5A5142; margin: 10px 0 6px; }
      `}</style>

      <div className="board-header">
        <h1 className="board-title">Estadística desde cero</h1>
        <p className="board-subtitle">5° año — tablas de frecuencia, gráficos y medidas</p>
      </div>

      <div className="tabs-row">
        <ChalkTab active={tab === "sueltos"} onClick={() => setTab("sueltos")}>
          1 · Datos sueltos
        </ChalkTab>
        <ChalkTab active={tab === "agrupados"} onClick={() => setTab("agrupados")}>
          2 · Datos agrupados
        </ChalkTab>
        <ChalkTab active={tab === "medidas"} onClick={() => setTab("medidas")}>
          3 · Posición y dispersión
        </ChalkTab>
      </div>

      <div className="paper">
        {tab === "sueltos" && (
          <FrequencyExercise
            key={`sueltos-${ungroupedIdx}`}
            set={UNGROUPED_SETS[ungroupedIdx]}
            hasMark={false}
            setIndex={ungroupedIdx}
            onCycle={() => setUngroupedIdx((i) => (i + 1) % UNGROUPED_SETS.length)}
          />
        )}
        {tab === "agrupados" && (
          <FrequencyExercise
            key={`agrupados-${groupedIdx}`}
            set={GROUPED_SETS[groupedIdx]}
            hasMark={true}
            setIndex={groupedIdx}
            onCycle={() => setGroupedIdx((i) => (i + 1) % GROUPED_SETS.length)}
          />
        )}
        {tab === "medidas" && (
          <MeasuresModule
            key={`medidas-${measuresIdx}`}
            set={UNGROUPED_SETS[measuresIdx]}
            onCycle={() => setMeasuresIdx((i) => (i + 1) % UNGROUPED_SETS.length)}
          />
        )}
      </div>
    </div>
  );
}