'use strict';

const { ValidacionError } = require('../../utils/errores');

/**
 * Base de los controladores que devuelven páginas. Implementa el patrón
 * Post/Redirect/Get: si la validación falla se vuelve a mostrar el formulario
 * con los errores por campo; si tiene éxito se redirige con un mensaje.
 */
class WebController {
  constructor() {
    for (const nombre of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if (nombre !== 'constructor' && typeof this[nombre] === 'function') this[nombre] = this[nombre].bind(this);
    }
  }

  ip(req) {
    return req.ip;
  }

  exito(req, res, mensaje, destino) {
    req.flashMensaje('exito', mensaje);
    return res.redirect(303, destino);
  }

  /**
   * Ejecuta una acción de formulario. Ante un ValidacionError vuelve a
   * renderizar `vista` con los errores y lo que el usuario escribió.
   */
  async formulario(req, res, { accion, vista, datosVista = async () => ({}), mensaje, destino }) {
    try {
      const resultado = await accion();
      return this.exito(req, res, typeof mensaje === 'function' ? mensaje(resultado) : mensaje,
        typeof destino === 'function' ? destino(resultado) : destino);
    } catch (err) {
      if (!(err instanceof ValidacionError)) throw err;
      res.status(422);
      return res.render(vista, {
        ...(await datosVista()),
        errores: err.errores,
        valores: req.body,
        avisoError: err.message,
      });
    }
  }
}

module.exports = WebController;
