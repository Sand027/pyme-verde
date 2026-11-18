'use strict';

/**
 * Pruebas unitarias del modelo y los patrones, sin base de datos:
 * Strategy (indicadores y destinos), Factory, Observer y el cálculo puro
 * de la calculadora.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const IndicadorStrategy = require('../src/patterns/estrategias/indicadores/IndicadorStrategy');
const IndicadorStrategyFactory = require('../src/patterns/fabricas/IndicadorStrategyFactory');
const DestinoStrategyFactory = require('../src/patterns/fabricas/DestinoStrategyFactory');
const { EventBus } = require('../src/patterns/eventos/EventBus');
const CalculadoraService = require('../src/services/CalculadoraService');
const Parametro = require('../src/models/Parametro');
const { ValidacionError } = require('../src/utils/errores');

const residuo = (id, cantidad, cantidadAprovechada) => ({ categoria: { id, tipo: 'residuo' }, cantidad, cantidadAprovechada });

describe('Strategy + Factory: indicadores', () => {
  it('U01 la estrategia abstracta no se puede instanciar', () => {
    assert.throws(() => new IndicadorStrategy(), TypeError);
  });

  it('U02 la fábrica entrega la estrategia de cada clave y rechaza claves desconocidas', () => {
    assert.ok(IndicadorStrategyFactory.para('TASA_APROVECHAMIENTO') instanceof IndicadorStrategy);
    assert.ok(IndicadorStrategyFactory.disponibles().length >= 7);
    assert.throws(() => IndicadorStrategyFactory.para('NO_EXISTE'));
  });

  it('U03 tasa de aprovechamiento = aprovechado / generado × 100', () => {
    const r = IndicadorStrategyFactory.para('TASA_APROVECHAMIENTO').calcular({
      registros: [residuo(5, 10, 6), residuo(6, 30, 10)],
      indicador: { categoriaId: null },
    });
    assert.equal(r.valor, 40);
    assert.equal(r.numerador, 16);
    assert.equal(r.denominador, 40);
  });

  it('U04 sin datos el indicador vale null, no cero', () => {
    const r = IndicadorStrategyFactory.para('TASA_APROVECHAMIENTO').calcular({ registros: [], indicador: { categoriaId: null } });
    assert.equal(r.valor, null);
  });
});

describe('Strategy + Factory: destino de residuos', () => {
  it('U05 un residuo de manejo especial no puede ir al relleno sanitario', () => {
    const e = DestinoStrategyFactory.para('peligroso');
    const errores = e.validar({ cantidad: 5, cantidadAprovechada: 0, destino: 'relleno_sanitario', evidenciaDestino: '' });
    assert.ok(errores.destino);
  });

  it('U06 un recorte reutilizable acepta reutilización y no permite aprovechar más de lo generado', () => {
    const e = DestinoStrategyFactory.para('reutilizable');
    assert.deepEqual(e.validar({ cantidad: 10, cantidadAprovechada: 6, destino: 'reutilizacion' }), {});
    assert.ok(e.validar({ cantidad: 10, cantidadAprovechada: 12, destino: 'reutilizacion' }).cantidadAprovechada);
  });

  it('U07 hay una estrategia por clasificación', () => {
    assert.equal(DestinoStrategyFactory.todas().length, 4);
    assert.throws(() => DestinoStrategyFactory.para('radiactivo'));
  });
});

describe('Observer: bus de eventos', () => {
  it('U08 notifica a los suscriptores del evento y a los comodín', async () => {
    const bus = new EventBus();
    const vistos = [];
    bus.suscribir('registro.creado', (ev, d) => vistos.push(`a:${ev}:${d.id}`));
    bus.suscribir('*', (ev) => vistos.push(`*:${ev}`));
    await bus.publicar('registro.creado', { id: 7 });
    assert.deepEqual(vistos.sort(), ['*:registro.creado', 'a:registro.creado:7']);
  });

  it('U09 un observador que falla no detiene a los demás', async () => {
    const bus = new EventBus();
    let llegó = false;
    const error = console.error;
    console.error = () => {};
    bus.suscribir('x', () => { throw new Error('falla'); });
    bus.suscribir('x', () => { llegó = true; });
    await bus.publicar('x', {});
    console.error = error;
    assert.ok(llegó);
  });

  it('U10 suscribir devuelve la función para cancelar', async () => {
    const bus = new EventBus();
    let n = 0;
    const cancelar = bus.suscribir('y', () => { n += 1; });
    await bus.publicar('y', {});
    cancelar();
    await bus.publicar('y', {});
    assert.equal(n, 1);
  });
});

describe('Calculadora (cálculo puro)', () => {
  const parametros = new Map([
    ['tarifa_electrica', new Parametro({ pymeId: 1, clave: 'tarifa_electrica', nombre: 'Precio de la electricidad', valor: 4, unidad: 'MXN/kWh' })],
    ['factor_emision', new Parametro({ pymeId: 1, clave: 'factor_emision', nombre: 'Factor de emisión', valor: 0.5, unidad: 'kgCO2e/kWh' })],
  ]);

  it('U11 ahorro, retorno de inversión y emisiones evitadas', () => {
    const r = CalculadoraService.calcular({ concepto: 'electricidad', cantidadActual: 1000, reduccion: 10, inversion: 2400 }, parametros);
    assert.equal(r.ahorro.cantidadMensual, 100);
    assert.equal(r.ahorro.mensual, 400);
    assert.equal(r.ahorro.anual, 4800);
    assert.equal(r.ahorro.retornoMeses, 6);
    assert.equal(r.emisionesEvitadasKgMes, 50);
    assert.equal(r.supuestos.length, 2);
  });

  it('U12 valida el escenario antes de calcular', () => {
    assert.throws(
      () => CalculadoraService.calcular({ concepto: 'electricidad', cantidadActual: -1, reduccion: 120 }, parametros),
      (err) => err instanceof ValidacionError && Boolean(err.errores.cantidadActual && err.errores.reduccion),
    );
  });
});
