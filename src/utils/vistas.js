'use strict';

const { PERMISOS } = require('../models/Rol');

const nf = (decimales) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: decimales, minimumFractionDigits: 0 });
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Funciones de formato disponibles en todas las vistas. */
const formato = {
  numero(n, decimales = 2) {
    return n === null || n === undefined || Number.isNaN(Number(n)) ? 'sin dato' : nf(decimales).format(Number(n));
  },
  dinero(n) {
    return n === null || n === undefined ? 'sin dato' : `$${nf(0).format(Number(n))}`;
  },
  fecha(iso) {
    if (!iso) return '';
    const s = typeof iso === 'string' ? iso : new Date(iso).toISOString();
    const [a, m, d] = s.slice(0, 10).split('-').map(Number);
    return `${d} ${MESES[m - 1].slice(0, 3)} ${a}`;
  },
  fechaLarga(iso) {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  },
  fechaHora(valor) {
    if (!valor) return '';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(valor));
  },
  mes(mes) {
    const [a, m] = mes.split('-').map(Number);
    return `${MESES[m - 1]} ${a}`;
  },
};

/** Variables comunes: ruta actual (para el menú), permisos y formatos. */
function locales(req, res, next) {
  res.locals.ruta = req.path;
  res.locals.f = formato;
  res.locals.P = PERMISOS;
  res.locals.anio = new Date().getFullYear();
  res.locals.errores = {};
  res.locals.valores = {};
  next();
}

module.exports = { locales, formato };
