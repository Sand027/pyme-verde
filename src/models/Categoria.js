'use strict';

const Entidad = require('./Entidad');
const Validador = require('../utils/Validador');

const TIPOS = Object.freeze({
  consumo: 'Consumo de recursos',
  materia: 'Materia prima',
  residuo: 'Residuo',
  produccion: 'Producción',
  social: 'Social',
});

const CLASIFICACIONES = Object.freeze({
  reutilizable: 'Reutilizable',
  reciclable: 'Reciclable',
  peligroso: 'Manejo especial',
  no_aprovechable: 'No aprovechable',
});

/** Concepto que se mide: electricidad, recorte de piel, pares producidos... */
class Categoria extends Entidad {
  #pymeId;
  #nombre;
  #tipo;
  #unidad;
  #clasificacion;
  #descripcion;
  #activa;

  constructor({ id = null, pymeId, nombre, tipo, unidad, clasificacion = null, descripcion = '', activa = true }) {
    super(id);
    this.#pymeId = pymeId;
    this.#nombre = nombre;
    this.#tipo = tipo;
    this.#unidad = unidad;
    this.#clasificacion = tipo === 'residuo' ? clasificacion : null;
    this.#descripcion = descripcion || '';
    this.#activa = Boolean(activa);
  }

  get pymeId() { return this.#pymeId; }
  get nombre() { return this.#nombre; }
  get tipo() { return this.#tipo; }
  get tipoEtiqueta() { return TIPOS[this.#tipo]; }
  get unidad() { return this.#unidad; }
  get clasificacion() { return this.#clasificacion; }
  get clasificacionEtiqueta() { return this.#clasificacion ? CLASIFICACIONES[this.#clasificacion] : null; }
  get descripcion() { return this.#descripcion; }
  get activa() { return this.#activa; }

  esResiduo() {
    return this.#tipo === 'residuo';
  }

  /** Tipo, unidad y clasificación no cambian: alterarían registros históricos. */
  actualizar({ nombre, descripcion, activa }) {
    new Validador({ nombre }).requerido('nombre', 'El nombre').texto('nombre', 'El nombre', { min: 3, max: 80 })
      .lanzarSiHayErrores();
    this.#nombre = String(nombre).trim();
    if (descripcion !== undefined) this.#descripcion = String(descripcion).trim();
    if (activa !== undefined) this.#activa = Boolean(activa);
  }

  static validar(datos) {
    new Validador(datos)
      .requerido('nombre', 'El nombre').texto('nombre', 'El nombre', { min: 3, max: 80 })
      .requerido('tipo', 'El tipo').enLista('tipo', 'El tipo', Object.keys(TIPOS))
      .requerido('unidad', 'La unidad').texto('unidad', 'La unidad', { max: 20 })
      .regla('clasificacion', datos.tipo !== 'residuo' || Object.keys(CLASIFICACIONES).includes(datos.clasificacion),
        'Un residuo debe clasificarse: reutilizable, reciclable, manejo especial o no aprovechable.')
      .lanzarSiHayErrores();
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.#nombre,
      tipo: this.#tipo,
      tipoEtiqueta: this.tipoEtiqueta,
      unidad: this.#unidad,
      clasificacion: this.#clasificacion,
      clasificacionEtiqueta: this.clasificacionEtiqueta,
      descripcion: this.#descripcion,
      activa: this.#activa,
    };
  }
}

Categoria.TIPOS = TIPOS;
Categoria.CLASIFICACIONES = CLASIFICACIONES;

module.exports = Categoria;
