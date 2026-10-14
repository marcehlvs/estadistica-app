import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { groupedPercentile, round } from "./stats.js";

/* Gráficos para datos agrupados: histograma de frecuencias relativas,
   boxplot (resumen de cinco números) y ojiva (frecuencia acumulada).
   Todos reciben el resultado de analyzeGrouped / analyzeTable. */

const INK = "#1F3A34";
const TEAL = "#5FA8A0";
const AMBER = "#E8B33D";
const RED = "#B14E4E";
const MUTED = "#5A5142";

/** Histograma con el % de datos de cada intervalo (permite comparar muestras de distinto tamaño). */
export function RelHistogram({ g, title }) {
  const data = g.rows.map((r) => ({ label: r.label, pct: r.fr }));
  return (
    <div className="hist-box">
      {title && <div className="cmp-card__title">{title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap={0} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C4" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: MUTED }} interval={0} angle={-30} textAnchor="end" height={52} />
          <YAxis tick={{ fontSize: 10, fill: MUTED }} unit="%" />
          <Tooltip formatter={(v) => [`${v} %`, "Datos"]} />
          <Bar dataKey="pct" name="% de los datos" fill={TEAL} stroke={INK} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Marcas "redondas" (1, 2, 2.5, 5 × potencia de 10) entre lo y hi, unas 4 a 6. */
function niceTicks(lo, hi) {
  const raw = (hi - lo) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) * mag;
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(round(t, 6));
  return out;
}

/**
 * Un boxplot por muestra, calculado sobre la tabla agrupada:
 * bigotes = límites de la tabla, caja = Q₁–Q₃, raya = mediana, punto = media.
 * shared: todas comparten el mismo eje (solo tiene sentido si tienen la misma unidad).
 */
export function BoxPlots({ items, shared }) {
  const W = 560;
  const L = 16;
  const R = 16;
  const rowH = 78;
  const stats = items.map(({ label, unit, g }) => ({
    label,
    unit,
    min: g.rows[0].lo,
    max: g.rows[g.rows.length - 1].hi,
    q1: groupedPercentile(g, 25).value,
    me: groupedPercentile(g, 50).value,
    q3: groupedPercentile(g, 75).value,
    mean: g.mean,
  }));
  const gLo = Math.min(...stats.map((s) => s.min));
  const gHi = Math.max(...stats.map((s) => s.max));
  return (
    <div className="hist-box">
      <svg viewBox={`0 0 ${W} ${stats.length * rowH + 34}`} className="boxplots" role="img" aria-label="Diagramas de caja de las muestras">
        {stats.map((s, i) => {
          const lo = shared ? gLo : s.min;
          const hi = shared ? gHi : s.max;
          const X = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
          const y = i * rowH;
          const mid = y + 34;
          return (
            <g key={s.label}>
              <text x={L} y={y + 14} fontSize="12" fontWeight="700" fill={INK}>{`${s.label} (${s.unit})`}</text>
              <line x1={X(s.min)} x2={X(s.max)} y1={mid} y2={mid} stroke={INK} strokeWidth="1.5" />
              <line x1={X(s.min)} x2={X(s.min)} y1={mid - 7} y2={mid + 7} stroke={INK} strokeWidth="1.5" />
              <line x1={X(s.max)} x2={X(s.max)} y1={mid - 7} y2={mid + 7} stroke={INK} strokeWidth="1.5" />
              <rect x={X(s.q1)} y={mid - 14} width={Math.max(2, X(s.q3) - X(s.q1))} height="28" fill={TEAL} fillOpacity="0.55" stroke={INK} strokeWidth="1.5" />
              <line x1={X(s.me)} x2={X(s.me)} y1={mid - 14} y2={mid + 14} stroke={INK} strokeWidth="2.5" />
              <circle cx={X(s.mean)} cy={mid} r="4.5" fill={AMBER} stroke={INK} strokeWidth="1.2" />
              {niceTicks(lo, hi).map((t, k) => (
                <text key={k} x={X(t)} y={mid + 32} fontSize="10" textAnchor="middle" fill={MUTED}>{round(t, 1)}</text>
              ))}
            </g>
          );
        })}
        <text x={W / 2} y={stats.length * rowH + 26} fontSize="11" textAnchor="middle" fill={MUTED}>
          Caja: Q₁ a Q₃ · raya: mediana · punto amarillo: media · extremos: límites de la tabla
        </text>
      </svg>
      {!shared && <p className="hc-note" style={{ margin: "4px 8px 8px" }}>Cada diagrama tiene su propio eje: las variables están en unidades distintas.</p>}
    </div>
  );
}

/** Ojiva: frecuencia acumulada contra el límite superior de cada intervalo. */
export function Ojive({ g, res, unit }) {
  const pts = [{ x: g.rows[0].lo, F: 0 }, ...g.rows.map((r) => ({ x: r.hi, F: r.Fi }))];
  const ticks = pts.map((p) => p.x);
  return (
    <div className="hist-box">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={pts} margin={{ top: 10, right: 16, left: -6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C4" />
          <XAxis type="number" dataKey="x" domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tick={{ fontSize: 10, fill: MUTED }} />
          <YAxis type="number" domain={[0, g.n]} tick={{ fontSize: 10, fill: MUTED }} />
          <Tooltip formatter={(v) => [v, "Frec. acumulada"]} labelFormatter={(x) => `hasta ${x} ${unit || ""}`} />
          <Line type="linear" dataKey="F" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} isAnimationActive={false} />
          <ReferenceLine y={res.pos} stroke={RED} strokeDasharray="5 4" />
          <ReferenceLine x={res.value} stroke={RED} strokeDasharray="5 4" />
          <ReferenceDot x={res.value} y={res.pos} r={5} fill={RED} stroke="#fff" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
