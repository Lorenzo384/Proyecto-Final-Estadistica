// statsEngine.js
// backend/statsEngine.js

function calcularEstadisticas(datosOriginales) {
  const datos = datosOriginales.flat().map(Number).filter(n => !isNaN(n));
  const n = datos.length;
  if (n === 0) throw new Error("El arreglo de datos está vacío.");

  const datosOrdenados = [...datos].sort((a, b) => a - b);

  // Tendencia Central
  const suma = datosOrdenados.reduce((acc, val) => acc + val, 0);
  const media = suma / n;

  let mediana;
  const mit = Math.floor(n / 2);
  mediana = n % 2 === 0 ? (datosOrdenados[mit - 1] + datosOrdenados[mit]) / 2 : datosOrdenados[mit];

  const frecuenciasMap = {};
  datosOrdenados.forEach(num => { frecuenciasMap[num] = (frecuenciasMap[num] || 0) + 1; });
  let maxFrec = Math.max(...Object.values(frecuenciasMap));
  let moda = maxFrec > 1 ? Object.keys(frecuenciasMap).filter(num => frecuenciasMap[num] === maxFrec).map(Number) : [];

  // --- Variabilidad ---
  const min = datosOrdenados[0];
  const max = datosOrdenados[n - 1];
  const rango = max - min;
  const rangoMedio = (min + max) / 2;
  const varianza = datosOrdenados.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / (n - 1);
  const desviacionEstandar = Math.sqrt(varianza);
  const coeficienteVariacion = media !== 0 ? (desviacionEstandar / media) * 100 : 0;

  // Posición
  const obtenerPercentil = (p) => {
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return datosOrdenados[base + 1] !== undefined 
      ? datosOrdenados[base] + rest * (datosOrdenados[base + 1] - datosOrdenados[base]) 
      : datosOrdenados[base];
  };

  const q1 = obtenerPercentil(0.25);
  const q2 = mediana;
  const q3 = obtenerPercentil(0.75);
  const iqr = q3 - q1;

  // Tabla de Frecuencias según formato
  const k = Math.max(5, Math.ceil(1 + 3.322 * Math.log10(n)));
  const anchoClase = Math.ceil((rango > 0 ? rango : 1) / k);

  let tempTabla = [];
  let frecAcumulada = 0;
  let limiteInferior = min;

  for (let i = 0; i < k; i++) {
    let limiteSuperior = limiteInferior + anchoClase - 1;
    const esUltimo = i === k - 1;

    const conteo = datosOrdenados.filter(v => {
      return esUltimo ? (v >= limiteInferior && v <= max) : (v >= limiteInferior && v <= limiteSuperior);
    }).length;

    frecAcumulada += conteo;
    const frecRelativaPorc = (conteo / n) * 100;
    const marcaClase = (limiteInferior + limiteSuperior) / 2;

    tempTabla.push({
      intervalo: i + 1,
      ii: limiteInferior,
      is: limiteSuperior,
      Li: limiteInferior - 0.5,
      Ls: limiteSuperior + 0.5,
      xm: marcaClase,
      f: conteo,
      fa: frecAcumulada,
      fr: Number(frecRelativaPorc.toFixed(2))
    });

    limiteInferior = limiteSuperior + 1;
  }

  // Cálculo de Frecuencia Suavizada (fs)
  const tablaFrecuencias = tempTabla.map((row, idx, arr) => {
    const fAnterior = idx === 0 ? 0 : arr[idx - 1].f;
    const fSiguiente = idx === arr.length - 1 ? n : arr[idx + 1].f;
    const fs = (fAnterior + 2 * row.f + fSiguiente) / 4;

    return {
      ...row,
      fs: Number(fs.toFixed(2))
    };
  });

  return {
    tamanoMuestra: n,
    datosOrdenados,
    tendenciaCentral: { media: Number(media.toFixed(4)), mediana: Number(mediana.toFixed(4)), moda },
    variabilidad: {
      rango: Number(rango.toFixed(4)),
      rangoMedio: Number(rangoMedio.toFixed(4)),
      varianza: Number(varianza.toFixed(4)),
      desviacionEstandar: Number(desviacionEstandar.toFixed(4)),
      coeficienteVariacion: Number(coeficienteVariacion.toFixed(2)),
      iqr: Number(iqr.toFixed(4))
    },
    posicion: { q1: Number(q1.toFixed(4)), q2: Number(q2.toFixed(4)), q3: Number(q3.toFixed(4)) },
    tablaFrecuencias
  };
}

module.exports = { calcularEstadisticas };