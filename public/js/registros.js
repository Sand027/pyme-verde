/* Registros: lista con filtros y paginación, alta, edición y eliminación contra /api/registros.
   La tabla se construye con nodos del DOM (sin innerHTML con datos del servidor). */
import { api, avisar, confirmar, mostrarErrores, limpiarErrores, validarLocal, datosDe, num, dinero, fecha, el, panelLateral, hoy } from './pv.js';

const filtros = document.querySelector('[data-filtros]');
const filas = document.querySelector('[data-filas]');
const totalTxt = document.querySelector('[data-total]');
const paginaTxt = document.querySelector('[data-pagina-txt]');
const form = document.querySelector('[data-form-registro]');
const panelEl = document.querySelector('[data-panel]');
const panel = panelLateral(panelEl);
const csv = document.querySelector('[data-csv]');
const estadoForm = form.querySelector('[data-estado-form]');
const bloqueResiduo = form.querySelector('[data-residuo]');
const selDestino = form.elements.destino;

let pagina = 1;
let paginas = 1;
let pedido = 0;

function consulta() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(datosDe(filtros))) if (v !== false && v !== '') p.set(k, v);
  return p;
}

function celdaOrigen(r) {
  return r.origenDato === 'demostracion' ? el('span', { class: 'ap-chip ap-chip--demo' }, 'Demostración') : r.origenEtiqueta;
}

function fila(r) {
  const acciones = el('td', { class: 'acc' });
  if (r.permisos?.editar) acciones.append(el('button', { class: 'ap-btn-txt', type: 'button', onclick: () => editar(r.id), 'aria-label': `Editar ${r.categoria} del ${fecha(r.fecha)}` }, 'Editar'));
  if (r.permisos?.eliminar) acciones.append(el('button', { class: 'ap-btn-txt ap-btn-txt--peligro', type: 'button', onclick: () => eliminar(r), 'aria-label': `Eliminar ${r.categoria} del ${fecha(r.fecha)}` }, 'Eliminar'));
  const aprov = r.tipo === 'residuo' ? `${num(r.cantidadAprovechada, 2)} ${r.unidad} (${num(r.porcentajeAprovechado, 1)} %)` : '';
  return el('tr', {},
    el('td', { class: 'ap-nowrap' }, fecha(r.fecha)),
    el('td', {}, r.categoria, r.notas ? el('small', { class: 'ap-sub' }, r.notas.slice(0, 70)) : null),
    el('td', { class: 'num' }, `${num(r.cantidad, 2)} ${r.unidad}`),
    el('td', { class: 'num ocultar-tel' }, aprov),
    el('td', { class: 'num ocultar-tel' }, r.costo === null ? '' : dinero(r.costo)),
    el('td', { class: 'ocultar-tel' }, celdaOrigen(r)),
    el('td', { class: 'ocultar-tel' }, r.autor || ''),
    acciones);
}

async function cargar() {
  const n = ++pedido;
  const q = consulta();
  q.set('pagina', pagina);
  q.set('porPagina', 15);
  if (csv) { const c = consulta(); csv.href = `/api/reportes/registros.csv${c.toString() ? `?${c}` : ''}`; }
  filas.setAttribute('aria-busy', 'true');
  try {
    const r = await api('GET', `/api/registros?${q}`);
    if (n !== pedido) return;
    paginas = r.meta.paginas;
    filas.replaceChildren(...(r.data.length ? r.data.map(fila) : [el('tr', { class: 'ap-tabla__vacia' }, el('td', { colspan: 8 }, 'No hay registros con estos filtros.'))]));
    totalTxt.textContent = `${r.meta.total} registro${r.meta.total === 1 ? '' : 's'}`;
    paginaTxt.textContent = `Página ${r.meta.pagina} de ${r.meta.paginas}`;
    document.querySelector('[data-pag="-1"]').disabled = pagina <= 1;
    document.querySelector('[data-pag="1"]').disabled = pagina >= paginas;
    limpiarErrores(filtros);
  } catch (err) {
    if (err.campos && Object.keys(err.campos).length) mostrarErrores(filtros, err.campos);
    filas.replaceChildren(el('tr', { class: 'ap-tabla__vacia' }, el('td', { colspan: 8 }, err.message)));
  } finally {
    filas.removeAttribute('aria-busy');
  }
}

let espera = null;
filtros.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { pagina = 1; cargar(); }, 300); });
filtros.addEventListener('change', () => { pagina = 1; cargar(); });
filtros.addEventListener('reset', () => setTimeout(() => { pagina = 1; cargar(); }, 0));
filtros.addEventListener('submit', (e) => e.preventDefault());
// Al elegir un tipo, el selector de concepto muestra solo los de ese tipo.
filtros.elements.tipo.addEventListener('change', () => {
  const t = filtros.elements.tipo.value;
  for (const op of filtros.elements.categoriaId.querySelectorAll('option[data-tipo]')) op.hidden = Boolean(t) && op.dataset.tipo !== t;
  if (filtros.elements.categoriaId.selectedOptions[0]?.hidden) filtros.elements.categoriaId.value = '';
});
document.querySelectorAll('[data-pag]').forEach((b) => b.addEventListener('click', () => {
  pagina = Math.min(paginas, Math.max(1, pagina + Number(b.dataset.pag)));
  cargar();
}));

// --- formulario ------------------------------------------------------------------
async function prepararResiduo(valorDestino = '') {
  const op = form.elements.categoriaId.selectedOptions[0];
  form.querySelector('[data-unidad]').textContent = op?.dataset.unidad ? `en ${op.dataset.unidad}` : '';
  const esResiduo = op?.dataset.tipo === 'residuo';
  bloqueResiduo.hidden = !esResiduo;
  selDestino.required = esResiduo;
  if (!esResiduo) { form.elements.evidenciaDestino.required = false; return; }
  try {
    const r = await api('GET', `/api/residuos/categorias/${op.value}/destinos`);
    const d = r.data;
    selDestino.replaceChildren(el('option', { value: '' }, 'Elige el destino'),
      el('optgroup', { label: 'Aprovechamiento' }, d.destinosAprovechamiento.map((x) => el('option', { value: x.valor }, x.etiqueta))),
      el('optgroup', { label: 'Sin aprovechar' }, el('option', { value: d.destinoDisposicion.valor }, d.destinoDisposicion.etiqueta)));
    selDestino.value = valorDestino;
    form.elements.evidenciaDestino.required = d.exigeEvidencia;
    form.querySelector('[data-evid-ayuda]').textContent = d.exigeEvidencia ? 'obligatoria para este residuo' : 'opcional';
    form.querySelector('[data-recomendacion]').textContent = d.recomendaciones?.[0] || '';
  } catch (err) {
    avisar(err.message, 'error');
  }
}
form.elements.categoriaId.addEventListener('change', () => prepararResiduo());

function abrirNuevo() {
  form.reset();
  form.elements.id.value = '';
  limpiarErrores(form);
  estadoForm.textContent = '';
  form.elements.fecha.value = hoy();
  document.querySelector('[data-panel-titulo]').textContent = 'Nuevo registro';
  bloqueResiduo.hidden = true;
  panel.abrir();
}

async function editar(id) {
  try {
    const { data: r } = await api('GET', `/api/registros/${id}`);
    form.reset();
    limpiarErrores(form);
    estadoForm.textContent = '';
    document.querySelector('[data-panel-titulo]').textContent = `Editar registro del ${fecha(r.fecha)}`;
    for (const k of ['id', 'categoriaId', 'fecha', 'cantidad', 'costo', 'origenDato', 'notas', 'cantidadAprovechada', 'evidenciaDestino']) {
      if (form.elements[k] && r[k] !== null && r[k] !== undefined) form.elements[k].value = String(r[k]).slice(0, k === 'fecha' ? 10 : undefined);
    }
    await prepararResiduo(r.destino || '');
    panel.abrir();
  } catch (err) {
    avisar(err.message, 'error');
  }
}

async function eliminar(r) {
  const ok = await confirmar('Eliminar registro', `Se eliminará ${r.categoria} del ${fecha(r.fecha)} (${num(r.cantidad, 2)} ${r.unidad}). Queda constancia en la bitácora.`, 'Eliminar');
  if (!ok) return;
  try {
    await api('DELETE', `/api/registros/${r.id}`);
    avisar('Registro eliminado.');
    cargar();
  } catch (err) {
    avisar(err.message, 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(form);
  if (!validarLocal(form)) { estadoForm.textContent = 'Revisa los campos marcados.'; return; }
  const datos = datosDe(form);
  const id = datos.id;
  delete datos.id;
  if (bloqueResiduo.hidden) { delete datos.cantidadAprovechada; delete datos.destino; delete datos.evidenciaDestino; }
  if (!('costo' in datos)) datos.costo = null;
  if (!('notas' in datos)) datos.notas = '';
  const boton = form.querySelector('[data-guardar]');
  boton.disabled = true;
  estadoForm.textContent = 'Guardando…';
  try {
    await api(id ? 'PUT' : 'POST', id ? `/api/registros/${id}` : '/api/registros', datos);
    panel.cerrar();
    avisar(id ? 'Registro actualizado.' : 'Registro guardado.');
    cargar();
  } catch (err) {
    estadoForm.textContent = err.message;
    mostrarErrores(form, err.campos);
  } finally {
    boton.disabled = false;
  }
});

document.querySelector('[data-nuevo]')?.addEventListener('click', abrirNuevo);
if (new URLSearchParams(location.search).get('nuevo') === '1' && document.querySelector('[data-nuevo]')) abrirNuevo();
cargar();
