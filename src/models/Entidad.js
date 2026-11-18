'use strict';

/**
 * Clase base de todas las entidades del dominio.
 * Encapsula el identificador: solo se asigna una vez, al persistir.
 */
class Entidad {
  #id;

  constructor(id = null) {
    if (new.target === Entidad) {
      throw new TypeError('Entidad es abstracta; usa una subclase.');
    }
    this.#id = id ?? null;
  }

  get id() {
    return this.#id;
  }

  esNueva() {
    return this.#id === null;
  }

  asignarId(id) {
    if (this.#id !== null) throw new Error('La entidad ya tiene identificador.');
    this.#id = id;
  }

  /** Cada subclase define su representación pública (sin datos sensibles). */
  toJSON() {
    throw new Error(`${this.constructor.name} debe implementar toJSON().`);
  }
}

module.exports = Entidad;
