/* Tablero: dibuja la serie de seis meses del indicador elegido con datos de GET /api/indicadores/:id/serie. */
import { api, avisar, graficaBarras } from './pv.js';

const caja = document.querySelector('[data-grafica]');
const select = document.querySelector('[data-serie-select]');
const titulo = document.querySelector('[data-serie-titulo]');
const hasta = caja?.dataset.hasta;

async function cargar(id) {
  const op = [...select.options].find((o) => o.value === String(id));
  if (!op) return;
  select.value = op.value;
  titulo.textContent = `Seis meses de ${op.textContent.trim().toLowerCase()}`;
  caja.setAttribute('aria-busy', 'true');
  try {
    const r = await api('GET', `/api/indicadores/${id}/serie?meses=6&hasta=${encodeURIComponent(hasta)}`);
    const unidad = op.dataset.unidad;
    graficaBarras(caja, r.data.puntos, { meta: Number(op.dataset.meta), unidad, decimales: unidad === '%' ? 1 : 3 });
  } catch (err) {
    caja.replaceChildren(Object.assign(document.createElement('p'), { className: 'ap-nota', textContent: err.message }));
    avisar(err.message, 'error');
  } finally {
    caja.removeAttribute('aria-busy');
  }
}

if (caja && select) {
  select.addEventListener('change', () => cargar(select.value));
  document.querySelectorAll('[data-serie]').forEach((b) => b.addEventListener('click', () => {
    cargar(b.dataset.serie);
    caja.closest('section')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  let ancho = caja.clientWidth;
  new ResizeObserver(() => { if (Math.abs(caja.clientWidth - ancho) > 40) { ancho = caja.clientWidth; cargar(select.value); } }).observe(caja);
  cargar(select.value);
}
