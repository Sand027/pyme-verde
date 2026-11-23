/* Calculadora: envía el escenario a POST /api/calculadora/escenarios y muestra el resultado
   con los supuestos que usó el servidor. Los escenarios guardados viven en sessionStorage. */
import { api, avisar, mostrarErrores, limpiarErrores, validarLocal, datosDe, num, dinero, el, fecha } from './pv.js';

const form = document.querySelector('[data-calc]');
const salida = document.querySelector('[data-resultado]');
const usados = document.querySelector('[data-supuestos-usados]');
const estado = document.querySelector('[data-calc-estado]');
const rango = document.getElementById('c-red');
const numero = document.getElementById('c-red-n');
const etiquetaRed = document.querySelector('[data-calc-red]');
const tabla = document.querySelector('[data-escenarios]');
const CLAVE = 'pv-escenarios';
let ultimo = null;

const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE)) || []; } catch { return []; } };
const escribir = (l) => { try { sessionStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento */ } };

function sincronizar(v) {
  rango.value = v;
  numero.value = v;
  etiquetaRed.textContent = v;
}
rango.addEventListener('input', () => sincronizar(rango.value));
numero.addEventListener('input', () => { if (numero.value !== '') { rango.value = numero.value; etiquetaRed.textContent = numero.value; } });

function unidadActual() {
  const op = form.elements.concepto.selectedOptions[0];
  document.querySelector('[data-calc-unidad]').textContent = op ? `en ${op.dataset.unidad}` : '';
}
form.elements.concepto.addEventListener('change', unidadActual);
unidadActual();

function cifra(etiqueta, valor, nota) {
  return el('div', { class: 'ap-cifra' }, el('span', {}, etiqueta), el('b', {}, valor), nota ? el('small', {}, nota) : null);
}

function pintar(r) {
  salida.replaceChildren(
    cifra('Ahorro al mes', dinero(r.ahorro.mensual), `${num(r.ahorro.cantidadMensual, 2)} ${r.unidad} menos`),
    cifra('Ahorro al año', dinero(r.ahorro.anual)),
    cifra('Costo actual al mes', dinero(r.actual.costo), `${num(r.actual.cantidad, 2)} ${r.unidad}`),
    cifra('Costo propuesto al mes', dinero(r.propuesto.costo), `${num(r.propuesto.cantidad, 2)} ${r.unidad}`),
    cifra('Retorno de la inversión', r.ahorro.retornoMeses === null ? 'sin inversión' : `${num(r.ahorro.retornoMeses, 1)} meses`),
    r.emisionesEvitadasKgMes !== null ? cifra('Emisiones evitadas', `${num(r.emisionesEvitadasKgMes, 1)} kg CO2e/mes`) : null,
  );
  usados.replaceChildren(...r.supuestos.map((s) => el('li', {},
    el('span', {}, el('b', {}, s.nombre), el('br'), el('small', { class: 'ap-nota' }, `Fuente: ${s.fuente || 'sin fuente registrada'}`)),
    el('span', {}, `${num(s.valor, 4)} ${s.unidad}`))));
}

async function calcular() {
  limpiarErrores(form);
  if (!validarLocal(form)) { estado.textContent = 'Revisa los campos marcados.'; return null; }
  estado.textContent = 'Calculando…';
  try {
    const r = await api('POST', '/api/calculadora/escenarios', datosDe(form));
    ultimo = r.data;
    pintar(ultimo);
    estado.textContent = '';
    return ultimo;
  } catch (err) {
    estado.textContent = err.message;
    mostrarErrores(form, err.campos);
    return null;
  }
}

function pintarTabla() {
  const lista = leer();
  if (!lista.length) {
    tabla.replaceChildren(el('tr', { class: 'ap-tabla__vacia' }, el('td', { colspan: 7 }, 'Aún no guardas escenarios.')));
    return;
  }
  tabla.replaceChildren(...lista.map((r, i) => el('tr', {},
    el('td', {}, r.conceptoNombre),
    el('td', { class: 'num' }, `${num(r.actual.cantidad, 2)} ${r.unidad}`),
    el('td', { class: 'num' }, `${num(r.reduccion, 1)} %`),
    el('td', { class: 'num' }, dinero(r.ahorro.mensual)),
    el('td', { class: 'num' }, dinero(r.ahorro.anual)),
    el('td', { class: 'num ocultar-tel' }, r.ahorro.retornoMeses === null ? '' : `${num(r.ahorro.retornoMeses, 1)} meses`),
    el('td', { class: 'acc' }, el('button', { class: 'ap-btn-txt ap-btn-txt--peligro', type: 'button', onclick: () => { const l = leer(); l.splice(i, 1); escribir(l); pintarTabla(); } }, 'Quitar')))));
}

form.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });
document.querySelector('[data-guardar-esc]').addEventListener('click', async () => {
  const r = await calcular();
  if (!r) return;
  const l = leer();
  l.push({ ...r, reduccion: Number(form.elements.reduccion.value) });
  escribir(l.slice(-8));
  pintarTabla();
  avisar('Escenario guardado para comparar.');
});
pintarTabla();
calcular();

/* Recurso solar: la página pide a nuestro servidor /api/publico/clima, que a su vez consume
   el servicio web público Open-Meteo. Con las horas de sol pico estima los kWp necesarios. */
const solar = document.querySelector('[data-solar]');
if (solar) {
  const cifras = solar.querySelector('[data-solar-cifras]');
  const dias = solar.querySelector('[data-solar-dias]');
  const formSol = solar.querySelector('[data-solar-form]');
  const estadoSol = solar.querySelector('[data-solar-estado]');
  let clima = null;

  const pintarSolar = () => {
    if (!clima) return;
    const kwh = Number(formSol.elements.kwh.value);
    const kwp = kwh > 0 && clima.generacionMensualPorKwp > 0 ? kwh / clima.generacionMensualPorKwp : null;
    cifras.replaceChildren(
      cifra('Horas de sol pico al día', num(clima.horasSolPico, 2), clima.tipo === 'medicion' ? 'promedio de los últimos 7 días medidos' : 'promedio de los próximos 7 días'),
      cifra('Generación por kWp al mes', `${num(clima.generacionMensualPorKwp, 1)} kWh`, `rendimiento supuesto ${num(clima.rendimientoSupuesto * 100, 0)} %`),
      cifra('Paneles para cubrir el consumo', kwp === null ? 'sin dato' : `${num(kwp, 2)} kWp`, `para ${num(kwh, 0)} kWh al mes`),
      cifra('Temperatura actual', clima.temperaturaActual === null ? 'sin dato' : `${num(clima.temperaturaActual, 1)} °C`, `${clima.lugar} · fuente: ${clima.fuente}`),
    );
    estadoSol.textContent = clima.desactualizado ? 'Los servicios de clima no respondieron; se muestran los últimos datos obtenidos.' : (clima.nota || '');
  };

  formSol.addEventListener('input', () => {
    limpiarErrores(formSol);
    if (validarLocal(formSol)) pintarSolar();
  });
  formSol.addEventListener('submit', (e) => e.preventDefault());

  api('GET', '/api/publico/clima').then((r) => {
    clima = r.data;
    dias.replaceChildren(...clima.dias.map((d) => el('tr', {},
      el('td', {}, fecha(d.fecha)),
      el('td', { class: 'num' }, num(d.radiacionKwhM2, 2)),
      el('td', { class: 'num' }, num(d.temperaturaMax, 1)),
      el('td', { class: 'num' }, num(d.temperaturaMin, 1)))));
    pintarSolar();
  }).catch((err) => {
    cifras.replaceChildren(el('p', { class: 'ap-nota' }, err.message));
  });
}
