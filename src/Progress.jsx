import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KIND_LABEL, clearProgress, loadProgress, progressCsv } from "./progress.js";

const fecha = (iso) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const nombre = (a) => (a.kind === "evaluacion" ? `Evaluación N.º ${a.id}` : `${a.title} · problema ${a.id}`);

function download(name, text) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function Progress() {
  const [attempts, setAttempts] = useState(loadProgress);

  const stats = useMemo(() => {
    const evals = attempts.filter((a) => a.kind === "evaluacion");
    const cmp = attempts.filter((a) => a.kind === "comparar");
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, a) => s + a.pct, 0) / xs.length) : null);
    return {
      total: attempts.length,
      evals: evals.length,
      cmp: cmp.length,
      bestEval: evals.length ? Math.max(...evals.map((a) => a.pct)) : null,
      avgEval: avg(evals.slice(-5)),
      avgCmp: avg(cmp.slice(-5)),
    };
  }, [attempts]);

  const chart = useMemo(
    () =>
      attempts.map((a, i) => ({
        n: i + 1,
        "Evaluación": a.kind === "evaluacion" ? a.pct : null,
        "Comparar muestras": a.kind === "comparar" ? a.pct : null,
      })),
    [attempts],
  );

  const borrar = () => {
    if (window.confirm("¿Borrar todo tu progreso de este dispositivo? No se puede deshacer.")) {
      clearProgress();
      setAttempts([]);
    }
  };

  if (!attempts.length) {
    return (
      <div>
        <h3 className="ex-title">Mi progreso</h3>
        <p className="eval-note">
          Todavía no hay resultados. Cuando entregues una evaluación o verifiques un problema de comparar muestras
          completo, queda registrado acá.
        </p>
        <p className="hc-note">El registro se guarda solo en este navegador, no en un servidor.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="ex-title">Mi progreso</h3>
      <div className="prog-cards">
        <div className="prog-card">
          <div className="prog-card__num">{stats.total}</div>
          <div className="prog-card__label">intentos registrados</div>
        </div>
        <div className="prog-card">
          <div className="prog-card__num">{stats.bestEval == null ? "–" : `${stats.bestEval} %`}</div>
          <div className="prog-card__label">mejor evaluación</div>
        </div>
        <div className="prog-card">
          <div className="prog-card__num">{stats.avgEval == null ? "–" : `${stats.avgEval} %`}</div>
          <div className="prog-card__label">promedio de las últimas 5 evaluaciones</div>
        </div>
        <div className="prog-card">
          <div className="prog-card__num">{stats.avgCmp == null ? "–" : `${stats.avgCmp} %`}</div>
          <div className="prog-card__label">promedio de las últimas 5 comparaciones</div>
        </div>
      </div>

      {attempts.length > 1 && (
        <div className="hist-box" style={{ marginTop: 14 }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C4" />
              <XAxis dataKey="n" tick={{ fontSize: 10, fill: "#5A5142" }} allowDecimals={false} label={{ value: "intento", position: "insideBottomRight", offset: -2, fontSize: 10, fill: "#5A5142" }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: "#5A5142" }} />
              <Tooltip formatter={(v) => `${v} %`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Evaluación" stroke="#1F3A34" strokeWidth={2} connectNulls dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="Comparar muestras" stroke="#E8B33D" strokeWidth={2} connectNulls dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="freq-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Actividad</th>
              <th>Puntaje</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {[...attempts].reverse().map((a, i) => (
              <tr key={i}>
                <td className="fc fc--num">{fecha(a.date)}</td>
                <td className="fc fc--label">
                  {nombre(a)}
                  {a.parts && (
                    <div className="prog-parts">{a.parts.map((p) => `${p.label}: ${p.score}/${p.total}`).join(" · ")}</div>
                  )}
                  <div className="prog-parts">{KIND_LABEL[a.kind]}</div>
                </td>
                <td className="fc fc--num">
                  {a.score} / {a.total}
                </td>
                <td className="fc fc--num">{a.pct} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ex-actions" style={{ marginTop: 12 }}>
        <button className="btn btn--ghost" onClick={() => download("mi-progreso.csv", progressCsv(attempts))}>
          <Download size={14} /> descargar CSV
        </button>
        <button className="btn btn--ghost" onClick={borrar}>
          <Trash2 size={14} /> borrar mi progreso
        </button>
      </div>
      <p className="hc-note" style={{ marginTop: 8 }}>
        El registro se guarda solo en este navegador. Si borrás los datos del navegador o usás otro dispositivo, empieza
        de cero. Podés descargar el CSV para guardarlo o mandárselo a tu docente.
      </p>
    </div>
  );
}
