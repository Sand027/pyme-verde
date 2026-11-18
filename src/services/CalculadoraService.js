'use strict';

const Validador = require('../utils/Validador');
const { ProhibidoError } = require('../utils/errores');
const { PERMISOS } = require('../models/Rol');

/**
 * Conceptos que la calculadora sabe evaluar: unidad que se captura y
 * parámetro (supuesto) que convierte cantidad en dinero.
 */
const CONCEPTOS = Object.freeze({
  electricidad: { nombre: 'Electricidad', unidad: 'kWh', parametroPrecio: 'tarifa_electrica', emisiones: true },
  agua: { nombre: 'Agua', unidad: 'm3', parametroPrecio: 'tarifa_agua' },
  piel: { nombre: 'Piel desperdiciada en el corte', unidad: 'kg', parametroPrecio: 'precio_piel_kg' },
  manejo_especial: { nombre: 'Residuo de manejo especial', unidad: 'kg', parametroPrecio: 'costo_gestor_kg' },
});

/** Compara el escenario actual con uno propuesto y estima ahorro y retorno. */
class CalculadoraService {
  #parametros;

  constructor({ parametroRepository }) {
    this.#parametros = parametroRepository;
  }

  async supuestos(usuario) {
    if (!usuario.puede(PERMISOS.PANEL_VER)) throw new ProhibidoError();
    const lista = await this.#parametros.listar(usuario.pymeId);
    return { conceptos: CONCEPTOS, parametros: lista.map((p) => p.toJSON()) };
  }

  /**
   * Cálculo puro (sin acceso a datos) para poder probarlo y reutilizarlo.
   * @param {{concepto:string, cantidadActual:number, reduccion:number, inversion:number}} e
   * @param {Map<string, import('../models/Parametro')>} parametros por clave
   */
  static calcular(e, parametros) {
    new Validador(e)
      .requerido('concepto', 'El concepto').enLista('concepto', 'El concepto', Object.keys(CONCEPTOS))
      .requerido('cantidadActual', 'La cantidad actual').numero('cantidadActual', 'La cantidad actual', { min: 0.001, max: 1e8 })
      .requerido('reduccion', 'La reducción').numero('reduccion', 'La reducción', { min: 0, max: 100 })
      .numero('inversion', 'La inversión', { min: 0, max: 1e9 })
      .lanzarSiHayErrores('Revisa los datos del escenario.');

    const concepto = CONCEPTOS[e.concepto];
    const precio = parametros.get(concepto.parametroPrecio);
    if (!precio) throw new Error(`Falta el parámetro ${concepto.parametroPrecio}.`);

    const actual = Number(e.cantidadActual);
    const reduccion = Number(e.reduccion) / 100;
    const inversion = Number(e.inversion) || 0;
    const propuesta = actual * (1 - reduccion);
    const ahorroCantidad = actual - propuesta;
    const ahorroMensual = ahorroCantidad * precio.valor;
    const r2 = (n) => Math.round(n * 100) / 100;

    const supuestos = [precio.toJSON()];
    let emisionesEvitadasKg = null;
    if (concepto.emisiones && parametros.get('factor_emision')) {
      const factor = parametros.get('factor_emision');
      emisionesEvitadasKg = r2(ahorroCantidad * factor.valor);
      supuestos.push(factor.toJSON());
    }

    return {
      concepto: e.concepto,
      conceptoNombre: concepto.nombre,
      unidad: concepto.unidad,
      actual: { cantidad: r2(actual), costo: r2(actual * precio.valor) },
      propuesto: { cantidad: r2(propuesta), costo: r2(propuesta * precio.valor) },
      ahorro: {
        cantidadMensual: r2(ahorroCantidad),
        mensual: r2(ahorroMensual),
        anual: r2(ahorroMensual * 12),
        retornoMeses: inversion > 0 && ahorroMensual > 0 ? Math.round((inversion / ahorroMensual) * 10) / 10 : null,
      },
      inversion: r2(inversion),
      emisionesEvitadasKgMes: emisionesEvitadasKg,
      supuestos,
    };
  }

  async evaluar(usuario, escenario) {
    if (!usuario.puede(PERMISOS.PANEL_VER)) throw new ProhibidoError();
    const lista = await this.#parametros.listar(usuario.pymeId);
    return CalculadoraService.calcular(escenario, new Map(lista.map((p) => [p.clave, p])));
  }
}

CalculadoraService.CONCEPTOS = CONCEPTOS;

module.exports = CalculadoraService;
