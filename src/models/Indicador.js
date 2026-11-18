'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

const DIMENSIONES = Object.freeze({ ambiental: 'Ambiental', social: 'Social', economica: 'Económica' });

/**
 * Definición de un indicador: qué se mide, con qué fórmula, en qué unidad y
 * contra qué meta. El cálculo lo realiza la estrategia asociada a su clave.
 */
class Indicador extends Entidad {
  #pymeId;
  #categoriaId;
  #clave;
  #nombre;
  #dimension;
  #formula;
  #unidad;
  #meta;
  #sentido;
  #publico;
  #descripcion;

  constructor({ id = null, pymeId, categoriaId = null, clave, nombre, dimension, formula, unidad, meta,
    sentido, publico = false, descripcion = '' }) {
    super(id);
    this.#pymeId = pymeId;
    this.#categoriaId = categoriaId;
    this.#clave = clave;
    this.#nombre = nombre;
    this.#dimension = dimension;
    this.#formula = formula;
    this.#unidad = unidad;
    this.#meta = Number(meta);
    this.#sentido = sentido;
    this.#publico = Boolean(publico);
    this.#descripcion = descripcion || '';
  }

  get pymeId() { return this.#pymeId; }
  get categoriaId() { return this.#categoriaId; }
  get clave() { return this.#clave; }
  get nombre() { return this.#nombre; }
  get dimension() { return this.#dimension; }
  get formula() { return this.#formula; }
  get unidad() { return this.#unidad; }
  get meta() { return this.#meta; }
  get sentido() { return this.#sentido; }
  get publico() { return this.#publico; }
  get descripcion() { return this.#descripcion; }

  /**
   * Compara un valor con la meta.
   * cumple: alcanza la meta; cerca: a menos de 10 % de la meta; lejos: el resto.
   */
  evaluar(valor) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return 'sin_datos';
    const meta = this.#meta;
    if (this.#sentido === 'menor') {
      if (valor <= meta) return 'cumple';
      return valor <= meta * 1.1 ? 'cerca' : 'lejos';
    }
    if (valor >= meta) return 'cumple';
    return valor >= meta * 0.9 ? 'cerca' : 'lejos';
  }

  /** Diferencia con la meta, positiva cuando falta por lograr. */
  brecha(valor) {
    if (valor === null || valor === undefined) return null;
    return this.#sentido === 'menor' ? valor - this.#meta : this.#meta - valor;
  }

  actualizarMeta(meta, publico) {
    new Validador({ meta }).requerido('meta', 'La meta').numero('meta', 'La meta', { min: 0, max: 1e9 }).lanzarSiHayErrores();
    this.#meta = Number(meta);
    if (publico !== undefined) this.#publico = Boolean(publico);
  }

  toJSON() {
    return {
      id: this.id,
      clave: this.#clave,
      nombre: this.#nombre,
      dimension: this.#dimension,
      dimensionEtiqueta: DIMENSIONES[this.#dimension],
      formula: this.#formula,
      unidad: this.#unidad,
      meta: this.#meta,
      sentido: this.#sentido,
      publico: this.#publico,
      descripcion: this.#descripcion,
      categoriaId: this.#categoriaId,
    };
  }
}

Indicador.DIMENSIONES = DIMENSIONES;

module.exports = Indicador;
