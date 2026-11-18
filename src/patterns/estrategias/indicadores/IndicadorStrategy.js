'use strict';

/**
 * Patrón Strategy (estrategia abstracta para indicadores).
 *
 * Problema que resuelve: cada indicador se calcula con una fórmula distinta
 * (porcentaje de aprovechamiento, intensidad por par, promedio mensual,
 * avance del plan...). El servicio de indicadores recorre la lista de
 * definiciones y delega el cálculo a la estrategia de cada clave, sin
 * condicionales por indicador. Agregar un indicador nuevo es agregar una
 * clase, sin tocar el servicio.
 *
 * Contexto que recibe calcular():
 *   registros:   Registro[] del periodo
 *   acciones:    AccionSustentable[] de la empresa
 *   parametros:  Map<clave, valor>
 *   pyme:        Pyme
 *   periodo:     { desde, hasta, meses: string[] }
 *   indicador:   Indicador (definición, incluye categoriaId)
 */
class IndicadorStrategy {
  constructor() {
    if (new.target === IndicadorStrategy) throw new TypeError('IndicadorStrategy es abstracta.');
  }

  /**
   * @returns {{ valor: number|null, numerador: number, denominador: number,
   *            explicacion: string }}
   */
  calcular() {
    throw new Error(`${this.constructor.name} debe implementar calcular().`);
  }

  // Utilidades compartidas por las estrategias concretas.

  static redondear(valor, decimales = 2) {
    if (valor === null || !Number.isFinite(valor)) return null;
    const f = 10 ** decimales;
    return Math.round(valor * f) / f;
  }

  static sumar(registros, campo = 'cantidad') {
    return registros.reduce((total, r) => total + (Number(r[campo]) || 0), 0);
  }

  static filtrar(registros, { tipo, categoriaId } = {}) {
    return registros.filter((r) => (!tipo || r.categoria.tipo === tipo) && (!categoriaId || r.categoria.id === categoriaId));
  }

  static dividir(numerador, denominador) {
    return denominador > 0 ? numerador / denominador : null;
  }
}

module.exports = IndicadorStrategy;
