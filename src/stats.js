/* ---------------------------------------------------------------- */
/* Cálculos de estadística                                            */
/* ---------------------------------------------------------------- */

export function round(x, d = 2) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** Lee lo que escribió el estudiante ("12,5", "45 %", "") → número o NaN. */
export function parseNum(raw) {
  const s = String(raw ?? "").replace("%", "").replace(",", ".").trim();
  return s === "" ? NaN : Number(s);
}

/** Margen de error aceptado por redondeos hechos a mano: 0.3% del valor, mínimo 0.05. */
export function tolFor(v) {
  return Math.max(0.05, Math.abs(v) * 0.003);
}

/* ---------- Datos sueltos (código original, sin cambios) ---------- */

export function ungroupedRows(data) {
  const n = data.length;
  const values = [...new Set(data)].sort((a, b) => a - b);
  let cum = 0;
  return values.map((v) => {
    const fi = data.filter((x) => x === v).length;
    cum += fi;
    return { label: String(v), fi, fr: Math.round((fi / n) * 1000) / 10, fa: cum };
  });
}

export function getIntervals(data, width) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  let start = Math.floor(min / width) * width;
  let end = Math.ceil(max / width) * width;
  if (end === max) end += width;
  const intervals = [];
  for (let l = start; l < end; l += width) intervals.push([l, l + width]);
  return intervals;
}

export function groupedRows(data, width) {
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

export function computeStats(data) {
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

/* ---------- Datos agrupados ---------- */

/**
 * Regla de Sturges + amplitud.
 *   k = 1 + 3.322 · log10(n)   → se redondea al entero más cercano
 *   A = R / k                  → se redondea HACIA ARRIBA (datos enteros)
 * Redondear A hacia arriba garantiza k·A ≥ R, o sea que los k intervalos
 * cubren todos los datos.
 */
export function sturges(data) {
  const n = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const log = Math.log10(n);
  const kRaw = 1 + 3.322 * log;
  const k = Math.round(kRaw);
  const ampRaw = range / k;
  const amplitude = Math.ceil(ampRaw);
  return { n, min, max, range, log, kRaw, k, ampRaw, amplitude };
}

/**
 * Arma la tabla agrupada con k intervalos de amplitud A que arrancan en el
 * mínimo. Intervalos [Li, Ls) y el último cerrado [Li, Ls] (igual que el
 * resto de la app).
 */
export function buildGroupedTable(data, k, A) {
  const n = data.length;
  const start = Math.min(...data);
  let cum = 0;
  const rows = [];
  for (let i = 0; i < k; i++) {
    const lo = start + i * A;
    const hi = lo + A;
    const isLast = i === k - 1;
    const fi = data.filter((x) => x >= lo && (isLast ? x <= hi : x < hi)).length;
    const Fprev = cum;
    cum += fi;
    rows.push({
      lo,
      hi,
      label: `[${lo} - ${hi}${isLast ? "]" : ")"}`,
      mark: (lo + hi) / 2,
      fi,
      Fprev,
      Fi: cum,
      fr: round((fi / n) * 100, 1),
    });
  }
  return rows;
}

/**
 * Percentil por interpolación dentro de la clase:
 *   pos = p·n/100
 *   clase = primera con Fi ≥ pos
 *   P = Li + ((pos − F(i−1)) / fi) · A
 * (Q1 = P25, Mediana = P50, Q3 = P75)
 */
export function groupedPercentile(g, p) {
  const pos = (p * g.n) / 100;
  const idx = g.rows.findIndex((r) => r.Fi >= pos);
  const row = g.rows[idx];
  const value = row.lo + ((pos - row.Fprev) / row.fi) * g.A;
  return { p, pos, idx, row, value };
}

/**
 * Moda por interpolación:
 *   Mo = Li + d1/(d1 + d2) · A
 *   d1 = fi − f(i−1)   d2 = fi − f(i+1)
 */
export function groupedMode(rows, A) {
  const maxF = Math.max(...rows.map((r) => r.fi));
  const idx = rows.findIndex((r) => r.fi === maxF);
  const row = rows[idx];
  const prev = idx > 0 ? rows[idx - 1].fi : 0;
  const next = idx < rows.length - 1 ? rows[idx + 1].fi : 0;
  const d1 = row.fi - prev;
  const d2 = row.fi - next;
  const tied = rows.filter((r) => r.fi === maxF).length > 1;
  const value = d1 + d2 === 0 ? row.mark : row.lo + (d1 / (d1 + d2)) * A;
  return { idx, row, prev, next, d1, d2, tied, value };
}

/** Todo junto: Sturges → tabla → medidas de posición y dispersión. */
export function analyzeGrouped(data) {
  const s = sturges(data);
  const { n, k, amplitude: A } = s;
  const base = buildGroupedTable(data, k, A);
  const sumFx = base.reduce((a, r) => a + r.fi * r.mark, 0);
  const mean = sumFx / n;
  const rows = base.map((r) => ({
    ...r,
    fx: r.fi * r.mark,
    dev2: r.fi * (r.mark - mean) ** 2,
  }));
  const sumDev2 = rows.reduce((a, r) => a + r.dev2, 0);
  const variance = sumDev2 / n; // varianza poblacional, igual que en datos sueltos
  const sd = Math.sqrt(variance);
  const g = { n, k, A, s, rows, sumFx, mean, sumDev2, variance, sd };
  g.cv = (sd / mean) * 100;
  g.range = rows[rows.length - 1].hi - rows[0].lo;
  g.median = groupedPercentile(g, 50);
  g.q1 = groupedPercentile(g, 25);
  g.q3 = groupedPercentile(g, 75);
  g.iqr = g.q3.value - g.q1.value;
  g.mode = groupedMode(rows, A);
  return g;
}

/* ---------------------------------------------------------------- */
/* Generador de ejercicios para el modo evaluación                     */
/* ---------------------------------------------------------------- */

/** Generador pseudoaleatorio con semilla: misma evaluación N.º → mismos datos. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function weighted(rng, values, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < values.length; i++) {
    r -= weights[i];
    if (r < 0) return values[i];
  }
  return values[values.length - 1];
}

/** Datos sueltos (variable discreta), n entre 36 y 50. */
const UNGROUPED_THEMES = [
  {
    title: "Hermanos y hermanas",
    prompt: (n) => `Se relevó a ${n} estudiantes del colegio: ¿cuántos hermanos o hermanas tiene cada uno?`,
    unit: "hermanos/as",
    n: 40,
    values: [0, 1, 2, 3, 4, 5],
    weights: [10, 32, 28, 16, 9, 5],
  },
  {
    title: "Goles por partido",
    prompt: (n) => `Goles convertidos por el equipo del colegio en ${n} partidos del torneo intercolegial.`,
    unit: "goles",
    n: 36,
    values: [0, 1, 2, 3, 4, 5],
    weights: [14, 30, 25, 17, 9, 5],
  },
  {
    title: "Libros leídos en el año",
    prompt: (n) => `Cantidad de libros que leyeron durante el año ${n} estudiantes de 5° año.`,
    unit: "libros",
    n: 45,
    values: [0, 1, 2, 3, 4, 5, 6],
    weights: [8, 16, 24, 22, 16, 9, 5],
  },
  {
    title: "Aciertos en un test",
    prompt: (n) => `Respuestas correctas (de 8 preguntas) de ${n} estudiantes en un test de opción múltiple.`,
    unit: "aciertos",
    n: 50,
    values: [2, 3, 4, 5, 6, 7, 8],
    weights: [4, 9, 15, 22, 24, 16, 10],
  },
];

/** Datos agrupados (variable continua medida en enteros), n ≤ 150. */
const GROUPED_THEMES = [
  {
    title: "Estaturas de estudiantes",
    prompt: (n) => `Estaturas (en cm) de ${n} estudiantes de un colegio.`,
    unit: "cm",
    n: 100,
    gen: (rng) => clamp(Math.round(165 + 8 * gauss(rng)), 135, 200),
  },
  {
    title: "Puntajes en un test de aptitud",
    prompt: (n) => `Puntajes (sobre 100) obtenidos por ${n} aspirantes en un test de aptitud.`,
    unit: "puntos",
    n: 80,
    gen: (rng) => clamp(Math.round(62 + 14 * gauss(rng)), 0, 100),
  },
  {
    title: "Tiempo de traslado a la escuela",
    prompt: (n) => `Minutos que tardan en llegar a la escuela ${n} estudiantes.`,
    unit: "minutos",
    n: 120,
    gen: (rng) => clamp(Math.round(4 - 7 * Math.log(1 - rng()) - 7 * Math.log(1 - rng())), 3, 90),
  },
  {
    title: "Edades de los socios de un club",
    prompt: (n) => `Edades (en años) de ${n} socios de un club de barrio.`,
    unit: "años",
    n: 110,
    gen: (rng) => clamp(Math.round(13 - 10 * Math.log(1 - rng()) - 8 * Math.log(1 - rng())), 12, 75),
  },
];

const NEAR_HALF = 0.03; // evita n cuyo k de Sturges cae justo en x.5 (ambiguo a mano)

function kIsClear(n) {
  const kRaw = 1 + 3.322 * Math.log10(n);
  return Math.abs(kRaw - Math.floor(kRaw) - 0.5) > NEAR_HALF;
}

/** Ejercicio 1: datos NO agrupados. Moda única y al menos 5 valores distintos. */
export function makeUngroupedExercise(seed) {
  const theme = UNGROUPED_THEMES[(seed - 1 + UNGROUPED_THEMES.length * 1000) % UNGROUPED_THEMES.length];
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = mulberry32(seed * 7919 + attempt);
    const data = Array.from({ length: theme.n }, () => weighted(rng, theme.values, theme.weights));
    const st = computeStats(data);
    if (st.modes.length === 1 && new Set(data).size >= 5) {
      return { title: theme.title, prompt: theme.prompt(theme.n), unit: theme.unit, data };
    }
  }
  throw new Error("No se pudo generar el ejercicio de datos sueltos");
}

/**
 * Ejercicio 2: datos AGRUPADOS (intervalos por Sturges), n ≤ 150.
 * Condiciones para que el desarrollo sea limpio: sin intervalos vacíos,
 * una única clase modal con d1 + d2 > 0, y k de Sturges sin ambigüedad.
 */
export function makeGroupedExercise(seed) {
  const theme = GROUPED_THEMES[(seed * 3 + 1000) % GROUPED_THEMES.length];
  if (theme.n > 150 || !kIsClear(theme.n)) throw new Error("Tema inválido: n ≤ 150 y k sin ambigüedad");
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = mulberry32(seed * 104729 + attempt);
    const data = Array.from({ length: theme.n }, () => theme.gen(rng));
    const g = analyzeGrouped(data);
    const ok =
      g.rows.every((r) => r.fi > 0) &&
      !g.mode.tied &&
      g.mode.d1 + g.mode.d2 > 0 &&
      g.k * g.A - g.s.range < g.A; // el último intervalo no queda vacío
    if (ok) return { title: theme.title, prompt: theme.prompt(theme.n), unit: theme.unit, data };
  }
  throw new Error("No se pudo generar el ejercicio de datos agrupados");
}

export { GROUPED_THEMES, UNGROUPED_THEMES };
