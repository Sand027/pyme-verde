'use strict';

const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/** Nonce por respuesta para los pocos scripts en línea permitidos por la CSP. */
function nonce(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

/** Cabeceras de seguridad: CSP estricta, HSTS en producción, sin MIME sniffing. */
const cabeceras = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'upgrade-insecure-requests': env.isProd ? [] : null,
    },
  },
  strictTransportSecurity: env.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * En producción el proveedor termina TLS y reenvía con X-Forwarded-Proto.
 * Cualquier petición que llegue por http se redirige a https.
 */
function forzarHttps(req, res, next) {
  if (env.isProd && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return next();
}

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    req.flashMensaje?.('error', 'Demasiados intentos de inicio de sesión desde esta red. Espera 15 minutos.');
    res.status(429);
    if (req.accepts(['html', 'json']) === 'json') return res.json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiados intentos. Espera 15 minutos.' } });
    return res.redirect('/login');
  },
});

const limiteApi = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiadas peticiones. Intenta más tarde.' } },
});

module.exports = { nonce, cabeceras, forzarHttps, limiteLogin, limiteApi };
