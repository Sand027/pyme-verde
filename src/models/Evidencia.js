'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

/** Prueba documental del avance de una acción (nota, folio o enlace). */
class Evidencia extends Entidad {
  #accionId;
  #usuarioId;
  #autorNombre;
  #fecha;
  #descripcion;
  #enlace;

  constructor({ id = null, accionId, usuarioId = null, autorNombre = null, fecha, descripcion, enlace = null }) {
    super(id);
    this.#accionId = accionId;
    this.#usuarioId = usuarioId;
    this.#autorNombre = autorNombre;
    this.#fecha = fecha;
    this.#descripcion = descripcion;
    this.#enlace = enlace || null;
  }

  get accionId() { return this.#accionId; }
  get usuarioId() { return this.#usuarioId; }
  get fecha() { return this.#fecha; }
  get descripcion() { return this.#descripcion; }
  get enlace() { return this.#enlace; }

  static crear(datos, { accionId, usuarioId }) {
    new Validador(datos)
      .requerido('fecha', 'La fecha').fecha('fecha', 'La fecha', { noFutura: true })
      .requerido('descripcion', 'La descripción').texto('descripcion', 'La descripción', { min: 10, max: 600 })
      .texto('enlace', 'El enlace', { max: 300 }).url('enlace', 'El enlace')
      .lanzarSiHayErrores();
    return new Evidencia({
      accionId,
      usuarioId,
      fecha: datos.fecha,
      descripcion: datos.descripcion.trim(),
      enlace: datos.enlace ? datos.enlace.trim() : null,
    });
  }

  toJSON() {
    return {
      id: this.id,
      accionId: this.#accionId,
      fecha: this.#fecha,
      descripcion: this.#descripcion,
      enlace: this.#enlace,
      autor: this.#autorNombre,
    };
  }
}

module.exports = Evidencia;
