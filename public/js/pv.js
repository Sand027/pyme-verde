/* Utilidades compartidas del panel: llamadas a la API con el token CSRF, avisos,
   confirmaciones, errores por campo y formatos. Cada página las importa como módulo. */

const token = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

/** Error de la API con el mensaje y los errores por campo que devuelve el servidor. */
export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.error?.mensaje || `La solicitud falló (HTTP ${status}).`);
    this.status = status;
    this.codigo = cuerpo?.error?.codigo || 'ERROR';
    this.campos = cuerpo?.error?.campos || {};
  }
}

/** fetch contra /api con JSON, cookie de sesión y cabecera X-CSRF-Token. */
export async function api(metodo, url, cuerpo) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  if (metodo !== 'GET') opciones.headers['X-CSRF-Token'] = token();
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    throw new ErrorApi(0, { error: { mensaje: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.' } });
  }
  if (res.status === 401) {
    location.href = `/login?siguiente=${encodeURIComponent(location.pathname)}`;
    throw new ErrorApi(401, { error: { mensaje: 'Tu sesión terminó.' } });
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new ErrorApi(res.status, datos);
  return datos;
}

/** Aviso flotante que se oculta solo. */
let reloj = null;
export function avisar(texto, tipo = 'exito') {
  const t = document.querySelector('[data-toast]');
  if (!t) return;
  t.textContent = texto;
  t.dataset.tipo = tipo;
  t.hidden = false;
  clearTimeout(reloj);
  reloj = setTimeout(() => { t.hidden = true; }, tipo === 'error' ? 6000 : 3500);
}

/** Diálogo de confirmación nativo (<dialog>); resuelve true si se confirma. */
export function confirmar(titulo, texto, boton = 'Confirmar') {
  const d = document.querySelector('[data-confirmar]');
  if (!d || typeof d.showModal !== 'function') return Promise.resolve(window.confirm(`${titulo}\n${texto}`));
  d.querySelector('[data-confirmar-titulo]').textContent = titulo;
  d.querySelector('[data-confirmar-texto]').textContent = texto;
  d.querySelector('[data-confirmar-si]').textContent = boton;
  d.returnValue = '';
  d.showModal();
  return new Promise((ok) => d.addEventListener('close', () => ok(d.returnValue === 'si'), { once: true }));
}

/** Muestra los errores por campo del servidor bajo cada control del formulario. */
export function mostrarErrores(form, campos = {}) {
  limpiarErrores(form);
  let primero = null;
  for (const [nombre, mensaje] of Object.entries(campos)) {
    const el = form.elements.namedItem(nombre);
    if (!el || !el.closest) continue;
    const campo = el.closest('.field') || el.parentElement;
    let p = campo.querySelector('.field__error');
    if (!p) {
      p = document.createElement('p');
      p.className = 'field__error';
      p.id = `${el.id || nombre}-err`;
      campo.append(p);
      el.setAttribute('aria-describedby', p.id);
    }
    p.textContent = mensaje;
    p.hidden = false;
    el.setAttribute('aria-invalid', 'true');
    primero ||= el;
  }
  primero?.focus();
}

export function limpiarErrores(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field__error').forEach((p) => { p.hidden = true; });
}

/** Valida en el navegador antes de enviar; el servidor vuelve a validar todo. */
export function validarLocal(form) {
  const malos = [...form.elements].filter((el) => el.willValidate && !el.checkValidity());
  if (!malos.length) return true;
  const campos = {};
  for (const el of malos) campos[el.name] = el.dataset.error || el.validationMessage;
  mostrarErrores(form, campos);
  return false;
}

/** Datos de un formulario como objeto; los vacíos se omiten y los checkbox son booleanos. */
export function datosDe(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'submit' || el.name === '_csrf') continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.value !== '') o[el.name] = el.value;
  }
  return o;
}

const nf = (d) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: d });
export const num = (n, d = 2) => (n === null || n === undefined || Number.isNaN(Number(n)) ? 'sin dato' : nf(d).format(Number(n)));
export const dinero = (n) => (n === null || n === undefined ? 'sin dato' : `$${nf(0).format(Number(n))}`);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fecha(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** Crea un elemento con atributos e hijos (texto escapado: nunca innerHTML con datos). */
export function el(etiqueta, attrs = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(h instanceof Node ? h : String(h));
  return e;
}

/** Panel lateral de edición: abrir y cerrar con foco y tecla Escape. */
export function panelLateral(panel) {
  const fondo = document.querySelector('[data-fondo]');
  let previo = null;
  const cerrar = () => {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (fondo) fondo.hidden = true;
    previo?.focus();
  };
  const abrir = () => {
    previo = document.activeElement;
    panel.classList.add('is-open');
    panel.removeAttribute('aria-hidden');
    if (fondo) fondo.hidden = false;
    panel.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  };
  panel.querySelectorAll('[data-panel-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
  fondo?.addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) cerrar(); });
  return { abrir, cerrar };
}

const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/**
 * Gráfica de barras con línea de meta, dibujada en SVG desde los datos de la API.
 * puntos: [{ etiqueta, valor, estado }]
 */
export function graficaBarras(contenedor, puntos, { meta = null, unidad = '', decimales = 2 } = {}) {
  contenedor.replaceChildren();
  const ancho = Math.max(320, contenedor.clientWidth || 600);
  const alto = 260;
  const m = { arriba: 24, abajo: 30, izq: 44, der: 12 };
  const valores = puntos.map((p) => p.valor || 0);
  const tope = Math.max(...valores, meta || 0) * 1.15 || 1;
  const y = (v) => m.arriba + (alto - m.arriba - m.abajo) * (1 - v / tope);
  const svg = s('svg', { viewBox: `0 0 ${ancho} ${alto}`, role: 'img', 'aria-label': puntos.map((p) => `${p.etiqueta}: ${p.valor === null ? 'sin dato' : num(p.valor, decimales)} ${unidad}`).join('; ') });

  for (let i = 0; i <= 4; i += 1) {
    const v = (tope / 4) * i;
    svg.append(s('line', { class: 'rejilla', x1: m.izq, x2: ancho - m.der, y1: y(v), y2: y(v) }));
    const t = s('text', { x: m.izq - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tenue' });
    t.textContent = num(v, v < 10 ? 2 : 0);
    svg.append(t);
  }
  const paso = (ancho - m.izq - m.der) / puntos.length;
  const tip = el('div', { class: 'ap-grafica__tip', hidden: true });
  puntos.forEach((p, i) => {
    const x = m.izq + paso * i + paso * 0.18;
    const w = paso * 0.64;
    const v = p.valor || 0;
    const r = s('rect', { class: 'barra', x, y: y(v), width: w, height: Math.max(1, y(0) - y(v)), rx: 4, 'data-estado': p.valor === null ? 'sin_dato' : p.estado, tabindex: 0 });
    const texto = `${p.etiqueta}: ${p.valor === null ? 'sin dato' : `${num(p.valor, decimales)} ${unidad}`}`;
    const mostrar = () => { tip.textContent = texto; tip.style.left = `${((x + w / 2) / ancho) * 100}%`; tip.style.top = `${(y(v) / alto) * 260}px`; tip.hidden = false; };
    r.addEventListener('mouseenter', mostrar);
    r.addEventListener('focus', mostrar);
    r.addEventListener('mouseleave', () => { tip.hidden = true; });
    r.addEventListener('blur', () => { tip.hidden = true; });
    svg.append(r);
    const et = s('text', { x: x + w / 2, y: alto - 10, 'text-anchor': 'middle' });
    et.textContent = p.etiqueta.slice(0, 3);
    svg.append(et);
  });
  if (meta !== null) {
    svg.append(s('line', { class: 'meta', x1: m.izq, x2: ancho - m.der, y1: y(meta), y2: y(meta) }));
    const t = s('text', { x: ancho - m.der, y: y(meta) - 6, 'text-anchor': 'end' });
    t.textContent = `meta ${num(meta, decimales)}`;
    svg.append(t);
  }
  svg.append(s('line', { class: 'eje', x1: m.izq, x2: ancho - m.der, y1: y(0), y2: y(0) }));
  contenedor.append(svg, tip);
}

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria del navegador, no en UTC. */
export const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
