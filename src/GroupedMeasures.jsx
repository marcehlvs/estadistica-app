import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import { AnswerInput, MeasureCard, DataBox } from "./ui.jsx";
import { analyzeGrouped, groupedPercentile, parseNum, tolFor, round } from "./stats.js";

const PCT_OPTIONS = [10, 20, 30, 40, 60, 70, 80, 90, 95];

/* ---------------------------------------------------------------- */
/* Desarrollo "a mano" de la regla de Sturges                          */
/* ---------------------------------------------------------------- */

export function SturgesDevelopment({ s }) {
  const limits = Array.from({ length: s.k + 1 }, (_, i) => s.min + i * s.amplitude);
  return (
    <div className="hand-calc">
      <p className="hc-title">1) Cantidad de intervalos — regla de Sturges</p>
      <p className="hc-formula">k = 1 + 3.322 · log₁₀(n)</p>
      <p>
        k = 1 + 3.322 · log₁₀({s.n}) = 1 + 3.322 · {round(s.log, 4)} = 1 + {round(3.322 * s.log, 4)} ={" "}
        {round(s.kRaw, 3)}
      </p>
      <p>
        Se redondea al entero más cercano → <strong>k = {s.k} intervalos</strong>
      </p>

      <p className="hc-title">2) Amplitud de cada intervalo</p>
      <p>
        Rango: R = máx − mín = {s.max} − {s.min} = <strong>{s.range}</strong>
      </p>
      <p className="hc-formula">A = R / k</p>
      <p>
        A = {s.range} / {s.k} = {round(s.ampRaw, 2)}
        {Number.isInteger(s.ampRaw) ? " (ya es entero)" : " → se redondea hacia arriba"} →{" "}
        <strong>A = {s.amplitude}</strong>
      </p>
      <p className="hc-note">
        Se redondea hacia arriba para que los {s.k} intervalos alcancen a cubrir el dato máximo: k · A ={" "}
        {s.k} · {s.amplitude} = {s.k * s.amplitude} ≥ {s.range}.
      </p>

      <p className="hc-title">3) Límites de los intervalos</p>
      <p>
        Se arranca en el mínimo ({s.min}) y se suma A = {s.amplitude} en cada paso: {limits.join(" → ")}
      </p>
      <p className="hc-note">
        Los intervalos son cerrados a la izquierda y abiertos a la derecha [ ), salvo el último, que es
        cerrado [ ] para incluir al máximo.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Tabla e histograma                                                  */
/* ---------------------------------------------------------------- */

function GroupedTable({ g }) {
  return (
    <div className="table-wrap">
      <table className="freq-table">
        <thead>
          <tr>
            <th>Intervalo</th>
            <th>Marca xᵢ</th>
            <th>fᵢ</th>
            <th>Fᵢ</th>
            <th>xᵢ · fᵢ</th>
            <th>fᵢ · (xᵢ − x̄)²</th>
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r, i) => (
            <tr key={i}>
              <td className="fc fc--label">{r.label}</td>
              <td className="fc fc--num">{r.mark}</td>
              <td className="fc fc--num">{r.fi}</td>
              <td className="fc fc--num">{r.Fi}</td>
              <td className="fc fc--num">{round(r.fx, 2)}</td>
              <td className="fc fc--num">{round(r.dev2, 2)}</td>
            </tr>
          ))}
          <tr>
            <td className="fc fc--total">Total</td>
            <td className="fc fc--total"></td>
            <td className="fc fc--total">{g.n}</td>
            <td className="fc fc--total"></td>
            <td className="fc fc--total">{round(g.sumFx, 2)}</td>
            <td className="fc fc--total">{round(g.sumDev2, 2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Histogram({ g }) {
  const data = g.rows.map((r) => ({ label: r.label, fi: r.fi }));
  return (
    <div className="hist-box">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap={0} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C4" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5A5142" }} />
          <YAxis tick={{ fontSize: 11, fill: "#5A5142" }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="fi" name="Frecuencia" fill="#5FA8A0" stroke="#1F3A34" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Desarrollo de cada medida                                           */
/* ---------------------------------------------------------------- */

function PercentileBody({ res, g, name }) {
  const r = res.row;
  const pos = round(res.pos, 2);
  return (
    <>
      <p>
        Posición: {res.p}% de n = {res.p}/100 · {g.n} = <strong>{pos}</strong>
      </p>
      <p>
        Clase: la primera con Fᵢ ≥ {pos} → <strong>{r.label}</strong> (Lᵢ = {r.lo}, Fᵢ₋₁ = {r.Fprev}, fᵢ ={" "}
        {r.fi}, A = {g.A})
      </p>
      <p>
        {name} = {r.lo} + (({pos} − {r.Fprev}) / {r.fi}) · {g.A} = <strong>{round(res.value)}</strong>
      </p>
    </>
  );
}

const PCT_FORMULA = (name) => `${name} = Lᵢ + ((p·n/100 − Fᵢ₋₁) / fᵢ) · A`;

/** Desarrollo completo: Sturges, tabla, histograma y todas las medidas. */
export function GroupedWorkedSolution({ g, unit, showSturges = true }) {
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [pct, setPct] = useState(90);
  const pRes = useMemo(() => groupedPercentile(g, pct), [g, pct]);
  const m = g.mode;
  const first = g.rows[0];
  const last = g.rows[g.rows.length - 1];

  return (
    <div>
      {showSturges && <SturgesDevelopment s={g.s} />}

      <h4 className="charts-title">Tabla de frecuencias</h4>
      <GroupedTable g={g} />
      <Histogram g={g} />

      <h4 className="charts-title" style={{ marginTop: 24 }}>Medidas de posición</h4>
      <div className="measures-grid">
        <MeasureCard
          label="Media (x̄)"
          value={round(g.mean)}
          unit={unit}
          formula="x̄ = Σ(xᵢ · fᵢ) / n"
          open={!!open.mean}
          onToggle={() => toggle("mean")}
        >
          <p>
            x̄ = {round(g.sumFx, 2)} / {g.n} = <strong>{round(g.mean)}</strong>
          </p>
          <p className="hc-note">Cada dato se reemplaza por la marca de clase de su intervalo.</p>
        </MeasureCard>

        <MeasureCard
          label="Mediana (Me)"
          value={round(g.median.value)}
          unit={unit}
          formula="Me = Lᵢ + ((n/2 − Fᵢ₋₁) / fᵢ) · A"
          open={!!open.median}
          onToggle={() => toggle("median")}
        >
          <PercentileBody res={g.median} g={g} name="Me" />
        </MeasureCard>

        <MeasureCard
          label="Moda (Mo)"
          value={round(m.value)}
          unit={unit}
          formula="Mo = Lᵢ + d₁ / (d₁ + d₂) · A"
          open={!!open.mode}
          onToggle={() => toggle("mode")}
        >
          <p>
            Clase modal (mayor fᵢ): <strong>{m.row.label}</strong>, con fᵢ = {m.row.fi}
          </p>
          <p>
            d₁ = fᵢ − fᵢ₋₁ = {m.row.fi} − {m.prev} = {m.d1}
            {m.idx === 0 && " (es la primera clase: fᵢ₋₁ = 0)"}
          </p>
          <p>
            d₂ = fᵢ − fᵢ₊₁ = {m.row.fi} − {m.next} = {m.d2}
            {m.idx === g.rows.length - 1 && " (es la última clase: fᵢ₊₁ = 0)"}
          </p>
          <p>
            Mo = {m.row.lo} + {m.d1} / ({m.d1} + {m.d2}) · {g.A} = <strong>{round(m.value)}</strong>
          </p>
        </MeasureCard>

        <MeasureCard
          label="Cuartil 1 (Q₁)"
          value={round(g.q1.value)}
          unit={unit}
          formula="Q₁ = Lᵢ + ((n/4 − Fᵢ₋₁) / fᵢ) · A"
          open={!!open.q1}
          onToggle={() => toggle("q1")}
        >
          <PercentileBody res={g.q1} g={g} name="Q₁" />
        </MeasureCard>

        <MeasureCard
          label="Cuartil 3 (Q₃)"
          value={round(g.q3.value)}
          unit={unit}
          formula="Q₃ = Lᵢ + ((3n/4 − Fᵢ₋₁) / fᵢ) · A"
          open={!!open.q3}
          onToggle={() => toggle("q3")}
        >
          <PercentileBody res={g.q3} g={g} name="Q₃" />
        </MeasureCard>

        <MeasureCard
          label={`Percentil ${pct} (P${pct})`}
          value={round(pRes.value)}
          unit={unit}
          formula={PCT_FORMULA(`P${pct}`)}
          open={!!open.pct}
          onToggle={() => toggle("pct")}
        >
          <p>
            Elegí el percentil:{" "}
            <select
              className="pct-select"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
            >
              {PCT_OPTIONS.map((p) => (
                <option key={p} value={p}>P{p}</option>
              ))}
            </select>
          </p>
          <PercentileBody res={pRes} g={g} name={`P${pct}`} />
        </MeasureCard>
      </div>

      <h4 className="charts-title" style={{ marginTop: 24 }}>Medidas de dispersión</h4>
      <div className="measures-grid">
        <MeasureCard
          label="Rango"
          value={g.range}
          unit={unit}
          formula="Rango = límite superior del último − límite inferior del primero"
          open={!!open.range}
          onToggle={() => toggle("range")}
        >
          <p>
            Rango = {last.hi} − {first.lo} = <strong>{g.range}</strong>
          </p>
          <p className="hc-note">En datos agrupados el rango se mide sobre los límites de la tabla.</p>
        </MeasureCard>

        <MeasureCard
          label="Rango intercuartil"
          value={round(g.iqr)}
          unit={unit}
          formula="RIC = Q₃ − Q₁"
          open={!!open.iqr}
          onToggle={() => toggle("iqr")}
        >
          <p>
            RIC = {round(g.q3.value)} − {round(g.q1.value)} = <strong>{round(g.iqr)}</strong>
          </p>
          <p className="hc-note">Es el ancho del 50% central de los datos.</p>
        </MeasureCard>

        <MeasureCard
          label="Varianza (σ²)"
          value={round(g.variance)}
          unit=""
          formula="σ² = Σ fᵢ · (xᵢ − x̄)² / n"
          open={!!open.variance}
          onToggle={() => toggle("variance")}
        >
          <p>
            σ² = {round(g.sumDev2, 2)} / {g.n} = <strong>{round(g.variance)}</strong>
          </p>
          <p className="hc-note">
            El numerador es el total de la última columna de la tabla, con x̄ = {round(g.mean)}.
          </p>
        </MeasureCard>

        <MeasureCard
          label="Desvío estándar (σ)"
          value={round(g.sd)}
          unit={unit}
          formula="σ = √σ²"
          open={!!open.sd}
          onToggle={() => toggle("sd")}
        >
          <p>
            σ = √{round(g.variance)} = <strong>{round(g.sd)}</strong> {unit}
          </p>
        </MeasureCard>

        <MeasureCard
          label="Coef. de variación (CV)"
          value={`${round(g.cv, 1)} %`}
          unit=""
          formula="CV = σ / x̄ · 100"
          open={!!open.cv}
          onToggle={() => toggle("cv")}
        >
          <p>
            CV = {round(g.sd)} / {round(g.mean)} · 100 = <strong>{round(g.cv, 1)} %</strong>
          </p>
          <p className="hc-note">Mide la dispersión relativa al promedio: sirve para comparar variables con distintas unidades.</p>
        </MeasureCard>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Módulo (solapa 3, modo "datos agrupados")                          */
/* ---------------------------------------------------------------- */

export default function GroupedMeasures({ set, onCycle }) {
  const g = useMemo(() => analyzeGrouped(set.data), [set]);

  const [kGuess, setKGuess] = useState("");
  const [aGuess, setAGuess] = useState("");
  const [checked, setChecked] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [meanGuess, setMeanGuess] = useState("");
  const [meanChecked, setMeanChecked] = useState(false);

  const kOk = parseNum(kGuess) === g.k;
  const aOk = parseNum(aGuess) === g.A;
  const sturgesOk = checked && kOk && aOk;
  const tableVisible = sturgesOk || showDev;
  const meanOk = Math.abs(parseNum(meanGuess) - g.mean) <= tolFor(g.mean);

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

      <DataBox label="Datos relevados" data={set.data} />

      <h4 className="charts-title">Paso 1 · ¿Cuántos intervalos?</h4>
      <div className="sturges-practice">
        <p>
          Los datos no vienen agrupados, así que hay que armar los intervalos. Con la regla de Sturges,
          k = 1 + 3.322 · log₁₀(n), donde n = {g.n}. Después, la amplitud es A = R / k (redondeá hacia
          arriba). Dato útil: el mínimo es {g.s.min} y el máximo es {g.s.max}.
        </p>
        <div className="sturges-practice__grid">
          <label className="sturges-practice__field">
            k =
            <AnswerInput
              value={kGuess}
              onChange={(v) => { setKGuess(v); setChecked(false); }}
              state={checked ? (kOk ? "ok" : "bad") : undefined}
              width={56}
            />
          </label>
          <label className="sturges-practice__field">
            A =
            <AnswerInput
              value={aGuess}
              onChange={(v) => { setAGuess(v); setChecked(false); }}
              state={checked ? (aOk ? "ok" : "bad") : undefined}
              width={56}
            />
          </label>
        </div>
        <div className="ex-actions" style={{ marginTop: 10 }}>
          <button className="btn btn--primary" onClick={() => setChecked(true)}>Verificar</button>
          <button className="btn btn--ghost" onClick={() => setShowDev((v) => !v)}>
            {showDev ? <EyeOff size={14} /> : <Eye size={14} />} {showDev ? "ocultar desarrollo" : "ver desarrollo"}
          </button>
        </div>
        {checked && (
          <p className={`ex-feedback ${sturgesOk ? "ex-feedback--ok" : "ex-feedback--bad"}`}>
            {sturgesOk
              ? "¡Correcto! Ya podés armar la tabla."
              : `${kOk ? "k está bien" : "Revisá k"}${aOk ? ", A está bien" : ", revisá A"}. Si te trabás, mirá el desarrollo.`}
          </p>
        )}
      </div>

      {showDev && <SturgesDevelopment s={g.s} />}

      {tableVisible ? (
        <>
          <div className="mean-practice" style={{ marginTop: 14 }}>
            <p>
              Antes de ver los resultados: con la tabla de abajo, calculá vos la <strong>media</strong>{" "}
              (usá las marcas de clase).
            </p>
            <div className="mean-practice__row">
              <AnswerInput
                value={meanGuess}
                onChange={(v) => { setMeanGuess(v); setMeanChecked(false); }}
                width={80}
                state={meanChecked ? (meanOk ? "ok" : "bad") : undefined}
              />
              <button className="btn btn--primary" onClick={() => setMeanChecked(true)}>Verificar</button>
            </div>
            {meanChecked && (
              <p className={meanOk ? "ex-feedback ex-feedback--ok" : "ex-feedback ex-feedback--bad"}>
                {meanOk
                  ? "¡Correcto!"
                  : `Todavía no — la media real es ${round(g.mean)}. Abrí la tarjeta de la media para ver el desarrollo.`}
              </p>
            )}
          </div>

          <GroupedWorkedSolution g={g} unit={set.unit} showSturges={false} />
        </>
      ) : (
        <p className="eval-note" style={{ marginTop: 14 }}>
          Resolvé el paso 1 (o tocá «ver desarrollo») para armar la tabla y ver las medidas.
        </p>
      )}
    </div>
  );
}
