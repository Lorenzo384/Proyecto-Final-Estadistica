// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const { calcularEstadisticas } = require('./statsEngine');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint 1: Procesar y calcular estadísticas (sin guardar obligatorio)
app.post('/api/stats/calculate', (req, res) => {
  try {
    const { matriz } = req.body;
    if (!matriz || !Array.isArray(matriz)) {
      return res.status(400).json({ error: "Debes enviar una matriz de números en la propiedad 'matriz'." });
    }

    const resultados = calcularEstadisticas(matriz);
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 2: Guardar un análisis en la base de datos MySQL
app.post('/api/stats/save', async (req, res) => {
  const { titulo, matriz } = req.body;
  if (!matriz || !titulo) {
    return res.status(400).json({ error: "Faltan datos (titulo o matriz)." });
  }

  try {
    const calculos = calcularEstadisticas(matriz);
    const datosOriginales = matriz.flat();

    const [resultDataset] = await pool.execute(
      `INSERT INTO datasets (titulo, datos_originales, datos_ordenados, tamano_muestra) VALUES (?, ?, ?, ?)`,
      [titulo, JSON.stringify(datosOriginales), JSON.stringify(calculos.datosOrdenados), calculos.tamanoMuestra]
    );

    const datasetId = resultDataset.insertId;

    await pool.execute(
      `INSERT INTO resultados_estadisticos 
       (dataset_id, media, mediana, moda, rango, varianza, desviacion_estandar, coeficiente_variacion, iqr, cuartiles, tabla_frecuencias) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datasetId,
        calculos.tendenciaCentral.media,
        calculos.tendenciaCentral.mediana,
        JSON.stringify(calculos.tendenciaCentral.moda),
        calculos.variabilidad.rango,
        calculos.variabilidad.varianza,
        calculos.variabilidad.desviacionEstandar,
        calculos.variabilidad.coeficienteVariacion,
        calculos.variabilidad.iqr,
        JSON.stringify(calculos.posicion),
        JSON.stringify(calculos.tablaFrecuencias)
      ]
    );

    res.status(201).json({ message: "Análisis guardado con éxito", id: datasetId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[DataMatrix API] Servidor corriendo en http://localhost:${PORT}`);
});