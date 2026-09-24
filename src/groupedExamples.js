/* Ejemplos fijos para "Posición y dispersión · datos agrupados".
   Los intervalos NO vienen dados: se calculan con la regla de Sturges. */
export const GROUPED_MEASURE_SETS = [
  {
    title: "Estaturas del curso",
    prompt: "Estaturas (en cm) de los 40 estudiantes de un curso.",
    unit: "cm",
    data: [164, 167, 161, 154, 166, 165, 172, 164, 160, 157, 152, 167, 183, 169, 169, 159, 169, 157, 169, 176, 174, 162, 161, 158, 176, 161, 163, 148, 166, 168, 163, 178, 168, 162, 153, 159, 165, 173, 169, 154],
  },
  {
    title: "Minutos de estudio por día",
    prompt: "Minutos que estudia por día cada uno de 36 estudiantes de 5° año.",
    unit: "minutos",
    data: [142, 80, 15, 134, 157, 83, 78, 91, 68, 89, 114, 72, 105, 102, 105, 82, 49, 125, 40, 122, 73, 99, 37, 62, 36, 131, 103, 137, 111, 136, 88, 134, 49, 118, 123, 83],
  },
  {
    title: "Peso de los estudiantes",
    prompt: "Peso (en kg) de 60 estudiantes que participaron de un control de salud escolar.",
    unit: "kg",
    data: [68, 53, 60, 67, 80, 70, 60, 64, 53, 58, 59, 63, 73, 50, 63, 59, 63, 65, 62, 56, 53, 60, 63, 63, 57, 55, 77, 63, 53, 67, 69, 65, 57, 59, 58, 55, 66, 54, 64, 62, 64, 62, 62, 73, 55, 53, 67, 62, 53, 62, 74, 77, 73, 67, 65, 66, 60, 59, 61, 58],
  },
  {
    title: "Precio de una gaseosa de 500 ml",
    prompt: "Precio (en pesos) de una gaseosa de 500 ml en 50 comercios de un barrio.",
    unit: "pesos",
    data: [2010, 2100, 1620, 1630, 1130, 1780, 1790, 1790, 1890, 1110, 1670, 1630, 1540, 1710, 1690, 1960, 2140, 1560, 2020, 2100, 1710, 1620, 2050, 1930, 1830, 2020, 2020, 1920, 1370, 1410, 1920, 1770, 2040, 2040, 1800, 1900, 1510, 1920, 1740, 1760, 2250, 1530, 1960, 1630, 1780, 1820, 1720, 1660, 1890, 1230],
  },
];
