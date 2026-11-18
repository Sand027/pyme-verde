'use strict';

const E = require('../estrategias/indicadores/estrategias');

/**
 * Patrón Factory: relaciona la clave de cada indicador con la estrategia que
 * lo calcula. Las claves disponibles se ofrecen al administrador al crear
 * indicadores.
 */
class IndicadorStrategyFactory {
  static #registro = new Map([
    ['TASA_APROVECHAMIENTO', { estrategia: new E.TasaAprovechamientoStrategy(), descripcion: 'Porcentaje de residuo aprovechado' }],
    ['RESIDUO_POR_PAR', { estrategia: new E.IntensidadPorParStrategy(), descripcion: 'Residuo generado por par producido' }],
    ['ENERGIA_POR_PAR', { estrategia: new E.IntensidadPorParStrategy(), descripcion: 'Consumo de una categoría por par producido' }],
    ['AGUA_MENSUAL', { estrategia: new E.PromedioMensualStrategy(), descripcion: 'Promedio mensual de una categoría' }],
    ['COSTO_DESPERDICIO', { estrategia: new E.CostoDesperdicioStrategy(), descripcion: 'Costo mensual del material no aprovechado' }],
    ['AVANCE_PLAN', { estrategia: new E.AvancePlanStrategy(), descripcion: 'Avance promedio del plan de acciones' }],
    ['CAPACITACION_COLABORADOR', { estrategia: new E.CapacitacionPorColaboradorStrategy(), descripcion: 'Horas de capacitación por colaborador al mes' }],
  ]);

  static para(clave) {
    const entrada = IndicadorStrategyFactory.#registro.get(clave);
    if (!entrada) throw new Error(`No existe estrategia para el indicador "${clave}".`);
    return entrada.estrategia;
  }

  static existe(clave) {
    return IndicadorStrategyFactory.#registro.has(clave);
  }

  static disponibles() {
    return [...IndicadorStrategyFactory.#registro.entries()].map(([clave, { descripcion }]) => ({ clave, descripcion }));
  }
}

module.exports = IndicadorStrategyFactory;
