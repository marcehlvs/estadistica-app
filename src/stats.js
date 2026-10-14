/* ---------------------------------------------------------------- */
/* Cálculos de estadística                                            */
/* ---------------------------------------------------------------- */

export function round(x, d = 2) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** Número para mostrarle al estudiante, con coma decimal y sin separador de miles (así puede tipearlo igual). */
export function fmt(x, d = 2) {
  return String(round(x, d)).replace(".", ",");
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

/* ---------------------------------------------------------------- */
/* Comparar dos muestras con el coeficiente de variación               */
/* ---------------------------------------------------------------- */

/** Una muestra se considera homogénea si su CV es menor que este valor (%). */
export const CV_HOMOGENEA = 30;

/**
 * Análisis de una tabla de frecuencias que YA viene armada.
 * base = [{ lo, hi, fi }, ...]  (intervalos [lo, hi), el último cerrado).
 * Misma convención que analyzeGrouped: varianza poblacional, marcas de clase.
 */
export function analyzeTable(base) {
  const n = base.reduce((a, r) => a + r.fi, 0);
  let cum = 0;
  const rows0 = base.map((r, i) => {
    const Fprev = cum;
    cum += r.fi;
    const isLast = i === base.length - 1;
    return {
      lo: r.lo,
      hi: r.hi,
      label: `[${r.lo} - ${r.hi}${isLast ? "]" : ")"}`,
      mark: (r.lo + r.hi) / 2,
      fi: r.fi,
      Fprev,
      Fi: cum,
      fr: round((r.fi / n) * 100, 1),
    };
  });
  const sumFx = rows0.reduce((a, r) => a + r.fi * r.mark, 0);
  const mean = sumFx / n;
  const rows = rows0.map((r) => ({ ...r, fx: r.fi * r.mark, dev2: r.fi * (r.mark - mean) ** 2 }));
  const sumDev2 = rows.reduce((a, r) => a + r.dev2, 0);
  const variance = sumDev2 / n;
  const sd = Math.sqrt(variance);
  return { n, A: base[0].hi - base[0].lo, rows, sumFx, mean, sumDev2, variance, sd, cv: (sd / mean) * 100 };
}

/**
 * Conclusión de la comparación entre la muestra A y la B (resultados de analyzeTable).
 *   homA / homB : CV < 30 %
 *   more        : la más homogénea es la de menor CV
 *   sdTrap      : el mayor desvío estándar es el de la muestra MÁS homogénea
 *                 (pasa cuando las medias son muy distintas)
 */
export function compareVerdict(A, B) {
  return {
    homA: A.cv < CV_HOMOGENEA,
    homB: B.cv < CV_HOMOGENEA,
    more: A.cv < B.cv ? "A" : "B",
    sdTrap: (A.sd - B.sd) * (A.cv - B.cv) < 0,
  };
}

const COMPARE_THEMES = [
  {
    title: "Sueldos en dos sucursales",
    unit: "miles de $",
    labels: ["Sucursal Centro", "Sucursal Norte"],
    mean: [300, 900],
    min: 150,
    intro: (a, b) => `Sueldos mensuales (en miles de pesos) de los empleados de dos sucursales de una cadena de ropa: ${a} y ${b}.`,
  },
  {
    title: "Espera en dos bancos",
    unit: "minutos",
    labels: ["Banco del Parque", "Banco de la Plaza"],
    mean: [6, 24],
    min: 1,
    intro: (a, b) => `Minutos que esperaron para ser atendidos los clientes de dos bancos: ${a} y ${b}.`,
  },
  {
    title: "Producción de dos máquinas",
    unit: "piezas",
    labels: ["Máquina 1", "Máquina 2"],
    mean: [80, 260],
    min: 20,
    intro: (a, b) => `Piezas producidas por día durante un período, por dos máquinas de una fábrica: ${a} y ${b}.`,
  },
  {
    title: "Duración de baterías",
    unit: "horas",
    labels: ["Marca X", "Marca Y"],
    mean: [60, 200],
    min: 10,
    intro: (a, b) => `Horas de duración de baterías de dos marcas, probadas en un laboratorio: ${a} y ${b}.`,
  },
  {
    title: "Edades de los visitantes de dos museos",
    unit: "años",
    labels: ["Museo de Ciencias", "Museo de Arte"],
    mean: [18, 50],
    min: 6,
    intro: (a, b) => `Edades (en años) de los visitantes de un día en dos museos: ${a} y ${b}.`,
  },
];

/**
 * Dos variables DISTINTAS (con unidades distintas) medidas en el mismo grupo:
 * no se pueden comparar los desvíos estándar, hay que usar el CV.
 */
const UNIT_THEMES = [
  {
    title: "Estatura y peso de estudiantes",
    intro: "Estatura (en cm) y peso (en kg) de los estudiantes de un curso.",
    samples: [
      { label: "Estatura", unit: "cm", mean: [160, 175], cv: [3.5, 5.5], min: 120 },
      { label: "Peso", unit: "kg", mean: [52, 68], cv: [11, 17], min: 30 },
    ],
  },
  {
    title: "Sueldo y antigüedad de empleados",
    intro: "Sueldo mensual (en miles de pesos) y antigüedad (en años) de los empleados de una empresa.",
    samples: [
      { label: "Sueldo", unit: "miles de $", mean: [400, 800], cv: [18, 25], min: 150 },
      { label: "Antigüedad", unit: "años", mean: [6, 14], cv: [40, 55], min: 1 },
    ],
  },
  {
    title: "Tiempo de estudio y nota",
    intro: "Minutos de estudio por día y nota del último examen (sobre 100) de los estudiantes de un curso.",
    samples: [
      { label: "Minutos de estudio", unit: "minutos", mean: [60, 120], cv: [38, 50], min: 5 },
      { label: "Nota del examen", unit: "puntos", mean: [60, 80], cv: [12, 20], min: 10 },
    ],
  },
];

/**
 * Escenarios, para que no todos los problemas den lo mismo:
 *   uno       → una muestra homogénea y la otra no
 *   trampa    → la muestra con mayor desvío estándar es la más homogénea
 *   ambas     → las dos homogéneas (hay que decidir cuál lo es más)
 *   ninguna   → ninguna homogénea (igual hay una "menos heterogénea")
 *   unidades  → dos variables con unidades distintas
 */
const COMPARE_SCENARIOS = ["uno", "trampa", "ambas", "ninguna", "unidades"];

const NICE_AMPLITUDES = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200];

/** Intervalos de amplitud "linda" (5 a 8 clases) que cubren todos los datos. */
function bucketize(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  for (const A of NICE_AMPLITUDES) {
    const lo0 = Math.floor(min / A) * A;
    const k = Math.floor((max - lo0) / A) + 1;
    if (k > 8) continue;
    if (k < 5) return null;
    return Array.from({ length: k }, (_, i) => {
      const lo = lo0 + i * A;
      const hi = lo + A;
      const last = i === k - 1;
      return { lo, hi, fi: data.filter((x) => x >= lo && (last ? x <= hi : x < hi)).length };
    });
  }
  return null;
}

function sampleData(rng, n, mean, cv, minVal) {
  const sd = (mean * cv) / 100;
  return Array.from({ length: n }, () => Math.max(minVal, Math.round(mean + sd * gauss(rng))));
}

/** Objetivos de CV (%) y de medias para los escenarios con una misma variable. */
function scenarioTargets(rng, scenario, [mLo, mHi]) {
  const u = (a, b) => a + rng() * (b - a);
  const mean1 = u(mLo, mLo + (mHi - mLo) * 0.5);
  let cvs;
  let means = [mean1, u(mLo + (mHi - mLo) * 0.3, mHi)];
  if (scenario === "uno") cvs = [u(12, 22), u(37, 48)];
  else if (scenario === "ambas") cvs = [u(10, 17), u(21, 26)];
  else if (scenario === "ninguna") cvs = [u(34, 40), u(44, 54)];
  else {
    // trampa: A tiene media mucho mayor, desvío mayor y CV menor
    cvs = [u(11, 17), u(21, 27)];
    means = [mean1 * u(2.3, 3), mean1];
  }
  if (rng() < 0.5) {
    cvs.reverse();
    means.reverse();
  }
  return { cvs, means };
}

const HOMOGENEA_MARGIN = 2.5; // ningún CV queda a menos de 2,5 puntos del 30 %
const CV_GAP = 3; // los dos CV difieren al menos 3 puntos: hay una ganadora clara

function scenarioHolds(scenario, A, B) {
  const v = compareVerdict(A, B);
  if (Math.abs(A.cv - CV_HOMOGENEA) < HOMOGENEA_MARGIN || Math.abs(B.cv - CV_HOMOGENEA) < HOMOGENEA_MARGIN) return false;
  if (Math.abs(A.cv - B.cv) < CV_GAP) return false;
  if (scenario === "uno") return v.homA !== v.homB;
  if (scenario === "ambas") return v.homA && v.homB;
  if (scenario === "ninguna") return !v.homA && !v.homB;
  if (scenario === "unidades") return true;
  return v.homA && v.homB && v.sdTrap && Math.abs(A.sd - B.sd) / Math.max(A.sd, B.sd) > 0.15;
}

/**
 * Pregunta de interpretación (opción múltiple, 4 opciones, una correcta).
 * Las incorrectas son razonamientos inválidos, no afirmaciones sobre los datos,
 * para que nunca haya dos respuestas posibles.
 */
function makeInterpretation(seed, scenario, samples, A, B, v) {
  const [sa, sb] = samples;
  const win = v.more === "A" ? sa : sb;
  let prompt;
  let right;
  let wrong;
  if (scenario === "unidades") {
    prompt = `${sa.label} está en ${sa.unit} y ${sb.label} en ${sb.unit}. ¿Por qué se las compara con el coeficiente de variación y no con los desvíos estándar?`;
    right = "Porque las unidades son distintas: el CV no tiene unidad y mide la dispersión relativa a la media.";
    wrong = [
      "Porque el desvío estándar solo se puede calcular con datos sin agrupar.",
      "Porque el desvío estándar nunca puede ser mayor que la media.",
      "Porque el CV se mide en las mismas unidades que cada variable.",
    ];
  } else if (v.sdTrap) {
    const big = A.sd > B.sd ? sa : sb;
    prompt = `${big.label} tiene el desvío estándar más grande, pero resultó la muestra más homogénea. ¿Cómo se explica?`;
    right = `El CV compara el desvío con la media, y la media de ${big.label} también es mayor.`;
    wrong = [
      "Hubo un error de cálculo: con mayor desvío no puede ser más homogénea.",
      "El CV depende solo de la cantidad de datos de cada muestra.",
      "Porque el desvío estándar y el CV siempre dan resultados opuestos.",
    ];
  } else if (scenario === "uno") {
    const het = v.homA ? sb : sa;
    const cvHet = v.homA ? B.cv : A.cv;
    prompt = `${het.label} tiene un CV de ${round(cvHet, 1)} %. ¿Qué indica ese valor?`;
    right = "Que sus datos están muy dispersos en relación con la media: no es homogénea.";
    wrong = [
      "Que sus datos son muy parejos: es homogénea.",
      "Que hay valores atípicos y hay que descartarlos antes de calcular.",
      "Que la muestra tiene pocos datos.",
    ];
  } else if (scenario === "ambas") {
    prompt = "Las dos muestras son homogéneas (CV < 30 %). ¿Se puede decir cuál lo es más?";
    right = `Sí: lo es más ${win.label}, porque su CV es menor.`;
    wrong = [
      "No: si las dos tienen CV < 30 % son igual de homogéneas.",
      "Sí: lo es más la de mayor CV.",
      "Sí: lo es más la de mayor media.",
    ];
  } else {
    prompt = "Ninguna muestra es homogénea (CV ≥ 30 %). ¿Igual se puede decir cuál es más homogénea?";
    right = `Sí: ${win.label}, que tiene el menor CV, aunque ninguna llegue a ser homogénea.`;
    wrong = [
      "No: sin CV < 30 % no se pueden comparar.",
      "Sí: la de mayor CV.",
      "Sí: la de menor desvío estándar, siempre.",
    ];
  }
  // mezcla con semilla: la correcta no queda siempre en el mismo lugar
  const texts = [right, ...wrong];
  const order = texts.map((_, i) => i);
  const rng = mulberry32(seed * 13 + 7);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const options = order.map((i, pos) => ({ id: `o${pos}`, text: texts[i] }));
  return { prompt, options, correct: options[order.indexOf(0)].id, correctText: right };
}

/**
 * Ejercicio: dos muestras ya agrupadas (tabla de frecuencias dada), n ≤ 150 cada una.
 * Se pide x̄, σ y CV de cada una, decidir cuál es más homogénea (CV < 30 %) e interpretar.
 * Misma semilla → mismo ejercicio.
 */
export function makeCompareExercise(seed) {
  const nSc = COMPARE_SCENARIOS.length;
  const scenario = COMPARE_SCENARIOS[(seed - 1) % nSc];
  const cycle = Math.floor((seed - 1) / nSc);
  const units = scenario === "unidades";
  const theme = units ? UNIT_THEMES[cycle % UNIT_THEMES.length] : COMPARE_THEMES[cycle % COMPARE_THEMES.length];
  const sizes = [40, 45, 50, 60, 70, 80];
  for (let attempt = 0; attempt < 800; attempt++) {
    const rng = mulberry32(seed * 7919 + attempt * 31 + 5);
    let specs;
    if (units) {
      const u = (a, b) => a + rng() * (b - a);
      specs = theme.samples.map((sp) => ({ ...sp, meanT: u(...sp.mean), cvT: u(...sp.cv) }));
      if (rng() < 0.5) specs.reverse();
    } else {
      const { cvs, means } = scenarioTargets(rng, scenario, theme.mean);
      specs = [0, 1].map((i) => ({ label: theme.labels[i], unit: theme.unit, meanT: means[i], cvT: cvs[i], min: theme.min }));
    }
    const tables = specs.map((sp) => {
      const n = sizes[Math.floor(rng() * sizes.length)];
      return bucketize(sampleData(rng, n, sp.meanT, sp.cvT, sp.min));
    });
    if (tables.some((t) => !t || t.some((r) => r.fi === 0))) continue;
    const [A, B] = tables.map(analyzeTable);
    if (A.n > 150 || B.n > 150 || !scenarioHolds(scenario, A, B)) continue;
    const samples = specs.map((sp, i) => ({ tag: i === 0 ? "A" : "B", label: sp.label, unit: sp.unit, base: tables[i] }));
    return {
      seed,
      scenario,
      title: theme.title,
      prompt: units ? theme.intro : theme.intro(samples[0].label, samples[1].label),
      samples,
      interp: makeInterpretation(seed, scenario, samples, A, B, compareVerdict(A, B)),
    };
  }
  throw new Error("No se pudo generar el ejercicio de comparación");
}

export { COMPARE_THEMES, COMPARE_SCENARIOS };

export { GROUPED_THEMES, UNGROUPED_THEMES };
