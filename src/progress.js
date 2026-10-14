/* Registro de progreso del estudiante.
   Se guarda SOLO en este navegador (localStorage): no hay servidor. Si se borran los datos del
   navegador o se usa otro dispositivo, el registro empieza de cero. Todo va en try/catch porque
   localStorage puede estar bloqueado (modo privado, permisos). */

const KEY = "estadistica-app:progreso:v1";
const MAX_INTENTOS = 500;

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data?.attempts) ? data.attempts : [];
  } catch {
    return [];
  }
}

function persist(attempts) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, attempts: attempts.slice(-MAX_INTENTOS) }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Agrega un intento.
 *   kind  : "evaluacion" | "comparar"
 *   id    : n.º de evaluación o semilla del problema
 *   title : nombre de la actividad (para mostrar)
 *   parts : opcional, [{ label, score, total }] con el detalle por ejercicio
 */
export function recordResult({ kind, id, title, score, total, parts }) {
  const attempts = loadProgress();
  attempts.push({
    kind,
    id,
    title,
    score,
    total,
    pct: total ? Math.round((score / total) * 100) : 0,
    parts: parts || null,
    date: new Date().toISOString(),
  });
  return persist(attempts);
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin localStorage no hay nada que borrar */
  }
}

export const KIND_LABEL = { evaluacion: "Modo evaluación", comparar: "Comparar muestras (CV)" };

/** Texto CSV (separador ;, con BOM para que Excel lo abra bien). */
export function progressCsv(attempts) {
  const rows = [["Fecha", "Actividad", "Detalle", "Puntaje", "Total", "Porcentaje"]];
  attempts.forEach((a) => {
    rows.push([
      new Date(a.date).toLocaleString("es-AR"),
      KIND_LABEL[a.kind] || a.kind,
      a.kind === "evaluacion" ? `Evaluación N.º ${a.id}` : `${a.title} (problema ${a.id})`,
      a.score,
      a.total,
      `${a.pct} %`,
    ]);
  });
  return "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
}
