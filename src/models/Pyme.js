'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

/** La empresa que usa la plataforma. */
class Pyme extends Entidad {
  #nombre;
  #giro;
  #ubicacionGeneral;
  #descripcion;
  #problematica;
  #objetivo;
  #numColaboradores;

  constructor({ id = null, nombre, giro, ubicacionGeneral, descripcion = '', problematica = '', objetivo = '',
    numColaboradores = 1 }) {
    super(id);
    this.#nombre = nombre;
    this.#giro = giro;
    this.#ubicacionGeneral = ubicacionGeneral;
    this.#descripcion = descripcion;
    this.#problematica = problematica;
    this.#objetivo = objetivo;
    this.#numColaboradores = Number(numColaboradores);
  }

  get nombre() { return this.#nombre; }
  get giro() { return this.#giro; }
  get ubicacionGeneral() { return this.#ubicacionGeneral; }
  get descripcion() { return this.#descripcion; }
  get problematica() { return this.#problematica; }
  get objetivo() { return this.#objetivo; }
  get numColaboradores() { return this.#numColaboradores; }

  actualizar(datos) {
    new Validador(datos)
      .requerido('nombre', 'El nombre').texto('nombre', 'El nombre', { min: 3, max: 120 })
      .requerido('giro', 'El giro').texto('giro', 'El giro', { min: 3, max: 120 })
      .requerido('ubicacionGeneral', 'La ubicación').texto('ubicacionGeneral', 'La ubicación', { min: 3, max: 160 })
      .texto('descripcion', 'La descripción', { max: 2000 })
      .texto('problematica', 'La problemática', { max: 2000 })
      .texto('objetivo', 'El objetivo', { max: 1000 })
      .requerido('numColaboradores', 'El número de colaboradores')
      .numero('numColaboradores', 'El número de colaboradores', { min: 1, max: 250, entero: true })
      .lanzarSiHayErrores();
    this.#nombre = datos.nombre.trim();
    this.#giro = datos.giro.trim();
    this.#ubicacionGeneral = datos.ubicacionGeneral.trim();
    this.#descripcion = (datos.descripcion || '').trim();
    this.#problematica = (datos.problematica || '').trim();
    this.#objetivo = (datos.objetivo || '').trim();
    this.#numColaboradores = Number(datos.numColaboradores);
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.#nombre,
      giro: this.#giro,
      ubicacionGeneral: this.#ubicacionGeneral,
      descripcion: this.#descripcion,
      problematica: this.#problematica,
      objetivo: this.#objetivo,
      numColaboradores: this.#numColaboradores,
    };
  }
}

module.exports = Pyme;
