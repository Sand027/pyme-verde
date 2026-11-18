/* Plan de acciones: tablero por estado, alta y edición (administración), avance y evidencias
   (responsable o administración) contra /api/acciones. */
import { api, avisar, confirmar, mostrarErrores, limpiarErrores, validarLocal, datosDe, fecha, el, panelLateral, hoy } from './pv.js';

const datos = JSON.parse(document.getElementById('datos-acciones').textContent);
let acciones = datos.acciones;
const ESTADOS = datos.estados;
const filtros = document.querySelector('[data-filtros-acc]');
const panel = panelLateral(document.querySelector('[data-panel]'));
const formAccion = document.querySelector('[data-form-accion]');
const seguimiento = document.querySelector('[data-seguimiento]');
const formAvance = document.querySelector('[data-form-avance]');
const formEvid = document.querySelector('[data-form-evidencia]');
const listaEvid = document.querySelector('[data-evidencias]');
const salidaAv = document.querySelector('[data-av-out]');
let actual = null;

function visibles() {
  const f = datosDe(filtros);
  return acciones.filter((a) => (!f.responsableId || String(a.responsableId) === f.responsableId)
    && (!f.indicadorId || String(a.indicadorId) === f.indicadorId)
    && (!f.soloVencidas || a.vencida)
    && (!f.soloMias || a.responsableId === datos.usuarioId));
}

function tarjeta(a) {
  const acc = el('div', { class: 'ap-tarjeta__acc' },
    el('button', { class: 'ap-btn-txt', type: 'button', onclick: () => abrir(a.id), 'aria-label': `Abrir ${a.titulo}` }, a.permisos.administrar ? 'Editar' : 'Abrir'));
  if (a.permisos.seguir && a.estado === 'pendiente') acc.append(el('button', { class: 'ap-btn-txt', type: 'button', onclick: () => mover(a, 'en_proceso') }, 'Iniciar'));
  if (a.permisos.seguir && a.estado === 'en_proceso') acc.append(el('button', { class: 'ap-btn-txt', type: 'button', onclick: () => mover(a, 'completada') }, 'Completar'));
  return el('article', { class: 'ap-tarjeta', 'data-vencida': String(a.vencida) },
    el('h3', { class: 'ap-tarjeta__t' }, a.titulo),
    el('p', { class: 'ap-tarjeta__d' }, a.meta),
    el('div', { class: 'ap-barra', 'data-estado': a.estado === 'completada' ? 'cumple' : a.vencida ? 'lejos' : 'cerca', style: `--k:${a.avance / 100}`, role: 'img', 'aria-label': `Avance ${a.avance} %` }, el('i')),
    el('dl', { class: 'ap-tarjeta__datos' },
      el('dt', {}, 'Avance'), el('dd', {}, `${a.avance} %`),
      el('dt', {}, 'Responsable'), el('dd', {}, a.responsable || 'Sin asignar'),
      el('dt', {}, 'Fecha objetivo'), el('dd', {}, fecha(a.fechaObjetivo), a.vencida ? el('span', { class: 'ap-chip', 'data-estado': 'vencida', style: 'margin-left:6px' }, 'Vencida') : null),
      el('dt', {}, 'Indicador'), el('dd', {}, a.indicador || 'Ninguno'),
      el('dt', {}, 'Evidencias'), el('dd', {}, String(a.evidencias.length))),
    acc);
}

function pintar() {
  const lista = visibles();
  for (const col of document.querySelectorAll('[data-col]')) {
    const enCol = lista.filter((a) => a.estado === col.dataset.col);
    col.querySelector('[data-n]').textContent = `${enCol.length}`;
    col.querySelector('[data-lista]').replaceChildren(...(enCol.length ? enCol.map(tarjeta) : [el('p', { class: 'ap-nota' }, 'Sin acciones aquí.')]));
  }
}

function reemplazar(a) {
  const i = acciones.findIndex((x) => x.id === a.id);
  if (i >= 0) acciones[i] = a; else acciones.push(a);
  pintar();
}

async function mover(a, estado) {
  try {
    const r = await api('PATCH', `/api/acciones/${a.id}/seguimiento`, { estado });
    reemplazar(r.data);
    avisar(`"${a.titulo}" pasó a ${ESTADOS[estado].toLowerCase()}.`);
  } catch (err) { avisar(err.message, 'error'); }
}

function pintarEvidencias(a) {
  listaEvid.replaceChildren(...(a.evidencias.length ? a.evidencias.map((e) => el('li', {},
    e.descripcion,
    el('small', {}, `${fecha(e.fecha)} · ${e.autor || ''}`, e.enlace ? ' · ' : '', e.enlace ? el('a', { href: e.enlace, target: '_blank', rel: 'noopener noreferrer' }, 'ver enlace') : null)))
    : [el('li', {}, 'Todavía no hay evidencias.')]));
}

function abrir(id) {
  actual = acciones.find((a) => a.id === id) || null;
  document.querySelector('[data-panel-titulo]').textContent = actual ? actual.titulo : 'Nueva acción';
  if (formAccion) {
    formAccion.reset();
    limpiarErrores(formAccion);
    formAccion.querySelector('[data-estado-accion]').textContent = '';
    formAccion.querySelector('[data-eliminar]').hidden = !actual;
    if (actual) {
      for (const k of ['id', 'titulo', 'meta', 'descripcion', 'responsableId', 'indicadorId', 'fechaInicio', 'fechaObjetivo']) {
        if (actual[k] !== null && actual[k] !== undefined) formAccion.elements[k].value = String(actual[k]).slice(0, k.startsWith('fecha') ? 10 : undefined);
      }
    } else {
      formAccion.elements.id.value = '';
      formAccion.elements.fechaInicio.value = hoy();
    }
  }
  const puedeSeguir = Boolean(actual?.permisos.seguir);
  seguimiento.hidden = !actual || (!puedeSeguir && !actual.evidencias.length);
  formAvance.hidden = !puedeSeguir;
  formEvid.hidden = !puedeSeguir;
  if (actual) {
    formAvance.elements.avance.value = actual.avance;
    salidaAv.textContent = actual.avance;
    formEvid.reset();
    limpiarErrores(formEvid);
    formEvid.elements.fecha.value = hoy();
    pintarEvidencias(actual);
  }
  panel.abrir();
}

formAccion?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const estado = formAccion.querySelector('[data-estado-accion]');
  limpiarErrores(formAccion);
  if (!validarLocal(formAccion)) { estado.textContent = 'Revisa los campos marcados.'; return; }
  const d = datosDe(formAccion);
  const id = d.id;
  delete d.id;
  d.responsableId = d.responsableId ? Number(d.responsableId) : null;
  d.indicadorId = d.indicadorId ? Number(d.indicadorId) : null;
  if (!('descripcion' in d)) d.descripcion = '';
  try {
    const r = await api(id ? 'PUT' : 'POST', id ? `/api/acciones/${id}` : '/api/acciones', d);
    reemplazar(r.data);
    panel.cerrar();
    avisar(id ? 'Acción actualizada.' : 'Acción creada.');
  } catch (err) {
    estado.textContent = err.message;
    mostrarErrores(formAccion, err.campos);
  }
});

formAccion?.querySelector('[data-eliminar]').addEventListener('click', async () => {
  if (!actual) return;
  const ok = await confirmar('Eliminar acción', `Se eliminará "${actual.titulo}" con sus ${actual.evidencias.length} evidencias.`, 'Eliminar');
  if (!ok) return;
  try {
    await api('DELETE', `/api/acciones/${actual.id}`);
    acciones = acciones.filter((a) => a.id !== actual.id);
    pintar();
    panel.cerrar();
    avisar('Acción eliminada.');
  } catch (err) { avisar(err.message, 'error'); }
});

formAvance.elements.avance.addEventListener('input', () => { salidaAv.textContent = formAvance.elements.avance.value; });
formAvance.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('PATCH', `/api/acciones/${actual.id}/seguimiento`, { avance: Number(formAvance.elements.avance.value) });
    actual = r.data;
    reemplazar(actual);
    avisar(`Avance guardado: ${actual.avance} %, ${actual.estadoEtiqueta.toLowerCase()}.`);
  } catch (err) { avisar(err.message, 'error'); }
});

formEvid.addEventListener('submit', async (e) => {
  e.preventDefault();
  const estado = formEvid.querySelector('[data-estado-evid]');
  limpiarErrores(formEvid);
  if (!validarLocal(formEvid)) { estado.textContent = 'Revisa los campos marcados.'; return; }
  try {
    const r = await api('POST', `/api/acciones/${actual.id}/evidencias`, datosDe(formEvid));
    actual = r.data;
    reemplazar(actual);
    pintarEvidencias(actual);
    formEvid.reset();
    formEvid.elements.fecha.value = hoy();
    estado.textContent = '';
    avisar('Evidencia agregada.');
  } catch (err) {
    estado.textContent = err.message;
    mostrarErrores(formEvid, err.campos);
  }
});

filtros.addEventListener('change', pintar);
document.querySelector('[data-nueva]')?.addEventListener('click', () => abrir(null));
pintar();
