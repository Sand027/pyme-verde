/* Reportes: atajos de periodos, validación de periodos iguales, filtro por tipo y orden de la tabla por columna. */
const form = document.querySelector('[data-form-periodos]');
const tabla = document.querySelector('[data-tabla-cat]');
const iso = (d) => d.toISOString().slice(0, 10);
const finDeMes = (a, m) => new Date(Date.UTC(a, m + 1, 0));

function meses(desde, hasta) {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

document.querySelectorAll('[data-atajo]').forEach((b) => b.addEventListener('click', () => {
  const n = b.dataset.atajo === 'mes' ? 1 : 3;
  const hoy = new Date();
  // B termina en el último mes cerrado; A son los n meses anteriores a B.
  const finB = finDeMes(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1);
  const iniB = new Date(Date.UTC(finB.getUTCFullYear(), finB.getUTCMonth() - (n - 1), 1));
  const finA = finDeMes(iniB.getUTCFullYear(), iniB.getUTCMonth() - 1);
  const iniA = new Date(Date.UTC(finA.getUTCFullYear(), finA.getUTCMonth() - (n - 1), 1));
  form.elements.aDesde.value = iso(iniA);
  form.elements.aHasta.value = iso(finA);
  form.elements.bDesde.value = iso(iniB);
  form.elements.bHasta.value = iso(finB);
  form.requestSubmit();
}));

form.addEventListener('submit', (e) => {
  const { aDesde, aHasta, bDesde, bHasta } = form.elements;
  const err = (campo, texto) => { e.preventDefault(); campo.setCustomValidity(texto); campo.reportValidity(); campo.addEventListener('input', () => campo.setCustomValidity(''), { once: true }); };
  if (aDesde.value > aHasta.value) return err(aHasta, 'El periodo A termina antes de empezar.');
  if (bDesde.value > bHasta.value) return err(bHasta, 'El periodo B termina antes de empezar.');
  if (meses(aDesde.value, aHasta.value) !== meses(bDesde.value, bHasta.value)) return err(bHasta, 'Los dos periodos deben tener el mismo número de meses.');
  return undefined;
});

document.querySelector('[data-filtro-tipo]')?.addEventListener('change', (e) => {
  for (const tr of tabla.tBodies[0].rows) if (tr.dataset.tipo) tr.hidden = Boolean(e.target.value) && tr.dataset.tipo !== e.target.value;
});

let orden = { col: -1, asc: true };
tabla.querySelectorAll('[data-ordenar]').forEach((b) => b.addEventListener('click', () => {
  const col = Number(b.dataset.ordenar);
  orden = { col, asc: orden.col === col ? !orden.asc : true };
  const filas = [...tabla.tBodies[0].rows].filter((r) => r.dataset.tipo);
  const valor = (tr) => tr.cells[col].dataset.v;
  filas.sort((x, y) => {
    const a = valor(x); const c = valor(y);
    const na = Number(a); const nc = Number(c);
    const r = a !== '' && c !== '' && !Number.isNaN(na) && !Number.isNaN(nc) ? na - nc : String(a).localeCompare(String(c), 'es');
    return orden.asc ? r : -r;
  });
  tabla.tBodies[0].append(...filas);
  tabla.querySelectorAll('th').forEach((th) => th.removeAttribute('aria-sort'));
  b.closest('th').setAttribute('aria-sort', orden.asc ? 'ascending' : 'descending');
}));
