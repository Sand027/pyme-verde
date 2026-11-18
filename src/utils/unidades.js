'use strict';

/**
 * Conversión de unidades equivalentes a la unidad base de cada categoría.
 * Permite capturar "500 g" en una categoría medida en kg sin errores de escala.
 */
const EQUIVALENCIAS = Object.freeze({
  kg: { kg: 1, g: 0.001, t: 1000 },
  m3: { m3: 1, L: 0.001 },
  kWh: { kWh: 1, Wh: 0.001, MWh: 1000 },
  h: { h: 1, min: 1 / 60 },
  par: { par: 1 },
  'dm²': { 'dm²': 1, 'm²': 100, 'pie²': 9.2903 },
});

function unidadesCompatibles(base) {
  return Object.keys(EQUIVALENCIAS[base] || { [base]: 1 });
}

/**
 * Convierte una cantidad a la unidad base.
 * @returns {number|null} null si la unidad no es compatible
 */
function aUnidadBase(cantidad, unidad, base) {
  if (!unidad || unidad === base) return Number(cantidad);
  const tabla = EQUIVALENCIAS[base];
  if (!tabla || tabla[unidad] === undefined) return null;
  return Math.round(Number(cantidad) * tabla[unidad] * 1000) / 1000;
}

module.exports = { EQUIVALENCIAS, unidadesCompatibles, aUnidadBase };
