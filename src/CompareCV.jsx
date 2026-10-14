import { useMemo, useRef, useState } from "react";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import { AnswerInput } from "./ui.jsx";
import { GroupedTable } from "./GroupedMeasures.jsx";
import { BoxPlots, RelHistogram } from "./Charts.jsx";
import { recordResult } from "./progress.js";
import { CV_HOMOGENEA, analyzeTable, compareVerdict, makeCompareExercise, parseNum, round, tolFor } from "./stats.js";

/* Comparar dos muestras con el coeficiente de variación.
   Los componentes de este archivo van FUERA de CompareCV a propósito: si se definen
   adentro, React los vuelve a montar en cada tecla y el campo pierde el foco. */

const approx = (value, decimals = 2) => ({ value, tol: tolFor(value), decimals });
const cvSpec = (value) => ({ value, tol: 0.2, decimals: 1 });

export function GivenTable({ base, n }) {
  return (
    <div className="table-wrap">
      <table className="freq-table">
        <thead>
          <tr>
            <th>Intervalo</th>
            <th>fᵢ</th>
          </tr>
        </thead>
        <tbody>
          {base.map((r, i) => (
            <tr key={i}>
              <td className="fc fc--label">{`[${r.lo} - ${r.hi}${i === base.length - 1 ? "]" : ")"}`}</td>
              <td className="fc fc--num">{r.fi}</td>
            </tr>
          ))}
          <tr>
            <td className="fc fc--total">Total</td>
            <td className="fc fc--total">{n}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Choice({ name, value, onChange, options, state, disabled, col = false }) {
  return (
    <div className={`cmp-choice ${col ? "cmp-choice--col" : ""} ${state ? `cmp-choice--${state}` : ""}`} role="radiogroup">
      {options.map(([v, label]) => (
        <label key={v}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} disabled={disabled} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function SampleSolution({ s, g }) {
  return (
    <div className="hand-calc">
      <p className="hc-title">
        Muestra {s.tag} · {s.label}
      </p>
      <GroupedTable g={g} />
      <p>
        x̄ = Σ(xᵢ · fᵢ) / n = {round(g.sumFx, 2)} / {g.n} = <strong>{round(g.mean)}</strong> {s.unit}
      </p>
      <p>
        σ² = Σ fᵢ · (xᵢ − x̄)² / n = {round(g.sumDev2, 2)} / {g.n} = {round(g.variance)} → σ = √{round(g.variance)} ={" "}
        <strong>{round(g.sd)}</strong> {s.unit}
      </p>
      <p>
        CV = σ / x̄ · 100 = {round(g.sd)} / {round(g.mean)} · 100 = <strong>{round(g.cv, 1)} %</strong>{" "}
        {g.cv < CV_HOMOGENEA ? `→ menor que ${CV_HOMOGENEA} %: muestra homogénea` : `→ ${CV_HOMOGENEA} % o más: muestra no homogénea`}
      </p>
    </div>
  );
}

/** Pregunta de interpretación en palabras (opción múltiple). */
export function InterpretationQuestion({ interp, name, value, onChange, state, disabled }) {
  return (
    <div className="cmp-question cmp-question--main cmp-question--col">
      <span>{interp.prompt}</span>
      <Choice
        name={name}
        value={value}
        onChange={onChange}
        options={interp.options.map((o) => [o.id, o.text])}
        state={state}
        disabled={disabled}
        col
      />
    </div>
  );
}

export function Conclusion({ ex, A, B, v }) {
  const [sa, sb] = ex.samples;
  const win = v.more === "A" ? sa : sb;
  const lose = v.more === "A" ? sb : sa;
  const gw = v.more === "A" ? A : B;
  const gl = v.more === "A" ? B : A;
  return (
    <div className="hand-calc">
      <p className="hc-title">Conclusión</p>
      <p>
        CV de {sa.label} = {round(A.cv, 1)} % · CV de {sb.label} = {round(B.cv, 1)} %. Se considera homogénea a una
        muestra con CV &lt; {CV_HOMOGENEA} %.
      </p>
      <p>
        <strong>
          La muestra más homogénea es la {win.tag} ({win.label})
        </strong>
        , porque tiene el menor coeficiente de variación ({round(gw.cv, 1)} % &lt; {round(gl.cv, 1)} %).
      </p>
      <p>
        {sa.label}: {v.homA ? "homogénea" : "no homogénea"} · {sb.label}: {v.homB ? "homogénea" : "no homogénea"}.
      </p>
      <p className="hc-note">Interpretación: {ex.interp.correctText}</p>
      {sa.unit !== sb.unit && (
        <p className="hc-note">
          Las variables están en unidades distintas ({sa.unit} y {sb.unit}): no se pueden comparar los desvíos
          estándar. El CV no tiene unidad, por eso permite compararlas.
        </p>
      )}
      {v.sdTrap && sa.unit === sb.unit && (
        <p className="hc-note">
          Ojo: {gw.sd > gl.sd ? win.label : lose.label} tiene el desvío estándar más grande, pero también la media más
          grande. Por eso se compara con el CV (dispersión relativa a la media) y no con σ.
        </p>
      )}
    </div>
  );
}

export default function CompareCV({ seed, onCycle }) {
  const ex = useMemo(() => makeCompareExercise(seed), [seed]);
  const [A, B] = useMemo(() => ex.samples.map((s) => analyzeTable(s.base)), [ex]);
  const verdict = useMemo(() => compareVerdict(A, B), [A, B]);
  const G = [A, B];

  const expected = useMemo(
    () => ({
      a_mean: approx(A.mean),
      a_sd: approx(A.sd),
      a_cv: cvSpec(A.cv),
      b_mean: approx(B.mean),
      b_sd: approx(B.sd),
      b_cv: cvSpec(B.cv),
    }),
    [A, B],
  );
  const choices = { homA: verdict.homA ? "si" : "no", homB: verdict.homB ? "si" : "no", more: verdict.more, interp: ex.interp.correct };

  const [ans, setAns] = useState({});
  const [checked, setChecked] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const recorded = useRef(false);
  const set = (key, v) => {
    setAns((prev) => ({ ...prev, [key]: v }));
    setChecked(false);
  };

  const okOf = (key) => {
    if (key in choices) return ans[key] === choices[key];
    const v = parseNum(ans[key]);
    return Number.isFinite(v) && Math.abs(v - expected[key].value) <= expected[key].tol;
  };
  const keys = [...Object.keys(expected), ...Object.keys(choices)];
  const score = checked ? keys.filter(okOf).length : 0;
  const stateOf = (key) => (checked ? (okOf(key) ? "ok" : "bad") : undefined);

  // Se registra el primer intento con todo respondido (no cada vez que se aprieta Verificar)
  const verificar = () => {
    setChecked(true);
    if (!recorded.current && keys.every((k) => String(ans[k] ?? "").trim() !== "")) {
      recorded.current = true;
      recordResult({ kind: "comparar", id: seed, title: ex.title, score: keys.filter(okOf).length, total: keys.length });
    }
  };

  const field = (key) => (
    <AnswerInput
      value={ans[key] ?? ""}
      onChange={(v) => set(key, v)}
      state={stateOf(key)}
      hint={round(expected[key].value, expected[key].decimals)}
      width={76}
    />
  );

  return (
    <div>
      <div className="ex-header">
        <div>
          <h3 className="ex-title">{ex.title}</h3>
          <p className="ex-prompt">{ex.prompt}</p>
        </div>
        <button className="btn btn--ghost" onClick={onCycle}>
          <RotateCcw size={14} /> otro problema
        </button>
      </div>

      <p className="eval-note">
        Las tablas ya están armadas. Para cada muestra calculá la media, el desvío estándar y el coeficiente de
        variación (usá las marcas de clase). Después decidí cuál es la más homogénea: se considera homogénea a una
        muestra con CV &lt; {CV_HOMOGENEA} %.
      </p>

      <div className="cmp-grid">
        {ex.samples.map((s, i) => {
          const p = i === 0 ? "a" : "b";
          return (
            <div className="cmp-card" key={s.tag}>
              <div className="cmp-card__title">
                Muestra {s.tag} · {s.label}
              </div>
              <GivenTable base={s.base} n={G[i].n} />
              <div className="cmp-fields">
                <label className="sturges-practice__field">
                  x̄ = {field(`${p}_mean`)} <span className="ans-suffix">{s.unit}</span>
                </label>
                <label className="sturges-practice__field">
                  σ = {field(`${p}_sd`)} <span className="ans-suffix">{s.unit}</span>
                </label>
                <label className="sturges-practice__field">
                  CV = {field(`${p}_cv`)} <span className="ans-suffix">%</span>
                </label>
              </div>
              <div className="cmp-question">
                ¿Es homogénea (CV &lt; {CV_HOMOGENEA} %)?
                <Choice
                  name={`hom${s.tag}`}
                  value={ans[`hom${s.tag}`]}
                  onChange={(v) => set(`hom${s.tag}`, v)}
                  options={[["si", "Sí"], ["no", "No"]]}
                  state={stateOf(`hom${s.tag}`)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="cmp-question cmp-question--main">
        La muestra más homogénea es:
        <Choice
          name="more"
          value={ans.more}
          onChange={(v) => set("more", v)}
          options={ex.samples.map((s) => [s.tag, `${s.tag} · ${s.label}`])}
          state={stateOf("more")}
        />
      </div>

      <InterpretationQuestion
        interp={ex.interp}
        name="interp"
        value={ans.interp}
        onChange={(v) => set("interp", v)}
        state={stateOf("interp")}
      />

      <div className="ex-actions" style={{ marginTop: 12 }}>
        <button className="btn btn--primary" onClick={verificar}>Verificar</button>
        <button className="btn btn--ghost" onClick={() => setShowDev((v) => !v)}>
          {showDev ? <EyeOff size={14} /> : <Eye size={14} />} {showDev ? "ocultar desarrollo" : "ver desarrollo"}
        </button>
      </div>
      {checked && (
        <p className={`ex-feedback ${score === keys.length ? "ex-feedback--ok" : "ex-feedback--bad"}`}>
          {score === keys.length
            ? "¡Correcto! Resolviste las dos muestras, la comparación y la interpretación."
            : `Acertaste ${score} de ${keys.length}. Los campos incorrectos muestran el valor correcto; si te trabás, mirá el desarrollo.`}
        </p>
      )}

      {showDev && (
        <>
          {ex.samples.map((s, i) => (
            <SampleSolution key={s.tag} s={s} g={G[i]} />
          ))}
          <h4 className="charts-title" style={{ marginTop: 20 }}>Gráficos de las dos muestras</h4>
          <p className="eval-note">
            Los histogramas muestran el % de datos en cada intervalo, así se pueden comparar aunque las muestras tengan
            distinto tamaño. En el diagrama de caja, mirá cuánto se aleja el 50 % central de la media.
          </p>
          <div className="cmp-grid">
            {ex.samples.map((s, i) => (
              <RelHistogram key={s.tag} g={G[i]} title={`Muestra ${s.tag} · ${s.label}`} />
            ))}
          </div>
          <BoxPlots
            items={ex.samples.map((s, i) => ({ label: s.label, unit: s.unit, g: G[i] }))}
            shared={ex.samples[0].unit === ex.samples[1].unit}
          />
          <Conclusion ex={ex} A={A} B={B} v={verdict} />
        </>
      )}
    </div>
  );
}
