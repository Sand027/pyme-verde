'use strict';

const env = require('../config/env');
const { AppError, NoEncontradoError } = require('../utils/errores');

const esApi = (req) => req.originalUrl.startsWith('/api/');

/** Envuelve un controlador async para que sus errores lleguen al manejador. */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function noEncontrado(req, res, next) {
  next(new NoEncontradoError('La página'));
}

/**
 * Manejador central. Responde JSON en /api y una página en la web.
 * Nunca envía la pila de llamadas ni mensajes internos al cliente.
 */
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const conocido = err instanceof AppError;
  // Violaciones de restricciones de PostgreSQL que escaparon a la validación.
  let status = conocido ? err.status : 500;
  let codigo = conocido ? err.codigo : 'ERROR_INTERNO';
  let mensaje = conocido ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.';
  if (!conocido && err.code === '23505') { status = 409; codigo = 'DUPLICADO'; mensaje = 'Ya existe un registro con esos datos.'; }
  if (!conocido && (err.code === '23503' || err.code === '23514')) { status = 409; codigo = 'INTEGRIDAD'; mensaje = 'La operación viola una regla de integridad de los datos.'; }
  if (!conocido && err.type === 'entity.parse.failed') { status = 400; codigo = 'JSON_INVALIDO'; mensaje = 'El cuerpo de la petición no es JSON válido.'; }
  if (!conocido && err.type === 'entity.too.large') { status = 413; codigo = 'DEMASIADO_GRANDE'; mensaje = 'La petición es demasiado grande.'; }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, env.isTest ? err.message : err);
  }

  if (esApi(req) || req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({
      error: { codigo, mensaje, ...(err.errores ? { campos: err.errores } : {}) },
    });
  }

  if (status === 403 && codigo === 'CSRF') {
    req.flashMensaje?.('error', mensaje);
    return res.redirect(req.get('referer') && new URL(req.get('referer'), 'http://x').host === req.get('host') ? req.get('referer') : '/');
  }

  return res.status(status).render('errores/error', {
    titulo: status === 404 ? 'Página no encontrada' : status === 403 ? 'Acceso restringido' : 'Algo salió mal',
    status,
    mensaje,
  });
}

module.exports = { asincrono, noEncontrado, manejarErrores };
