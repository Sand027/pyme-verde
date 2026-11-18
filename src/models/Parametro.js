'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

/**
 * Supuesto de cálculo editable por el administrador (tarifa eléctrica,
 * precio del agua, precio de la piel...). La calculadora y los indicadores
 * económicos lo usan y muestran su fuente.
 */
class Parametro extends Entidad {
  #pymeId;
  #clave;
  #nombre;
  #valor;
  #unidad;
  #fuente;

  constructor({ id = null, pymeId, clave, nombre, valor, unidad, fuente = '' }) {
    super(id);
    this.#pymeId = pymeId;
    this.#clave = clave;
    this.#nombre = nombre;
    this.#valor = Number(valor);
    this.#unidad = unidad;
    this.#fuente = fuente;
  }

  get pymeId() { return this.#pymeId; }
  get clave() { return this.#clave; }
  get nombre() { return this.#nombre; }
  get valor() { return this.#valor; }
  get unidad() { return this.#unidad; }
  get fuente() { return this.#fuente; }

  actualizar({ valor, fuente }) {
    new Validador({ valor, fuente })
      .requerido('valor', 'El valor').numero('valor', 'El valor', { min: 0, max: 1e9 })
      .texto('fuente', 'La fuente', { max: 300 })
      .lanzarSiHayErrores();
    this.#valor = Number(valor);
    if (fuente !== undefined) this.#fuente = String(fuente).trim();
  }

  toJSON() {
    return {
      id: this.id,
      clave: this.#clave,
      nombre: this.#nombre,
      valor: this.#valor,
      unidad: this.#unidad,
      fuente: this.#fuente,
    };
  }
}

module.exports = Parametro;
