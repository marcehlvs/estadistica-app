import { Printer } from "lucide-react";

/* Hoja de fórmulas imprimible. Solo contenido estático: sin estado ni componentes anidados. */

const SECCIONES = [
  {
    titulo: "Datos sueltos (sin agrupar)",
    items: [
      ["Media", "x̄ = Σxᵢ / n"],
      ["Mediana", "Con los datos ordenados: valor central (n impar) o promedio de los dos centrales (n par)."],
      ["Moda", "El valor que más se repite (puede haber más de una o ninguna)."],
      ["Rango", "R = máximo − mínimo"],
      ["Varianza poblacional", "σ² = Σ(xᵢ − x̄)² / n"],
      ["Desvío estándar", "σ = √σ²"],
    ],
  },
  {
    titulo: "Datos agrupados en intervalos",
    items: [
      ["Cantidad de intervalos (Sturges)", "k ≈ 1 + 3,322 · log₁₀(n)"],
      ["Amplitud", "c = R / k (se redondea hacia arriba)"],
      ["Marca de clase", "xᵢ = (límite inferior + límite superior) / 2"],
      ["Frecuencias", "fᵢ absoluta · Fᵢ acumulada · hᵢ = fᵢ / n relativa"],
      ["Media", "x̄ = Σ(fᵢ · xᵢ) / n"],
      ["Percentil Pₖ", "Pₖ = Lᵢ + c · (k·n/100 − Fᵢ₋₁) / fᵢ"],
      ["Mediana y cuartiles", "Me = P₅₀ · Q₁ = P₂₅ · Q₃ = P₇₅"],
      ["Rango intercuartil", "RIC = Q₃ − Q₁"],
      ["Moda", "Mo = Lᵢ + c · d₁ / (d₁ + d₂), con d₁ = fᵢ − fᵢ₋₁ y d₂ = fᵢ − fᵢ₊₁"],
      ["Varianza y desvío", "σ² = Σ fᵢ(xᵢ − x̄)² / n · σ = √σ²"],
    ],
  },
  {
    titulo: "Coeficiente de variación y comparación de muestras",
    items: [
      ["Coeficiente de variación", "CV = (σ / x̄) · 100 %"],
      ["Criterio de homogeneidad", "CV < 30 %: muestra homogénea · CV ≥ 30 %: muestra heterogénea."],
      ["Comparar dos muestras", "Es más homogénea la de menor CV, aunque tenga mayor desvío estándar."],
      ["Unidades distintas", "σ depende de la unidad; el CV no tiene unidad, por eso permite comparar variables distintas (kg vs cm)."],
      ["Cuidado", "Un σ más grande no implica más dispersión relativa: hay que mirar el CV."],
    ],
  },
  {
    titulo: "Gráficos",
    items: [
      ["Histograma", "Barras pegadas; la altura es fᵢ (o hᵢ) y el ancho es la amplitud c."],
      ["Ojiva", "Poligonal de frecuencias acumuladas contra el límite superior de cada intervalo; sirve para leer percentiles."],
      ["Diagrama de caja", "Mínimo · Q₁ · Me · Q₃ · máximo. Caja más ancha = más dispersión central."],
    ],
  },
];

export default function FormulaSheet() {
  return (
    <div className="formula-sheet">
      <div className="formula-sheet__bar no-print">
        <h3 className="ex-title">Hoja de fórmulas</h3>
        <button className="btn btn--primary" onClick={() => window.print()}>
          <Printer size={14} /> imprimir / guardar PDF
        </button>
      </div>
      <h2 className="formula-sheet__print-title">Estadística · hoja de fórmulas</h2>
      <div className="formula-cols">
        {SECCIONES.map((s) => (
          <section className="formula-block" key={s.titulo}>
            <h4>{s.titulo}</h4>
            <dl>
              {s.items.map(([k, v]) => (
                <div className="formula-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
