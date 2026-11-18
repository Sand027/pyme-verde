'use strict';

const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const Database = require('../config/database');
const env = require('../config/env');

/**
 * Sesiones del lado del servidor guardadas en PostgreSQL. La cookie solo lleva
 * el identificador firmado: HttpOnly (JavaScript no la lee), Secure en
 * producción (solo viaja por HTTPS) y SameSite=Lax.
 */
function crearSesion() {
  return session({
    name: 'pv.sid',
    secret: env.SESSION_SECRET,
    store: new PgStore({
      pool: Database.getInstance().pool,
      tableName: 'session',
      createTableIfMissing: false,
      pruneSessionInterval: env.isTest ? false : 60 * 15,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: env.isProd,
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE_MS,
    },
  });
}

/** Mensajes de una sola lectura entre redirecciones (patrón PRG). */
function flash(req, res, next) {
  req.flashMensaje = (tipo, texto) => {
    if (!req.session) return;
    req.session.flash = [...(req.session.flash || []), { tipo, texto }];
  };
  res.locals.flash = req.session?.flash || [];
  if (req.session?.flash) delete req.session.flash;
  next();
}

module.exports = { crearSesion, flash };
