'use strict';

const {
  ReutilizableStrategy, ReciclableStrategy, ManejoEspecialStrategy, NoAprovechableStrategy,
} = require('../estrategias/destinos/estrategias');

/**
 * Patrón Factory: entrega la estrategia de destino que corresponde a la
 * clasificación de un residuo. Las estrategias no guardan estado, así que se
 * crean una vez y se reutilizan.
 */
class DestinoStrategyFactory {
  static #registro = new Map([
    ['reutilizable', new ReutilizableStrategy()],
    ['reciclable', new ReciclableStrategy()],
    ['peligroso', new ManejoEspecialStrategy()],
    ['no_aprovechable', new NoAprovechableStrategy()],
  ]);

  static para(clasificacion) {
    const estrategia = DestinoStrategyFactory.#registro.get(clasificacion);
    if (!estrategia) throw new Error(`No hay estrategia de destino para "${clasificacion}".`);
    return estrategia;
  }

  static todas() {
    return [...DestinoStrategyFactory.#registro.values()];
  }
}

module.exports = DestinoStrategyFactory;
