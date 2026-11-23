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

describe('Cliente de servicios web públicos: Open-Meteo y NASA POWER', () => {
  const ClimaService = require('../src/services/ClimaService');
  const { ServicioExternoError } = require('../src/utils/errores');
  // Respuesta con la forma real de https://api.open-meteo.com/v1/forecast (radiación en MJ/m²).
  const respuesta = {
    current: { temperature_2m: 22.4 },
    daily: {
      time: ['2026-11-23', '2026-11-24'],
      shortwave_radiation_sum: [18, 21.6],
      temperature_2m_max: [25.1, 26.0],
      temperature_2m_min: [9.2, 10.4],
    },
  };
  const fetchFalso = (cuerpo, { ok = true, status = 200 } = {}) => {
    const llamadas = [];
    const fn = async (url) => { llamadas.push(url); return { ok, status, json: async () => cuerpo }; };
    fn.llamadas = llamadas;
    return fn;
  };

  it('W01 arma la consulta con la ubicación del taller y convierte MJ/m² a horas de sol pico', async () => {
    const f = fetchFalso(respuesta);
    const r = await new ClimaService({ fetchFn: f }).recursoSolar();
    assert.match(f.llamadas[0], /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=21\.12&longitude=-101\.68/);
    assert.equal(r.fuente, 'Open-Meteo');
    assert.deepEqual(r.dias.map((d) => d.radiacionKwhM2), [5, 6]);
    assert.equal(r.horasSolPico, 5.5);
    assert.equal(r.generacionMensualPorKwp, 132); // 5.5 h × 30 días × 0.8
    assert.equal(r.temperaturaActual, 22.4);
  });

  it('W02 guarda la respuesta en memoria y no repite la consulta', async () => {
    const f = fetchFalso(respuesta);
    const s = new ClimaService({ fetchFn: f });
    await s.recursoSolar();
    await s.recursoSolar();
    assert.equal(f.llamadas.length, 1);
  });

  it('W03 si Open-Meteo y NASA POWER fallan sin copia previa lanza ServicioExternoError (502)', async () => {
    const s = new ClimaService({ fetchFn: fetchFalso(null, { ok: false, status: 503 }), registro: () => {} });
    await assert.rejects(() => s.recursoSolar(), (e) => e instanceof ServicioExternoError && e.status === 502);
  });

  it('W04 si los servicios fallan con copia vencida devuelve la copia marcada como desactualizada', async () => {
    let falla = false;
    const f = async () => (falla ? { ok: false, status: 500, json: async () => null } : { ok: true, status: 200, json: async () => respuesta });
    const s = new ClimaService({ fetchFn: f, ttlMs: 0, registro: () => {} });
    await s.recursoSolar();
    falla = true;
    const r = await s.recursoSolar();
    assert.equal(r.desactualizado, true);
    assert.equal(r.horasSolPico, 5.5);
  });

  it('W05 rechaza una respuesta sin datos diarios', () => {
    assert.throws(() => ClimaService.interpretar({ daily: {} }, { nombre: 'x' }));
    assert.throws(() => ClimaService.interpretarNasa({ properties: {} }, { nombre: 'x' }));
  });

  it('W07 si Open-Meteo falla usa NASA POWER y descarta los días sin dato (-999)', async () => {
    const nasa = { properties: { parameter: {
      ALLSKY_SFC_SW_DWN: { 20261110: 4, 20261111: 6, 20261112: -999 },
      T2M_MAX: { 20261110: 25, 20261111: 26, 20261112: -999 },
      T2M_MIN: { 20261110: 9, 20261111: 10, 20261112: -999 },
    } } };
    const llamadas = [];
    const f = async (url) => {
      llamadas.push(url);
      return url.includes('open-meteo') ? { ok: false, status: 429, json: async () => null } : { ok: true, status: 200, json: async () => nasa };
    };
    const r = await new ClimaService({ fetchFn: f, registro: () => {} }).recursoSolar();
    assert.ok(llamadas[1].startsWith('https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN'));
    assert.equal(r.fuente, 'NASA POWER');
    assert.equal(r.tipo, 'medicion');
    assert.deepEqual(r.dias.map((d) => d.fecha), ['2026-11-10', '2026-11-11']);
    assert.equal(r.horasSolPico, 5);
    assert.match(r.nota, /Open-Meteo no respondió/);
  });
});
