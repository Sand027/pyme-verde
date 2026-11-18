'use strict';

const { authService } = require('../container');
const { NoAutenticadoError, ProhibidoError } = require('../utils/errores');

const esApi = (req) => req.originalUrl.startsWith('/api/');

/** Recupera al usuario de la sesión en cada petición (si hay sesión). */
async function cargarUsuario(req, res, next) {
  try {
    const id = req.session?.usuarioId;
    req.usuario = id ? await authService.usuarioDeSesion(id) : null;
    if (id && !req.usuario) {
      // La cuenta se desactivó o eliminó: se cierra la sesión.
      delete req.session.usuarioId;
    }
    res.locals.usuario = req.usuario ? req.usuario.toJSON() : null;
    res.locals.puede = (permiso) => Boolean(req.usuario?.puede(permiso));
    next();
  } catch (err) {
    next(err);
  }
}

/** Exige sesión iniciada. En la web redirige al login conservando el destino. */
function requiereSesion(req, res, next) {
  if (req.usuario) return next();
  if (esApi(req)) return next(new NoAutenticadoError());
  req.flashMensaje('aviso', 'Inicia sesión para entrar al panel.');
  const destino = encodeURIComponent(req.originalUrl);
  return res.redirect(`/login?siguiente=${destino}`);
}

/** Exige un permiso concreto, verificado en el servidor. */
function requierePermiso(...permisos) {
  return (req, res, next) => {
    if (!req.usuario) return requiereSesion(req, res, next);
    if (permisos.every((p) => req.usuario.puede(p))) return next();
    return next(new ProhibidoError());
  };
}

module.exports = { cargarUsuario, requiereSesion, requierePermiso };
