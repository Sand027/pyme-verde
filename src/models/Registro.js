'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');
const { aUnidadBase, unidadesCompatibles } = require('../utils/unidades');
const DestinoStrategyFactory = require('../patterns/fabricas/DestinoStrategyFactory');

const ORIGENES = Object.freeze({
  medidor: 'Lectura de medidor',
  recibo: 'Recibo o factura',
  bascula: 'Pesaje en báscula',
  inventario: 'Conteo de inventario',
  estimacion: 'Estimación',
  demostracion: 'Dato de demostración',
});

/**
 * Registro abstracto de una medición. Cada tipo de categoría tiene su propia
 * subclase con reglas específicas (polimorfismo en validarEspecifico y
 * datosEspecificos). Las instancias se crean con RegistroFactory.
 */
class Registro extends Entidad {
  #pymeId;
  #categoria;
  #usuarioId;
  #autorNombre;
  #fecha;
  #cantidad;
  #costo;
  #origenDato;
  #notas;
  #creadoEn;

  constructor({ id = null, pymeId, categoria, usuarioId = null, autorNombre = null, fecha, cantidad,
    costo = null, origenDato, notas = '', creadoEn = null }) {
    super(id);
    if (new.target === Registro) throw new TypeError('Registro es abstracta; usa RegistroFactory.');
    this.#pymeId = pymeId;
    this.#categoria = categoria;
    this.#usuarioId = usuarioId;
    this.#autorNombre = autorNombre;
    this.#fecha = fecha;
    this.#cantidad = Number(cantidad);
    this.#costo = costo === null || costo === undefined || costo === '' ? null : Number(costo);
    this.#origenDato = origenDato;
    this.#notas = notas || '';
    this.#creadoEn = creadoEn;
  }

  get pymeId() { return this.#pymeId; }
  get categoria() { return this.#categoria; }
  get usuarioId() { return this.#usuarioId; }
  get autorNombre() { return this.#autorNombre; }
  get fecha() { return this.#fecha; }
  get cantidad() { return this.#cantidad; }
  get unidad() { return this.#categoria.unidad; }
  get costo() { return this.#costo; }
  get origenDato() { return this.#origenDato; }
  get origenEtiqueta() { return ORIGENES[this.#origenDato]; }
  get notas() { return this.#notas; }
  get mes() { return String(this.#fecha).slice(0, 7); }

  /** Tipo de categoría que atiende la subclase. */
  static get tipos() {
    return [];
  }

  perteneceA(usuario) {
    return this.#usuarioId !== null && this.#usuarioId === usuario.id;
  }

  costoUnitario() {
    return this.#costo !== null && this.#cantidad > 0 ? this.#costo / this.#cantidad : null;
  }

  cambiarOrigen(origen) {
    new Validador({ origenDato: origen })
      .requerido('origenDato', 'El origen del dato')
      .enLista('origenDato', 'El origen del dato', Object.keys(ORIGENES))
      .lanzarSiHayErrores();
    this.#origenDato = origen;
  }

  /** Reglas propias del tipo; las subclases las redefinen. */
  validarEspecifico() {
    return {};
  }

  /** Campos propios del tipo para la representación JSON. */
  datosEspecificos() {
    return {};
  }

  /**
   * Validación común a todos los registros. Devuelve los datos normalizados
   * (cantidad convertida a la unidad base de la categoría).
   */
  static validarBase(datos, categoria) {
    const v = new Validador(datos)
      .requerido('fecha', 'La fecha').fecha('fecha', 'La fecha', { noFutura: true })
      .requerido('cantidad', 'La cantidad').numero('cantidad', 'La cantidad', { min: 0, max: 1e9 })
      .numero('costo', 'El costo', { min: 0, max: 1e9 })
      .requerido('origenDato', 'El origen del dato').enLista('origenDato', 'El origen del dato', Object.keys(ORIGENES))
      .texto('notas', 'Las notas', { max: 500 });

    if (datos.fecha && String(datos.fecha) < '2015-01-01') {
      v.agregar('fecha', 'La fecha es demasiado antigua para este registro.');
    }

    let cantidad = datos.cantidad;
    const unidad = datos.unidad || categoria.unidad;
    if (!unidadesCompatibles(categoria.unidad).includes(unidad)) {
      v.agregar('unidad', `La unidad debe ser ${unidadesCompatibles(categoria.unidad).join(', ')}.`);
    } else if (v.valido) {
      cantidad = aUnidadBase(datos.cantidad, unidad, categoria.unidad);
    }
    return { validador: v, cantidad };
  }

  toJSON() {
    return {
      id: this.id,
      categoriaId: this.#categoria.id,
      categoria: this.#categoria.nombre,
      tipo: this.#categoria.tipo,
      fecha: this.#fecha,
      cantidad: this.#cantidad,
      unidad: this.unidad,
      costo: this.#costo,
      origenDato: this.#origenDato,
      origenEtiqueta: this.origenEtiqueta,
      notas: this.#notas,
      usuarioId: this.#usuarioId,
      autor: this.#autorNombre,
      creadoEn: this.#creadoEn,
      ...this.datosEspecificos(),
    };
  }
}

Registro.ORIGENES = ORIGENES;

/** Consumo de recursos (agua, electricidad) y materia prima comprada. */
class RegistroConsumo extends Registro {
  static get tipos() {
    return ['consumo', 'materia'];
  }
}

/** Unidades producidas: base para los indicadores de intensidad por par. */
class RegistroProduccion extends Registro {
  static get tipos() {
    return ['produccion'];
  }

  validarEspecifico() {
    return Number.isInteger(this.cantidad) ? {} : { cantidad: 'La producción se registra en unidades enteras.' };
  }
}

/** Actividades sociales: horas de capacitación, jornadas de seguridad. */
class RegistroSocial extends Registro {
  static get tipos() {
    return ['social'];
  }

  validarEspecifico() {
    return this.cantidad > 2000 ? { cantidad: 'Revisa la cantidad: supera las horas posibles en un periodo.' } : {};
  }
}

/**
 * Residuo generado. Además de la cantidad guarda cuánto se aprovechó, el
 * destino y la evidencia; las reglas dependen de la clasificación y se
 * delegan a la estrategia de destino correspondiente.
 */
class RegistroResiduo extends Registro {
  #cantidadAprovechada;
  #destino;
  #evidenciaDestino;

  constructor(datos) {
    super(datos);
    this.#cantidadAprovechada = Number(datos.cantidadAprovechada) || 0;
    this.#destino = datos.destino || null;
    this.#evidenciaDestino = datos.evidenciaDestino ? String(datos.evidenciaDestino).trim() : null;
  }

  static get tipos() {
    return ['residuo'];
  }

  get cantidadAprovechada() { return this.#cantidadAprovechada; }
  get destino() { return this.#destino; }
  get evidenciaDestino() { return this.#evidenciaDestino; }

  cantidadNoAprovechada() {
    return Math.max(0, this.cantidad - this.#cantidadAprovechada);
  }

  porcentajeAprovechado() {
    return this.cantidad > 0 ? (this.#cantidadAprovechada / this.cantidad) * 100 : 0;
  }

  estrategiaDestino() {
    return DestinoStrategyFactory.para(this.categoria.clasificacion);
  }

  validarEspecifico() {
    return this.estrategiaDestino().validar({
      cantidad: this.cantidad,
      cantidadAprovechada: this.#cantidadAprovechada,
      destino: this.#destino,
      evidenciaDestino: this.#evidenciaDestino,
    });
  }

  datosEspecificos() {
    return {
      clasificacion: this.categoria.clasificacion,
      cantidadAprovechada: this.#cantidadAprovechada,
      porcentajeAprovechado: Math.round(this.porcentajeAprovechado() * 10) / 10,
      destino: this.#destino,
      evidenciaDestino: this.#evidenciaDestino,
    };
  }
}

module.exports = { Registro, RegistroConsumo, RegistroProduccion, RegistroSocial, RegistroResiduo, ORIGENES };
