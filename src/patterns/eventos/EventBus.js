'use strict';

/**
 * Patrón Observer.
 *
 * Problema que resuelve: varias operaciones (inicio de sesión, alta de un
 * registro, cambio de estado de una acción) deben dejar rastro en la bitácora
 * de auditoría. Los servicios solo publican el evento; los observadores
 * suscritos (BitacoraObserver) deciden qué hacer, sin acoplar los servicios a
 * la auditoría.
 */
class EventBus {
  #suscriptores = new Map();

  suscribir(evento, manejador) {
    if (!this.#suscriptores.has(evento)) this.#suscriptores.set(evento, new Set());
    this.#suscriptores.get(evento).add(manejador);
    return () => this.#suscriptores.get(evento)?.delete(manejador);
  }

  /** Notifica a los suscriptores del evento y a los comodín ('*'). */
  async publicar(evento, datos) {
    const manejadores = [
      ...(this.#suscriptores.get(evento) || []),
      ...(this.#suscriptores.get('*') || []),
    ];
    // Un observador que falla no debe romper la operación principal.
    await Promise.all(manejadores.map(async (m) => {
      try {
        await m(evento, datos);
      } catch (err) {
        console.error(`[eventos] observador de "${evento}" falló:`, err.message);
      }
    }));
  }
}

// Una instancia compartida por la aplicación.
module.exports = { EventBus, eventBus: new EventBus() };
