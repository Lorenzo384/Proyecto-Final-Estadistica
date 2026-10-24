import { useState, useRef } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import html2pdf from 'html2pdf.js';
import './index.css';

function App() {
  const [vistaActual, setVistaActual] = useState('bienvenida'); // 'bienvenida', 'analisis', 'historial'
  const [inputMatriz, setInputMatriz] = useState('12, 15, 8, 22, 15, 18, 30, 25, 15, 10, 22, 19, 14, 16, 20');
  const [titulo, setTitulo] = useState('Análisis de Clase');
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calcPosicion, setCalcPosicion] = useState({ tipo: 'cuartil', valor: 1 });
  const [historial, setHistorial] = useState([]);

  const componentePDFRef = useRef();

  const descargarPDF = () => {
    const elemento = componentePDFRef.current;
    const opciones = {
      margin:       10,
      filename:     `DataMatrix_Analisis_${titulo.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy', 'avoid-all'] }
    };
    
    html2pdf().set(opciones).from(elemento).save();
  };

  const procesarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const numeros = inputMatriz
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n !== '')
        .map(Number);

      if (numeros.length === 0) {
        throw new Error('Ingresa al menos un número válido en la matriz.');
      }

      if (numeros.some(isNaN)) {
        throw new Error('La matriz contiene valores no numéricos válidos.');
      }

      const response = await axios.post('http://localhost:4000/api/stats/calculate', {
        matriz: numeros
      });

      setResultados(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarEnHistorial = async () => {
    try {
      await axios.post('http://localhost:4000/api/stats/save', {
        titulo: titulo,
        matriz: inputMatriz,
        resultados: resultados
      });
      alert('Análisis guardado correctamente en la base de datos.');
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.error || err.message));
    }
  };

  const cargarHistorial = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/stats/history');
      setHistorial(response.data);
      setVistaActual('historial');
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert('Error al cargar el historial.');
    }
  };

  const obtenerValorPosicion = () => {
    if (!resultados) return '';
    const datos = resultados.datosOrdenados;
    const n = datos.length;
    let p = 0;
    
    if (calcPosicion.tipo === 'cuartil') p = calcPosicion.valor / 4;
    else if (calcPosicion.tipo === 'decil') p = calcPosicion.valor / 10;
    else if (calcPosicion.tipo === 'percentil') p = calcPosicion.valor / 100;

    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    const resultado = datos[base + 1] !== undefined 
      ? datos[base] + rest * (datos[base + 1] - datos[base]) 
      : datos[base];
      
    return Number(resultado.toFixed(4));
  };
  
  // --- VISTA 1: BIENVENIDA / LANDING PAGE ---
  if (vistaActual === 'bienvenida') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '650px', textAlign: 'center', padding: '40px' }}>
          <h1 style={{ color: 'var(--primary-color)', marginTop: 0, fontSize: '2.5rem' }}>
            DataMatrix
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '25px' }}>
            Sistema de Análisis Estadístico & Modelado de Datos
          </p>

          <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '25px' }}>
            Bienvenido a la plataforma interactiva para el cálculo de medidas de tendencia central, 
            dispersión, posición, tablas de frecuencia y gráficos de modelado estadístico.
          </p>

          <div style={{
            textAlign: 'left',
            backgroundColor: '#f1f5f9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Capacidades del Sistema:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: '1.8' }}>
              <li>Ordenamiento dinámico de matrices y recuento muestral.</li>
              <li>Medidas de Tendencia Central.</li>
              <li>Medidas de Dispersión y Posición.</li>
              <li>Tabla de Distribución de Frecuencias.</li>
              <li>Gráficas de Modelado Estadístico.</li>
              <li>Exportación a PDF e Historial de Análisis.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => setVistaActual('analisis')} style={{ fontSize: '1.05rem', padding: '14px 28px' }}>
              Comenzar Análisis
            </button>
            <button className="btn-secondary" onClick={cargarHistorial} style={{ fontSize: '1.05rem', padding: '14px 28px' }}>
              Ver Historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA 3: HISTORIAL DE ANÁLISIS ---
  if (vistaActual === 'historial') {
    return (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Historial de Análisis Guardados</h2>
          <button className="btn-secondary" onClick={() => setVistaActual('bienvenida')}>
            ← Volver a Inicio
          </button>
        </div>
        
        <div className="card">
          {historial.length === 0 ? (
            <p>No hay análisis guardados en la base de datos.</p>
          ) : (
            <table className="custom-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Título</th>
                  <th style={{ padding: '10px' }}>Fecha</th>
                  <th style={{ padding: '10px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{item.id}</td>
                    <td style={{ padding: '10px' }}>{item.titulo}</td>
                    <td style={{ padding: '10px' }}>{new Date(item.fecha_creacion).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>
                      <button className="btn-secondary" onClick={() => {
                        setInputMatriz(item.matriz);
                        setTitulo(item.titulo);
                        setVistaActual('analisis');
                      }}>
                        Cargar Datos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // --- VISTA 2: PANEL DE ANÁLISIS ---
  return (
    <div className="container">
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.8rem' }}>DataMatrix Engine</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Panel de Procesamiento Estadístico</span>
        </div>
        <button className="btn-secondary" onClick={() => setVistaActual('bienvenida')}>
          ← Volver a Inicio
        </button>
      </div>

      {/* Tarjeta de Entrada de Datos */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Título del Análisis</label>
          <input 
            className="form-control" 
            type="text" 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Matriz de Números Desordenados (separados por comas o saltos de línea)</label>
          <textarea 
            className="form-control" 
            rows="3" 
            value={inputMatriz} 
            onChange={(e) => setInputMatriz(e.target.value)} 
          />
        </div>

        <button className="btn-primary" onClick={procesarDatos} disabled={loading}>
          {loading ? 'Calculando...' : 'Procesar Datos'}
        </button>

        {error && <p style={{ color: '#ef4444', marginTop: '12px', fontWeight: 600 }}>{error}</p>}
      </div>

      {/* Resultados del Análisis */}
      {resultados && (
        <div style={{ marginTop: '20px' }}>
          {/* BOTONES DE ACCIÓN */}
          <div className="card" style={{ display: 'flex', gap: '15px', backgroundColor: '#e2e8f0', marginBottom: '20px' }}>
            <button className="btn-primary" onClick={descargarPDF} style={{ backgroundColor: '#10b981', border: 'none' }}>
              Descargar PDF
            </button>
            <button className="btn-primary" onClick={guardarEnHistorial} style={{ backgroundColor: '#6366f1', border: 'none' }}>
              Guardar en Historial
            </button>
          </div>

          {/* CONTENEDOR DEL PDF */}
          <div ref={componentePDFRef} style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
            
            {/* APARTADO 1: DATOS ORDENADOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Matriz de Datos Ordenados</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                Total de elementos: {resultados.datosOrdenados.length}
              </span>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
              <div className="data-pills-container">
                {resultados.datosOrdenados.map((numero, index) => (
                  <div key={index} className="data-pill">
                    <span className="pill-index">#{index + 1}</span>
                    <span className="pill-value">{numero}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* APARTADO 2: MÉTRICAS ESTADÍSTICAS */}
            <h3 style={{ marginBottom: '16px' }}>Medidas de Tendencia Central y Variabilidad</h3>
            <div className="grid-metrics">
              <div className="metric-card"><span>Media</span><h3>{resultados.tendenciaCentral.media}</h3></div>
              <div className="metric-card"><span>Mediana</span><h3>{resultados.tendenciaCentral.mediana}</h3></div>
              <div className="metric-card"><span>Moda</span><h3>{resultados.tendenciaCentral.moda.length > 0 ? resultados.tendenciaCentral.moda.join(', ') : 'Amodal'}</h3></div>
              
              <div className="metric-card"><span>Varianza</span><h3>{resultados.variabilidad.varianza}</h3></div>
              <div className="metric-card"><span>Desviación Estándar</span><h3>{resultados.variabilidad.desviacionEstandar}</h3></div>
              <div className="metric-card"><span>Coef. de Variación</span><h3>{resultados.variabilidad.coeficienteVariacion}%</h3></div>
              
              <div className="metric-card"><span>Rango</span><h3>{resultados.variabilidad.rango}</h3></div>
              <div className="metric-card"><span>Rango Medio</span><h3>{resultados.variabilidad.rangoMedio}</h3></div>
              <div className="metric-card"><span>IQR</span><h3>{resultados.variabilidad.iqr}</h3></div>
            </div>

            {/* CALCULADORA POSICIÓN */}
            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Medidas de Posición (Interactiva)</h3>
            <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Tipo de Medida</label>
                <select 
                  className="form-control"
                  value={calcPosicion.tipo} 
                  onChange={(e) => setCalcPosicion({ tipo: e.target.value, valor: 1 })}
                >
                  <option value="cuartil">Cuartiles (1 - 3)</option>
                  <option value="decil">Deciles (1 - 9)</option>
                  <option value="percentil">Percentiles (1 - 99)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Valor (k)</label>
                <input 
                  type="number" 
                  className="form-control"
                  min="1" 
                  max={calcPosicion.tipo === 'cuartil' ? 3 : calcPosicion.tipo === 'decil' ? 9 : 99}
                  value={calcPosicion.valor}
                  onChange={(e) => {
                    let maxVal = calcPosicion.tipo === 'cuartil' ? 3 : calcPosicion.tipo === 'decil' ? 9 : 99;
                    let val = parseInt(e.target.value) || 1;
                    if (val > maxVal) val = maxVal;
                    if (val < 1) val = 1;
                    setCalcPosicion({ ...calcPosicion, valor: val });
                  }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Resultado</span>
                <h2 style={{ margin: '5px 0', color: 'var(--primary-color)' }}>{obtenerValorPosicion()}</h2>
              </div>
            </div>

            {/* APARTADO 3: TABLA DE FRECUENCIAS*/}
            <h3 style={{ marginBottom: '16px' }}>Tabla de Distribución de Frecuencias</h3>
            <div className="table-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th colSpan="2">Clases</th>
                    <th>f</th>
                    <th>fa</th>
                    <th>fr</th>
                    <th>fs</th>
                    <th>xm</th>
                    <th>Li</th>
                    <th>Ls</th>
                  </tr>
                  <tr>
                    <th>ii</th>
                    <th>is</th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.tablaFrecuencias.map((row) => (
                    <tr key={row.intervalo}>
                      <td style={{ textAlign: 'center' }}>{row.ii}</td>
                      <td style={{ textAlign: 'center' }}>{row.is}</td>
                      <td>{row.f}</td>
                      <td>{row.fa}</td>
                      <td>{row.fr}%</td>
                      <td>{row.fs}</td>
                      <td>{row.xm}</td>
                      <td>{row.Li}</td>
                      <td>{row.Ls}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total =</td>
                    <td className="total-cell">{resultados.tamanoMuestra}</td>
                    <td></td>
                    <td className="total-cell">100%</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* APARTADO 4: MODELADO GRÁFICO */}
            <h3 style={{ marginBottom: '16px' }}>Modelado Gráfico Estadístico</h3>
            <div className="grid-charts">
              
              <div className="chart-card" style={{ flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Histograma y Polígono de Frecuencias</h4>
                <Plot
                  data={[
                    { 
                      x: resultados.tablaFrecuencias.map(r => `${r.ii}-${r.is}`), 
                      y: resultados.tablaFrecuencias.map(r => r.f), 
                      type: 'bar', 
                      name: 'Histograma' 
                    },
                    { 
                      x: resultados.tablaFrecuencias.map(r => `${r.ii}-${r.is}`), 
                      y: resultados.tablaFrecuencias.map(r => r.f), 
                      type: 'scatter', 
                      mode: 'lines+markers', 
                      name: 'Polígono', 
                      line: { color: 'red' } 
                    }
                  ]}
                  layout={{ autosize: true, margin: { t: 20, b: 40, l: 40, r: 20 } }}
                  useResizeHandler
                  style={{ width: '100%', height: '320px' }}
                />
              </div>

              <div className="chart-card" style={{ flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Polígono Suavizado (fs vs xm)</h4>
                <Plot
                  data={[{ 
                    x: resultados.tablaFrecuencias.map(r => r.xm), 
                    y: resultados.tablaFrecuencias.map(r => r.fs), 
                    type: 'scatter', 
                    mode: 'lines', 
                    line: { shape: 'spline', color: 'green' }, 
                    name: 'Suavizado (fs)' 
                  }]}
                  layout={{ autosize: true, margin: { t: 20, b: 40, l: 40, r: 20 } }}
                  useResizeHandler
                  style={{ width: '100%', height: '320px' }}
                />
              </div>

              <div className="chart-card" style={{ flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Distribución en Frecuencias Relativas (%)</h4>
                <Plot
                  data={[{ 
                    x: resultados.tablaFrecuencias.map(r => `${r.ii}-${r.is}`), 
                    y: resultados.tablaFrecuencias.map(r => r.fr), 
                    type: 'bar', 
                    marker: { color: 'orange' }, 
                    name: 'Frec. Relativa (%)' 
                  }]}
                  layout={{ autosize: true, margin: { t: 20, b: 40, l: 40, r: 20 } }}
                  useResizeHandler
                  style={{ width: '100%', height: '320px' }}
                />
              </div>

              <div className="chart-card" style={{ flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Diagrama de Caja y Bigotes</h4>
                <Plot
                  data={[{ 
                    y: resultados.datosOrdenados, 
                    type: 'box', 
                    name: 'Muestra', 
                    boxpoints: 'all', 
                    jitter: 0.3 
                  }]}
                  layout={{ autosize: true, margin: { t: 20, b: 40, l: 40, r: 20 } }}
                  useResizeHandler
                  style={{ width: '100%', height: '320px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;