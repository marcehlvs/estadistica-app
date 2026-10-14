// Verifica el generador de "comparar dos muestras con CV" con miles de semillas.
// Uso: node test/verify-cv.mjs
import { makeCompareExercise, analyzeTable, compareVerdict, COMPARE_SCENARIOS, CV_HOMOGENEA } from "../src/stats.js";

const fails = [];
const bad = (seed, msg) => fails.push(`semilla ${seed}: ${msg}`);
const count = {};
const pos = [0, 0, 0, 0]; // en qué lugar cae la opción correcta
let maxN = 0;
let minGap = Infinity;
let minMargin = Infinity;

// CV calculado "a mano", sin pasar por analyzeTable
const cvManual = (base) => {
  const n = base.reduce((a, r) => a + r.fi, 0);
  const x = base.reduce((a, r) => a + r.fi * ((r.lo + r.hi) / 2), 0) / n;
  const v = base.reduce((a, r) => a + r.fi * ((r.lo + r.hi) / 2 - x) ** 2, 0) / n;
  return { n, x, sd: Math.sqrt(v), cv: (Math.sqrt(v) / x) * 100 };
};

const SEEDS = 3000;
for (let seed = 1; seed <= SEEDS; seed++) {
  let ex;
  try { ex = makeCompareExercise(seed); } catch (e) { bad(seed, e.message); continue; }
  const again = makeCompareExercise(seed);
  if (JSON.stringify(again) !== JSON.stringify(ex)) bad(seed, "misma semilla, distinto ejercicio");

  const [sa, sb] = ex.samples;
  const [A, B] = [sa, sb].map((s) => analyzeTable(s.base));
  for (const [s, g] of [[sa, A], [sb, B]]) {
    const m = cvManual(s.base);
    if (Math.abs(m.cv - g.cv) > 1e-9 || Math.abs(m.x - g.mean) > 1e-9) bad(seed, `muestra ${s.tag}: CV no coincide con el cálculo manual`);
    if (g.n > 150) bad(seed, `muestra ${s.tag}: n = ${g.n} > 150`);
    if (s.base.length < 5 || s.base.length > 8) bad(seed, `muestra ${s.tag}: ${s.base.length} intervalos`);
    if (s.base.some((r) => r.fi === 0)) bad(seed, `muestra ${s.tag}: intervalo vacío`);
    s.base.forEach((r, i) => { if (i && r.lo !== s.base[i - 1].hi) bad(seed, `muestra ${s.tag}: intervalos no contiguos`); });
    if (!(g.mean > 0)) bad(seed, `muestra ${s.tag}: media no positiva`);
    maxN = Math.max(maxN, g.n);
    minMargin = Math.min(minMargin, Math.abs(g.cv - CV_HOMOGENEA));
  }
  minGap = Math.min(minGap, Math.abs(A.cv - B.cv));

  const v = compareVerdict(A, B);
  const expectMore = A.cv < B.cv ? "A" : "B";
  if (v.more !== expectMore) bad(seed, "más homogénea mal decidida");
  if (v.homA !== (A.cv < CV_HOMOGENEA) || v.homB !== (B.cv < CV_HOMOGENEA)) bad(seed, "criterio < 30 % mal aplicado");
  if (ex.scenario === "uno" && v.homA === v.homB) bad(seed, "uno: las dos dan igual");
  if (ex.scenario === "ambas" && !(v.homA && v.homB)) bad(seed, "ambas: alguna no es homogénea");
  if (ex.scenario === "ninguna" && (v.homA || v.homB)) bad(seed, "ninguna: alguna es homogénea");
  if (ex.scenario === "trampa" && !v.sdTrap) bad(seed, "trampa: el mayor σ no es el de menor CV");
  if (ex.scenario === "unidades" && sa.unit === sb.unit) bad(seed, "unidades: las dos variables tienen la misma unidad");
  if (ex.scenario !== "unidades" && sa.unit !== sb.unit) bad(seed, "misma variable con unidades distintas");
  const it = ex.interp;
  if (!it || it.options.length !== 4 || new Set(it.options.map((o) => o.text)).size !== 4) bad(seed, "interpretación: opciones mal armadas");
  else {
    const right = it.options.filter((o) => o.id === it.correct);
    if (right.length !== 1 || right[0].text !== it.correctText) bad(seed, "interpretación: la opción correcta no es única");
    pos[it.options.findIndex((o) => o.id === it.correct)]++;
  }
  count[ex.scenario] = (count[ex.scenario] || 0) + 1;
}

console.log("Escenarios:", count);
console.log("Lugar de la respuesta correcta (1.º a 4.º):", pos.join(" / "));
if (pos.some((c) => c < SEEDS * 0.15)) fails.push("la respuesta correcta casi siempre cae en el mismo lugar");
console.log(`n máximo: ${maxN} · menor distancia al 30 %: ${minMargin.toFixed(2)} · menor diferencia entre CV: ${minGap.toFixed(2)}`);
if (!COMPARE_SCENARIOS.every((s) => count[s] > 0)) fails.push("falta algún escenario");
if (fails.length) { console.log(`FALLAS (${fails.length}):`); fails.slice(0, 15).forEach((f) => console.log(" -", f)); process.exit(1); }
console.log(`ok: ${SEEDS} ejercicios, 0 fallas`);
