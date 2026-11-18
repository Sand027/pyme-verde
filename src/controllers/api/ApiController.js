'use strict';

/**
 * Base de los controladores de la API REST. Cada respuesta exitosa sigue la
 * forma { data, meta? }; los errores los formatea el manejador central como
 * { error: { codigo, mensaje, campos? } }.
 */
class ApiController {
  constructor() {
    // Enlaza los métodos públicos para poder pasarlos directo al router.
    for (const nombre of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if (nombre !== 'constructor' && typeof this[nombre] === 'function') this[nombre] = this[nombre].bind(this);
    }
  }

  ok(res, data, { status = 200, meta } = {}) {
    return res.status(status).json(meta ? { data, meta } : { data });
  }

  creado(res, data, ubicacion) {
    if (ubicacion) res.location(ubicacion);
    return this.ok(res, data, { status: 201 });
  }

  sinContenido(res) {
    return res.status(204).end();
  }

  ip(req) {
    return req.ip;
  }
}

module.exports = ApiController;
