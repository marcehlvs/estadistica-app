import { useMemo, useState } from "react";
import { RotateCcw, Shuffle, Send } from "lucide-react";
import { AnswerInput, Cell_, DataBox } from "./ui.jsx";
import { GroupedWorkedSolution } from "./GroupedMeasures.jsx";
import {
  analyzeGrouped,
  computeStats,
  makeGroupedExercise,
  makeUngroupedExercise,
  parseNum,
  tolFor,
  ungroupedRows,
  round,
} from "./stats.js";

/* ---------------------------------------------------------------- */
/* Respuestas esperadas                                                */
/* ---------------------------------------------------------------- */

const exact = (value) => ({ value, tol: 0.001, decimals: 0 });
const approx = (value, decimals = 2) => ({ value, tol: tolFor(value), decimals });

function buildExpected(A, B) {
  const e = {};

  // Ejercicio 1 · datos sueltos
  A.rows.forEach((r, i) => {
    e[`a_fi_${i}`] = exact(r.fi);
    e[`a_fr_${i}`] = { value: r.fr, tol: 0.6, decimals: 1 };
    e[`a_Fi_${i}`] = exact(r.fa);
  });
  e.a_mean = approx(A.st.mean);
  e.a_median = approx(A.st.median);
  e.a_mode = exact(A.st.modes[0]); // el generador garantiza moda única
  e.a_range = exact(A.st.range);
  e.a_var = approx(A.st.variance);
  e.a_sd = approx(A.st.stdDev);

  // Ejercicio 2 · datos agrupados
  e.b_R = exact(B.s.range);
  e.b_k = exact(B.k);
  e.b_A = exact(B.A);
  B.rows.forEach((r, i) => {
    e[`b_mark_${i}`] = { value: r.mark, tol: 0.01, decimals: 1 };
    e[`b_fi_${i}`] = exact(r.fi);
    e[`b_Fi_${i}`] = exact(r.Fi);
  });
  e.b_mean = approx(B.mean);
  e.b_median = approx(B.median.value);
  e.b_mode = approx(B.mode.value);
  e.b_q1 = approx(B.q1.value);
  e.b_q3 = approx(B.q3.value);
  e.b_range = exact(B.range);
  e.b_var = approx(B.variance);
  e.b_sd = approx(B.sd);
  e.b_cv = { value: B.cv, tol: 0.1, decimals: 1 };
  return e;
}

/* ---------------------------------------------------------------- */
/* Hoja de evaluación                                                  */
/* ---------------------------------------------------------------- */

function EvaluationSheet({ evalNo, onNew, onRetry }) {
  const exA = useMemo(() => makeUngroupedExercise(evalNo), [evalNo]);
  const exB = useMemo(() => makeGroupedExercise(evalNo), [evalNo]);
  const A = useMemo(() => ({ rows: ungroupedRows(exA.data), st: computeStats(exA.data) }), [exA]);
  const B = useMemo(() => analyzeGrouped(exB.data), [exB]);
  const expected = useMemo(() => buildExpected(A, B), [A, B]);

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const results = useMemo(() => {
    if (!submitted) return null;
    const r = {};
    for (const [key, spec] of Object.entries(expected)) {
      const v = parseNum(answers[key]);
      r[key] = Number.isFinite(v) && Math.abs(v - spec.value) <= spec.tol;
    }
    return r;
  }, [submitted, answers, expected]);

  const keysA = Object.keys(expected).filter((k) => k.startsWith("a_"));
  const keysB = Object.keys(expected).filter((k) => k.startsWith("b_"));
  const scoreOf = (keys) => (results ? keys.filter((k) => results[k]).length : 0);
  const scoreA = scoreOf(keysA);
  const scoreB = scoreOf(keysB);
  const total = keysA.length + keysB.length;
  const pct = Math.round(((scoreA + scoreB) / total) * 100);
  const tone = pct >= 85 ? "good" : pct >= 60 ? "mid" : "low";

  const stateOf = (key) => (results ? (results[key] ? "ok" : "bad") : undefined);

  const field = (key, { width = 64, suffix } = {}) => (
    <AnswerInput
      value={answers[key] ?? ""}
      onChange={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
      state={stateOf(key)}
      hint={round(expected[key].value, expected[key].decimals)}
      width={width}
      suffix={suffix}
      disabled={submitted}
    />
  );

  const measure = (label, formula, key, suffix) => (
    <div className="eval-field">
      <span className="eval-field__label">{label}</span>
      <span className="eval-field__formula">{formula}</span>
      {field(key, { width: 72, suffix })}
    </div>
  );

  const showTable = tableOpen || submitted;
  const st = A.st;
  const isEven = st.n % 2 === 0;

  return (
    <div>
      <div className="eval-banner">
        <div>
          <h3>Modo evaluación · N.º {evalNo}</h3>
          <p>
            Dos ejercicios completos: uno con datos sin agrupar y otro con datos agrupados. Resolvé en
            papel, con calculadora, y cargá tus resultados. Se acepta un pequeño margen por redondeo.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={onNew}>
          <Shuffle size={14} /> nueva evaluación
        </button>
      </div>

      {/* ---------------- Ejercicio 1 ---------------- */}
      <div className="eval-section">
        <span className="eval-badge">Ejercicio 1 · datos sin agrupar</span>
        <h3 className="ex-title">{exA.title}</h3>
        <p className="ex-prompt">{exA.prompt}</p>

        <DataBox label="Datos relevados" data={exA.data} />

        <h4 className="eval-subtitle">a) Tabla de frecuencias</h4>
        <div className="table-wrap">
          <table className="freq-table">
            <thead>
              <tr>
                <th>Valor (xᵢ)</th>
                <th>Frec. absoluta (fᵢ)</th>
                <th>Frec. relativa (%)</th>
                <th>Frec. acumulada (Fᵢ)</th>
              </tr>
            </thead>
            <tbody>
              {A.rows.map((r, i) => (
                <tr key={i}>
                  <td className="fc fc--label">{r.label}</td>
                  <Cell_ state={stateOf(`a_fi_${i}`)}>{field(`a_fi_${i}`, { width: 48 })}</Cell_>
                  <Cell_ state={stateOf(`a_fr_${i}`)}>{field(`a_fr_${i}`, { width: 52, suffix: "%" })}</Cell_>
                  <Cell_ state={stateOf(`a_Fi_${i}`)}>{field(`a_Fi_${i}`, { width: 48 })}</Cell_>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="eval-subtitle">b) Medidas de posición</h4>
        <div className="eval-fields">
          {measure("Media", "x̄ = Σ xᵢ·fᵢ / n", "a_mean", exA.unit)}
          {measure("Mediana", "valor central", "a_median", exA.unit)}
          {measure("Moda", "el que más se repite", "a_mode", exA.unit)}
        </div>

        <h4 className="eval-subtitle">c) Medidas de dispersión</h4>
        <div className="eval-fields">
          {measure("Rango", "máximo − mínimo", "a_range", exA.unit)}
          {measure("Varianza", "σ² = Σ fᵢ(xᵢ − x̄)² / n", "a_var")}
          {measure("Desvío estándar", "σ = √σ²", "a_sd", exA.unit)}
        </div>

        {submitted && (
          <div className="hand-calc">
            <p className="hc-title">Resolución del ejercicio 1</p>
            <p>
              x̄ = {round(st.sum, 2)} / {st.n} = <strong>{round(st.mean)}</strong>
            </p>
            <p>
              n = {st.n} ({isEven ? "par" : "impar"}) →{" "}
              {isEven
                ? `se promedian los datos de las posiciones ${st.n / 2} y ${st.n / 2 + 1}: (${st.sorted[st.n / 2 - 1]} + ${st.sorted[st.n / 2]}) / 2`
                : `es el dato de la posición ${(st.n + 1) / 2}`}{" "}
              → Me = <strong>{round(st.median)}</strong>
            </p>
            <p>
              Mo = <strong>{st.modes[0]}</strong> (el valor de mayor frecuencia)
            </p>
            <p>
              R = {Math.max(...st.sorted)} − {Math.min(...st.sorted)} = <strong>{st.range}</strong>
            </p>
            <p>
              σ² = {round(st.variance * st.n, 2)} / {st.n} = <strong>{round(st.variance)}</strong> · σ = √
              {round(st.variance)} = <strong>{round(st.stdDev)}</strong>
            </p>
          </div>
        )}
      </div>

      {/* ---------------- Ejercicio 2 ---------------- */}
      <div className="eval-section">
        <span className="eval-badge">Ejercicio 2 · datos agrupados (n = {exB.data.length} ≤ 150)</span>
        <h3 className="ex-title">{exB.title}</h3>
        <p className="ex-prompt">{exB.prompt}</p>

        <DataBox label="Datos relevados" data={exB.data} />

        <h4 className="eval-subtitle">a) Intervalos: regla de Sturges</h4>
        <p className="eval-note">
          Calculá a mano k = 1 + 3.322 · log₁₀(n) con n = {exB.data.length} (redondeá al entero más
          cercano), el rango R = máx − mín, y la amplitud A = R / k (redondeá hacia arriba).
        </p>
        <div className="eval-fields">
          {measure("Rango", "R = máx − mín", "b_R", exB.unit)}
          {measure("Cantidad de intervalos", "k = 1 + 3.322 · log₁₀(n)", "b_k")}
          {measure("Amplitud", "A = R / k", "b_A", exB.unit)}
        </div>

        <h4 className="eval-subtitle">b) Tabla de frecuencias</h4>
        {!showTable ? (
          <>
            <p className="eval-note">
              Cuando tengas k y A, armá la tabla. Se construye con los valores correctos, así un error
              en el punto (a) no te arrastra al resto del ejercicio; el punto (a) se corrige al entregar.
            </p>
            <button className="btn btn--primary" onClick={() => setTableOpen(true)}>
              Armar la tabla de intervalos
            </button>
          </>
        ) : (
          <div className="table-wrap">
            <table className="freq-table">
              <thead>
                <tr>
                  <th>Intervalo</th>
                  <th>Marca de clase (xᵢ)</th>
                  <th>Frec. absoluta (fᵢ)</th>
                  <th>Frec. acumulada (Fᵢ)</th>
                </tr>
              </thead>
              <tbody>
                {B.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="fc fc--label">{r.label}</td>
                    <Cell_ state={stateOf(`b_mark_${i}`)}>{field(`b_mark_${i}`, { width: 56 })}</Cell_>
                    <Cell_ state={stateOf(`b_fi_${i}`)}>{field(`b_fi_${i}`, { width: 48 })}</Cell_>
                    <Cell_ state={stateOf(`b_Fi_${i}`)}>{field(`b_Fi_${i}`, { width: 48 })}</Cell_>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h4 className="eval-subtitle">c) Medidas de posición</h4>
        <div className="eval-fields">
          {measure("Media", "x̄ = Σ xᵢ·fᵢ / n", "b_mean", exB.unit)}
          {measure("Mediana", "Me = Lᵢ + ((n/2 − Fᵢ₋₁)/fᵢ)·A", "b_median", exB.unit)}
          {measure("Moda", "Mo = Lᵢ + d₁/(d₁+d₂)·A", "b_mode", exB.unit)}
          {measure("Cuartil 1", "Q₁ (posición n/4)", "b_q1", exB.unit)}
          {measure("Cuartil 3", "Q₃ (posición 3n/4)", "b_q3", exB.unit)}
        </div>

        <h4 className="eval-subtitle">d) Medidas de dispersión</h4>
        <div className="eval-fields">
          {measure("Rango", "Ls del último − Li del primero", "b_range", exB.unit)}
          {measure("Varianza", "σ² = Σ fᵢ(xᵢ − x̄)² / n", "b_var")}
          {measure("Desvío estándar", "σ = √σ²", "b_sd", exB.unit)}
          {measure("Coef. de variación", "CV = σ / x̄ · 100", "b_cv", "%")}
        </div>
      </div>

      {/* ---------------- Entrega ---------------- */}
      {!submitted ? (
        <div className="ex-actions" style={{ marginTop: 24 }}>
          <button className="btn btn--primary" onClick={() => setSubmitted(true)}>
            <Send size={14} /> Entregar y corregir
          </button>
        </div>
      ) : (
        <>
          <div className={`score-banner score-banner--${tone}`}>
            <span>
              Ejercicio 1: {scoreA} / {keysA.length} · Ejercicio 2: {scoreB} / {keysB.length}
            </span>
            <span className="score-banner__num">
              {scoreA + scoreB} / {total} ({pct}%)
            </span>
          </div>
          <p className="ex-feedback ex-feedback--info">
            Las respuestas incorrectas muestran el valor correcto. Abajo tenés la resolución completa del
            ejercicio 2.
          </p>
          <div className="ex-actions" style={{ marginTop: 10 }}>
            <button className="btn btn--ghost" onClick={onRetry}>
              <RotateCcw size={14} /> reintentar esta evaluación
            </button>
            <button className="btn btn--primary" onClick={onNew}>
              <Shuffle size={14} /> nueva evaluación
            </button>
          </div>

          <h4 className="charts-title" style={{ marginTop: 24 }}>Resolución del ejercicio 2</h4>
          <GroupedWorkedSolution g={B} unit={exB.unit} />
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Contenedor: número de evaluación e intento                          */
/* ---------------------------------------------------------------- */

export default function Evaluation() {
  const [evalNo, setEvalNo] = useState(1);
  const [attempt, setAttempt] = useState(0);
  return (
    <EvaluationSheet
      key={`${evalNo}-${attempt}`}
      evalNo={evalNo}
      onNew={() => {
        setEvalNo((n) => n + 1);
        setAttempt(0);
      }}
      onRetry={() => setAttempt((a) => a + 1)}
    />
  );
}
