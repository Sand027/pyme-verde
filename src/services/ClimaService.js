'use strict';

const { ServicioExternoError } = require('../utils/errores');

/**
 * Cliente del servicio web público Open-Meteo (https://open-meteo.com), que no
 * requiere clave. Consulta la radiación solar y la temperatura pronosticadas
 * para la ubicación del taller y las convierte en horas de sol pico, el dato
 * que usa la calculadora para estimar la generación de paneles solares.
 *
 * La respuesta se guarda en memoria una hora para no repetir consultas. Si el
 * servicio falla y hay una copia anterior, se devuelve marcada como
 * desactualizada; si no hay copia, se lanza ServicioExternoError (HTTP 502).
 */
class ClimaService {
  static URL = 'https://api.open-meteo.com/v1/forecast';
  /** Rendimiento global de un sistema fotovoltaico (pérdidas de inversor, cableado y temperatura). */
  static RENDIMIENTO = 0.8;

  #fetch;
  #ttl;
  #timeout;
  #lugar;
  #cache = null;

  /**
   * @param {object} [opciones]
   * @param {Function} [opciones.fetchFn] función fetch; por omisión la global de Node. Las pruebas pasan una falsa
   * @param {number} [opciones.ttlMs] vigencia de la copia en memoria
   * @param {number} [opciones.timeoutMs] tiempo máximo de espera del servicio
   * @param {{nombre:string, latitud:number, longitud:number}} [opciones.lugar]
   */
  constructor({ fetchFn = null, ttlMs = 60 * 60 * 1000, timeoutMs = 5000, lugar } = {}) {
    this.#fetch = fetchFn;
    this.#ttl = ttlMs;
    this.#timeout = timeoutMs;
    this.#lugar = lugar || { nombre: 'León, Guanajuato', latitud: 21.12, longitud: -101.68 };
  }

  urlConsulta() {
    const q = new URLSearchParams({
      latitude: String(this.#lugar.latitud),
      longitude: String(this.#lugar.longitud),
      current: 'temperature_2m',
      daily: 'shortwave_radiation_sum,temperature_2m_max,temperature_2m_min',
      timezone: 'America/Mexico_City',
      forecast_days: '7',
    });
    return `${ClimaService.URL}?${q}`;
  }

  /** Radiación solar de los próximos siete días y generación estimada por kWp instalado. */
  async recursoSolar() {
    const ahora = Date.now();
    if (this.#cache && ahora - this.#cache.guardado < this.#ttl) return this.#cache.datos;
    try {
      const datos = ClimaService.interpretar(await this.#consultar(), this.#lugar);
      this.#cache = { guardado: ahora, datos };
      return datos;
    } catch (e) {
      if (this.#cache) return { ...this.#cache.datos, desactualizado: true };
      throw new ServicioExternoError('Open-Meteo', e.message);
    }
  }

  async #consultar() {
    const res = await (this.#fetch || globalThis.fetch)(this.urlConsulta(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.#timeout),
    });
    if (!res.ok) throw new Error(`respondió HTTP ${res.status}`);
    return res.json();
  }

  /** Convierte la respuesta de Open-Meteo al formato de la aplicación. */
  static interpretar(r, lugar) {
    const d = r && r.daily;
    if (!d || !Array.isArray(d.time) || !Array.isArray(d.shortwave_radiation_sum) || d.time.length === 0) {
      throw new Error('la respuesta no trae datos diarios');
    }
    const redondear = (n, dec = 2) => (Number.isFinite(n) ? Number(n.toFixed(dec)) : null);
    // Open-Meteo entrega la radiación diaria en MJ/m²; 1 kWh = 3.6 MJ.
    const dias = d.time.map((fecha, i) => ({
      fecha,
      radiacionKwhM2: redondear(Number(d.shortwave_radiation_sum[i]) / 3.6),
      temperaturaMax: redondear(Number(d.temperature_2m_max?.[i]), 1),
      temperaturaMin: redondear(Number(d.temperature_2m_min?.[i]), 1),
    }));
    const validos = dias.filter((x) => x.radiacionKwhM2 !== null);
    if (validos.length === 0) throw new Error('la respuesta no trae radiación');
    // Horas de sol pico: kWh/m² al día bajo 1 kW/m² de irradiancia estándar.
    const horasSolPico = redondear(validos.reduce((s, x) => s + x.radiacionKwhM2, 0) / validos.length);
    return {
      fuente: 'Open-Meteo',
      lugar: lugar.nombre,
      consultado: new Date().toISOString(),
      temperaturaActual: redondear(Number(r.current?.temperature_2m), 1),
      horasSolPico,
      generacionMensualPorKwp: redondear(horasSolPico * 30 * ClimaService.RENDIMIENTO, 1),
      rendimientoSupuesto: ClimaService.RENDIMIENTO,
      dias,
    };
  }
}

module.exports = ClimaService;
