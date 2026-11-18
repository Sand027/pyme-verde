'use strict';

/**
 * Observador concreto: escucha todos los eventos del bus y los guarda en la
 * tabla bitacora. Los servicios no saben que existe.
 */
class BitacoraObserver {
  #repositorio;

  constructor(bitacoraRepository) {
    this.#repositorio = bitacoraRepository;
  }

  /** Se suscribe al comodín '*' para recibir todos los eventos. */
  conectar(eventBus) {
    return eventBus.suscribir('*', (evento, datos = {}) => this.#repositorio.registrar({
      usuarioId: datos.usuarioId ?? null,
      evento,
      entidad: datos.entidad ?? null,
      entidadId: datos.entidadId ?? null,
      detalle: datos.detalle ?? {},
      ip: datos.ip ?? null,
    }));
  }
}

module.exports = BitacoraObserver;
