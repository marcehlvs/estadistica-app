import { useMemo, useState } from "react";
import { RotateCcw, Shuffle, Send } from "lucide-react";
import { AnswerInput, Cell_, DataBox } from "./ui.jsx";
import { GroupedWorkedSolution } from "./GroupedMeasures.jsx";
import { recordResult } from "./progress.js";
import { Choice, Conclusion, GivenTable, InterpretationQuestion, SampleSolution } from "./CompareCV.jsx";
import {
  CV_HOMOGENEA,
  analyzeGrouped,
  analyzeTable,
  compareVerdict,
  computeStats,
  makeCompareExercise,
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

function buildExpected(A, B, C) {
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

  // Ejercicio 3 · comparar dos muestras con el CV (las opciones se corrigen por igualdad)
  e.c_a_mean = approx(C.ga.mean);
  e.c_a_sd = approx(C.ga.sd);
  e.c_a_cv = { value: C.ga.cv, tol: 0.2, decimals: 1 };
  e.c_b_mean = approx(C.gb.mean);
  e.c_b_sd = approx(C.gb.sd);
  e.c_b_cv = { value: C.gb.cv, tol: 0.2, decimals: 1 };
  e.c_homA = { choice: C.v.homA ? "si" : "no" };
  e.c_homB = { choice: C.v.homB ? "si" : "no" };
  e.c_more = { choice: C.v.more };
  e.c_interp = { choice: C.ex.interp.correct };
  return e;
}

/* ---------------------------------------------------------------- */
/* Hoja de evaluación                                                  */
/* ---------------------------------------------------------------- */

/** Corrige todas las respuestas: { clave: true/false }. */
function gradeAnswers(expected, answers) {
  const r = {};
  for (const [key, spec] of Object.entries(expected)) {
    if ("choice" in spec) {
      r[key] = answers[key] === spec.choice;
      continue;
    }
    const v = parseNum(answers[key]);
    r[key] = Number.isFinite(v) && Math.abs(v - spec.value) <= spec.tol;
  }
  return r;
}

function EvaluationSheet({ evalNo, onNew, onRetry }) {
  const exA = useMemo(() => makeUngroupedExercise(evalNo), [evalNo]);
  const exB = useMemo(() => makeGroupedExercise(evalNo), [evalNo]);
  const A = useMemo(() => ({ rows: ungroupedRows(exA.data), st: computeStats(exA.data) }), [exA]);
  const B = useMemo(() => analyzeGrouped(exB.data), [exB]);
  const exC = useMemo(() => makeCompareExercise(evalNo), [evalNo]);
  const C = useMemo(() => {
    const [ga, gb] = exC.samples.map((s) => analyzeTable(s.base));
    return { ex: exC, ga, gb, v: compareVerdict(ga, gb) };
  }, [exC]);
  const expected = useMemo(() => buildExpected(A, B, C), [A, B, C]);

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const results = useMemo(() => (submitted ? gradeAnswers(expected, answers) : null), [submitted, answers, expected]);

  const keysA = Object.keys(expected).filter((k) => k.startsWith("a_"));
  const keysB = Object.keys(expected).filter((k) => k.startsWith("b_"));
  const keysC = Object.keys(expected).filter((k) => k.startsWith("c_"));
  const scoreOf = (keys) => (results ? keys.filter((k) => results[k]).length : 0);
  const scoreA = scoreOf(keysA);
  const scoreB = scoreOf(keysB);
  const scoreC = scoreOf(keysC);
  const total = keysA.length + keysB.length + keysC.length;
  const pct = Math.round(((scoreA + scoreB + scoreC) / total) * 100);
  const tone = pct >= 85 ? "good" : pct >= 60 ? "mid" : "low";

  const stateOf = (key) => (results ? (results[key] ? "ok" : "bad") : undefined);

  const entregar = () => {
    const r = gradeAnswers(expected, answers);
    const part = (label, keys) => ({ label, score: keys.filter((k) => r[k]).length, total: keys.length });
    const parts = [part("Ej. 1", keysA), part("Ej. 2", keysB), part("Ej. 3", keysC)];
    recordResult({
      kind: "evaluacion",
      id: evalNo,
      score: parts.reduce((s, p) => s + p.score, 0),
      total,
      parts,
    });
    setSubmitted(true);
  };

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

  const setChoice = (key, v) => setAnswers((prev) => ({ ...prev, [key]: v }));
  const choiceHint = (key, text) =>
    results && !results[key] ? <span className="ans-hint">= {text}</span> : null;
  const yesNo = (v) => (v === "si" ? "Sí" : "No");

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
            Tres ejercicios: datos sin agrupar, datos agrupados y comparación de dos muestras con el
            coeficiente de variación. Resolvé en papel, con calculadora, y cargá tus resultados. Se acepta un
            pequeño margen por redondeo.
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

      {/* ---------------- Ejercicio 3 ---------------- */}
      <div className="eval-section">
        <span className="eval-badge">Ejercicio 3 · comparar dos muestras (CV)</span>
        <h3 className="ex-title">{exC.title}</h3>
        <p className="ex-prompt">{exC.prompt}</p>
        <p className="eval-note">
          Las tablas ya están armadas. Para cada muestra calculá x̄, σ y CV (usá las marcas de clase). Se
          considera homogénea a una muestra con CV &lt; {CV_HOMOGENEA} %.
        </p>
        <div className="cmp-grid">
          {exC.samples.map((s, i) => {
            const p = i === 0 ? "a" : "b";
            const g = i === 0 ? C.ga : C.gb;
            const hk = `c_hom${s.tag}`;
            return (
              <div className="cmp-card" key={s.tag}>
                <div className="cmp-card__title">
                  Muestra {s.tag} · {s.label}
                </div>
                <GivenTable base={s.base} n={g.n} />
                <div className="cmp-fields">
                  <label className="sturges-practice__field">
                    x̄ = {field(`c_${p}_mean`, { width: 76, suffix: s.unit })}
                  </label>
                  <label className="sturges-practice__field">
                    σ = {field(`c_${p}_sd`, { width: 76, suffix: s.unit })}
                  </label>
                  <label className="sturges-practice__field">
                    CV = {field(`c_${p}_cv`, { width: 76, suffix: "%" })}
                  </label>
                </div>
                <div className="cmp-question">
                  ¿Es homogénea (CV &lt; {CV_HOMOGENEA} %)?
                  <Choice
                    name={`eval-${hk}`}
                    value={answers[hk]}
                    onChange={(v) => setChoice(hk, v)}
                    options={[["si", "Sí"], ["no", "No"]]}
                    state={stateOf(hk)}
                    disabled={submitted}
                  />
                  {choiceHint(hk, yesNo(expected[hk].choice))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cmp-question cmp-question--main">
          La muestra más homogénea es:
          <Choice
            name="eval-c_more"
            value={answers.c_more}
            onChange={(v) => setChoice("c_more", v)}
            options={exC.samples.map((s) => [s.tag, `${s.tag} · ${s.label}`])}
            state={stateOf("c_more")}
            disabled={submitted}
          />
          {choiceHint("c_more", expected.c_more.choice)}
        </div>
        <InterpretationQuestion
          interp={exC.interp}
          name="eval-c_interp"
          value={answers.c_interp}
          onChange={(v) => setChoice("c_interp", v)}
          state={stateOf("c_interp")}
          disabled={submitted}
        />
        {results && !results.c_interp && (
          <p className="ex-feedback ex-feedback--info">Respuesta correcta: {exC.interp.correctText}</p>
        )}
      </div>

      {/* ---------------- Entrega ---------------- */}
      {!submitted ? (
        <div className="ex-actions" style={{ marginTop: 24 }}>
          <button className="btn btn--primary" onClick={entregar}>
            <Send size={14} /> Entregar y corregir
          </button>
        </div>
      ) : (
        <>
          <div className={`score-banner score-banner--${tone}`}>
            <span>
              Ejercicio 1: {scoreA} / {keysA.length} · Ejercicio 2: {scoreB} / {keysB.length} · Ejercicio 3: {scoreC} /{" "}
              {keysC.length}
            </span>
            <span className="score-banner__num">
              {scoreA + scoreB + scoreC} / {total} ({pct}%)
            </span>
          </div>
          <p className="ex-feedback ex-feedback--info">
            Las respuestas incorrectas muestran el valor correcto. Abajo tenés la resolución completa de los
            ejercicios 2 y 3.
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

          <h4 className="charts-title" style={{ marginTop: 24 }}>Resolución del ejercicio 3</h4>
          {exC.samples.map((s, i) => (
            <SampleSolution key={s.tag} s={s} g={i === 0 ? C.ga : C.gb} />
          ))}
          <Conclusion ex={exC} A={C.ga} B={C.gb} v={C.v} />
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
