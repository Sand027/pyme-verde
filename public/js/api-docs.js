'use strict';

/* Prueba en vivo de los servicios públicos: pide la ruta con fetch y muestra el JSON formateado. */
(function () {
  const caja = document.querySelector('[data-probar]');
  if (!caja) return;
  const estado = caja.querySelector('[data-estado]');
  const salida = caja.querySelector('[data-salida]');

  caja.addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-url]');
    if (!boton) return;
    const url = boton.dataset.url;
    caja.querySelectorAll('button[data-url]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    estado.textContent = `Pidiendo ${url}…`;
    const inicio = performance.now();
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const datos = await res.json();
      const ms = Math.round(performance.now() - inicio);
      estado.textContent = `HTTP ${res.status} · ${ms} ms · ${res.headers.get('content-type') || ''}`;
      salida.textContent = JSON.stringify(datos, null, 2);
    } catch (err) {
      estado.textContent = 'No se pudo conectar con el servidor.';
      salida.textContent = '{}';
    }
  });
}());
