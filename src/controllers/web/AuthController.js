'use strict';

const WebController = require('./WebController');
const { renovarToken } = require('../../middleware/csrf');
const { AppError, ValidacionError } = require('../../utils/errores');

/** Solo se aceptan destinos internos para evitar redirecciones abiertas. */
function destinoSeguro(valor) {
  const s = String(valor || '');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : '/panel';
}

class AuthController extends WebController {
  #auth;

  constructor(authService) {
    super();
    this.#auth = authService;
  }

  mostrarLogin(req, res) {
    if (req.usuario) return res.redirect('/panel');
    return res.render('auth/login', { titulo: 'Iniciar sesión', siguiente: destinoSeguro(req.query.siguiente), salida: req.query.salida === '1' });
  }

  async iniciar(req, res) {
    const siguiente = destinoSeguro(req.body.siguiente);
    try {
      const usuario = await this.#auth.autenticar(req.body.username, req.body.password, this.ip(req));
      // Nueva sesión tras autenticar: evita la fijación de sesión.
      await new Promise((ok, mal) => req.session.regenerate((e) => (e ? mal(e) : ok())));
      req.session.usuarioId = usuario.id;
      renovarToken(req);
      req.flashMensaje('exito', `Hola, ${usuario.nombre}. Sesión iniciada.`);
      return res.redirect(303, siguiente);
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 500) throw err;
      res.status(err instanceof ValidacionError ? 422 : 401);
      return res.render('auth/login', {
        titulo: 'Iniciar sesión',
        siguiente,
        valores: { username: req.body.username },
        errores: err.errores || {},
        avisoError: err.message,
      });
    }
  }

  async cerrar(req, res) {
    await new Promise((ok) => req.session.destroy(() => ok()));
    res.clearCookie('pv.sid');
    return res.redirect(303, '/login?salida=1');
  }

  perfil(req, res) {
    return res.render('auth/perfil', { titulo: 'Mi cuenta' });
  }

  async cambiarPassword(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#auth.cambiarPassword(req.usuario, req.body, this.ip(req)),
      vista: 'auth/perfil',
      datosVista: async () => ({ titulo: 'Mi cuenta', valores: {} }),
      mensaje: 'Contraseña actualizada.',
      destino: '/perfil',
    });
  }
}

module.exports = AuthController;
