'use strict';

const crypto = require('crypto');
const { AppError } = require('../utils/errores');

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF con token sincronizado: el token vive en la sesión y cada
 * formulario (campo _csrf) o petición fetch (cabecera X-CSRF-Token) debe
 * devolverlo. Una página de otro sitio no puede leerlo.
 */
function asegurarToken(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  next();
}

function renovarToken(req) {
  req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}

function iguales(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verificarToken(req, res, next) {
  if (METODOS_SEGUROS.has(req.method)) return next();
  const esperado = req.session?.csrf;
  const recibido = req.get('x-csrf-token') || req.body?._csrf;
  if (!esperado || !recibido || !iguales(esperado, recibido)) {
    return next(new AppError('La sesión del formulario expiró. Recarga la página e inténtalo de nuevo.', 403, 'CSRF'));
  }
  return next();
}

module.exports = { asegurarToken, renovarToken, verificarToken };
