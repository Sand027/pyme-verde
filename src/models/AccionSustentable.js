'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

const ESTADOS = Object.freeze({ pendiente: 'Pendiente', en_proceso: 'En proceso', completada: 'Completada' });

/**
 * Acción del plan de mejora. Controla sus propias transiciones de estado y la
 * coherencia entre estado y porcentaje de avance.
 */
class AccionSustentable extends Entidad {
  #pymeId;
  #indicadorId;
  #indicadorNombre;
  #responsableId;
  #responsableNombre;
  #creadoPor;
  #titulo;
  #descripcion;
  #meta;
  #fechaInicio;
  #fechaObjetivo;
  #estado;
  #avance;
  #evidencias;

  constructor({ id = null, pymeId, indicadorId = null, indicadorNombre = null, responsableId = null,
    responsableNombre = null, creadoPor = null, titulo, descripcion = '', meta, fechaInicio, fechaObjetivo,
    estado = 'pendiente', avance = 0, evidencias = [] }) {
    super(id);
    this.#pymeId = pymeId;
    this.#indicadorId = indicadorId;
    this.#indicadorNombre = indicadorNombre;
    this.#responsableId = responsableId;
    this.#responsableNombre = responsableNombre;
    this.#creadoPor = creadoPor;
    this.#titulo = titulo;
    this.#descripcion = descripcion || '';
    this.#meta = meta;
    this.#fechaInicio = fechaInicio;
    this.#fechaObjetivo = fechaObjetivo;
    this.#estado = estado;
    this.#avance = Number(avance);
    this.#evidencias = evidencias;
  }

  get pymeId() { return this.#pymeId; }
  get indicadorId() { return this.#indicadorId; }
  get responsableId() { return this.#responsableId; }
  get creadoPor() { return this.#creadoPor; }
  get titulo() { return this.#titulo; }
  get descripcion() { return this.#descripcion; }
  get meta() { return this.#meta; }
  get fechaInicio() { return this.#fechaInicio; }
  get fechaObjetivo() { return this.#fechaObjetivo; }
  get estado() { return this.#estado; }
  get avance() { return this.#avance; }
  get evidencias() { return [...this.#evidencias]; }

  esResponsable(usuario) {
    return this.#responsableId !== null && this.#responsableId === usuario.id;
  }

  estaVencida(hoy = new Date().toISOString().slice(0, 10)) {
    return this.#estado !== 'completada' && this.#fechaObjetivo < hoy;
  }

  /**
   * Cambia el estado manteniendo el avance coherente:
   * pendiente = 0 %, completada = 100 %, en proceso entre 1 y 99 %.
   */
  cambiarEstado(nuevo) {
    new Validador({ estado: nuevo }).requerido('estado', 'El estado')
      .enLista('estado', 'El estado', Object.keys(ESTADOS)).lanzarSiHayErrores();
    this.#estado = nuevo;
    if (nuevo === 'pendiente') this.#avance = 0;
    if (nuevo === 'completada') this.#avance = 100;
    if (nuevo === 'en_proceso' && (this.#avance === 0 || this.#avance === 100)) this.#avance = 10;
  }

  /** Ajusta el avance y deriva el estado a partir de él. */
  actualizarAvance(avance) {
    new Validador({ avance }).requerido('avance', 'El avance')
      .numero('avance', 'El avance', { min: 0, max: 100, entero: true }).lanzarSiHayErrores();
    this.#avance = Number(avance);
    if (this.#avance === 100) this.#estado = 'completada';
    else if (this.#avance === 0) this.#estado = 'pendiente';
    else this.#estado = 'en_proceso';
  }

  static validar(datos) {
    const v = new Validador(datos)
      .requerido('titulo', 'El título').texto('titulo', 'El título', { min: 5, max: 140 })
      .texto('descripcion', 'La descripción', { max: 1000 })
      .requerido('meta', 'La meta').texto('meta', 'La meta', { min: 5, max: 200 })
      .requerido('fechaInicio', 'La fecha de inicio').fecha('fechaInicio', 'La fecha de inicio')
      .requerido('fechaObjetivo', 'La fecha objetivo').fecha('fechaObjetivo', 'La fecha objetivo')
      .numero('indicadorId', 'El indicador', { min: 1, entero: true })
      .numero('responsableId', 'El responsable', { min: 1, entero: true });
    if (datos.fechaInicio && datos.fechaObjetivo && datos.fechaObjetivo < datos.fechaInicio) {
      v.agregar('fechaObjetivo', 'La fecha objetivo debe ser igual o posterior a la de inicio.');
    }
    v.lanzarSiHayErrores();
  }

  static crear(datos, { pymeId, creadoPor }) {
    AccionSustentable.validar(datos);
    return new AccionSustentable({
      pymeId,
      creadoPor,
      indicadorId: datos.indicadorId ? Number(datos.indicadorId) : null,
      responsableId: datos.responsableId ? Number(datos.responsableId) : null,
      titulo: datos.titulo.trim(),
      descripcion: (datos.descripcion || '').trim(),
      meta: datos.meta.trim(),
      fechaInicio: datos.fechaInicio,
      fechaObjetivo: datos.fechaObjetivo,
    });
  }

  actualizarDatos(datos) {
    const combinados = {
      titulo: this.#titulo, descripcion: this.#descripcion, meta: this.#meta,
      fechaInicio: this.#fechaInicio, fechaObjetivo: this.#fechaObjetivo,
      indicadorId: this.#indicadorId, responsableId: this.#responsableId,
      ...datos,
    };
    AccionSustentable.validar(combinados);
    this.#titulo = combinados.titulo.trim();
    this.#descripcion = (combinados.descripcion || '').trim();
    this.#meta = combinados.meta.trim();
    this.#fechaInicio = combinados.fechaInicio;
    this.#fechaObjetivo = combinados.fechaObjetivo;
    this.#indicadorId = combinados.indicadorId ? Number(combinados.indicadorId) : null;
    this.#responsableId = combinados.responsableId ? Number(combinados.responsableId) : null;
  }

  toJSON() {
    return {
      id: this.id,
      titulo: this.#titulo,
      descripcion: this.#descripcion,
      meta: this.#meta,
      fechaInicio: this.#fechaInicio,
      fechaObjetivo: this.#fechaObjetivo,
      estado: this.#estado,
      estadoEtiqueta: ESTADOS[this.#estado],
      avance: this.#avance,
      vencida: this.estaVencida(),
      indicadorId: this.#indicadorId,
      indicador: this.#indicadorNombre,
      responsableId: this.#responsableId,
      responsable: this.#responsableNombre,
      evidencias: this.#evidencias.map((e) => (typeof e.toJSON === 'function' ? e.toJSON() : e)),
    };
  }
}

AccionSustentable.ESTADOS = ESTADOS;

module.exports = AccionSustentable;
