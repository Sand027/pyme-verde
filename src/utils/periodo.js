'use strict';

const { ValidacionError } = require('./errores');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function ultimoDiaDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Primer y último día del mes de una fecha AAAA-MM-DD. */
function limitesDelMes(fechaISO) {
  const [a, m] = fechaISO.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  return { desde: `${a}-${mm}-01`, hasta: `${a}-${mm}-${String(ultimoDiaDelMes(a, m)).padStart(2, '0')}` };
}

/** Suma meses a una fecha AAAA-MM-01. */
function sumarMeses(fechaISO, n) {
  const [a, m] = fechaISO.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** Lista de meses 'AAAA-MM' entre dos fechas, inclusive. */
function mesesEntre(desde, hasta) {
  const meses = [];
  let actual = `${desde.slice(0, 7)}-01`;
  const fin = hasta.slice(0, 7);
  while (actual.slice(0, 7) <= fin && meses.length < 240) {
    meses.push(actual.slice(0, 7));
    actual = sumarMeses(actual, 1);
  }
  return meses;
}

/**
 * Normaliza un periodo recibido por query string. Por defecto: los últimos
 * `mesesPorDefecto` meses completos más el mes en curso.
 */
function normalizarPeriodo({ desde, hasta } = {}, mesesPorDefecto = 3) {
  const errores = {};
  if (desde && !FECHA_RE.test(desde)) errores.desde = 'Usa el formato AAAA-MM-DD.';
  if (hasta && !FECHA_RE.test(hasta)) errores.hasta = 'Usa el formato AAAA-MM-DD.';
  if (Object.keys(errores).length) throw new ValidacionError(errores, 'El periodo no es válido.');

  const fin = hasta || limitesDelMes(hoyISO()).hasta;
  const inicio = desde || sumarMeses(`${fin.slice(0, 7)}-01`, -(mesesPorDefecto - 1));
  if (inicio > fin) throw new ValidacionError({ desde: 'La fecha inicial debe ser anterior a la final.' }, 'El periodo no es válido.');
  return { desde: inicio, hasta: fin, meses: mesesEntre(inicio, fin) };
}

/** Etiqueta legible: "nov 2026". */
function etiquetaMes(mes) {
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [a, m] = mes.split('-').map(Number);
  return `${nombres[m - 1]} ${a}`;
}

module.exports = { hoyISO, limitesDelMes, sumarMeses, mesesEntre, normalizarPeriodo, etiquetaMes };
