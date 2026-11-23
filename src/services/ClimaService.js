'use strict';

const { ServicioExternoError } = require('../utils/errores');

const redondear = (n, dec = 2) => (Number.isFinite(n) ? Number(n.toFixed(dec)) : null);

/**
 * Cliente de servicios web públicos de clima, sin clave de acceso:
 *
 *   1. Open-Meteo (https://open-meteo.com): pronóstico de radiación solar y
 *      temperatura de los próximos siete días.
 *   2. NASA POWER (https://power.larc.nasa.gov), de respaldo: radiación y
 *      temperatura medidas de los últimos días disponibles.
 *
 * Con la radiación diaria calcula las horas de sol pico, el dato que usa la
 * calculadora para estimar la generación de paneles solares.
 *
 * La respuesta se guarda en memoria una hora. Si los dos servicios fallan y hay
 * una copia anterior, se devuelve marcada como desactualizada; si no hay copia,
 * se lanza ServicioExternoError (HTTP 502). La causa de cada falla se anota en
 * el registro del servidor.
 */
class ClimaService {
  static URL = 'https://api.open-meteo.com/v1/forecast';
  static URL_NASA = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  /** Rendimiento global de un sistema fotovoltaico (pérdidas de inversor, cableado y temperatura). */
  static RENDIMIENTO = 0.8;

  #fetch;
  #ttl;
  #timeout;
  #lugar;
  #registro;
  #cache = null;

  /**
   * @param {object} [opciones]
   * @param {Function} [opciones.fetchFn] función fetch; por omisión la global de Node. Las pruebas pasan una falsa
   * @param {number} [opciones.ttlMs] vigencia de la copia en memoria
   * @param {number} [opciones.timeoutMs] tiempo máximo de espera de cada servicio
   * @param {{nombre:string, latitud:number, longitud:number}} [opciones.lugar]
   * @param {Function} [opciones.registro] dónde anotar las fallas (por omisión console.warn)
   */
  constructor({ fetchFn = null, ttlMs = 60 * 60 * 1000, timeoutMs = 8000, lugar, registro } = {}) {
    this.#fetch = fetchFn;
    this.#ttl = ttlMs;
    this.#timeout = timeoutMs;
    this.#lugar = lugar || { nombre: 'León, Guanajuato', latitud: 21.12, longitud: -101.68 };
    this.#registro = registro || ((m) => console.warn(m));
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

  /** NASA POWER publica los datos diarios con unos días de retraso: se piden los últimos 20 días. */
  urlNasa(hoy = new Date()) {
    const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const q = new URLSearchParams({
      parameters: 'ALLSKY_SFC_SW_DWN,T2M_MAX,T2M_MIN',
      community: 'RE',
      longitude: String(this.#lugar.longitud),
      latitude: String(this.#lugar.latitud),
      start: f(new Date(hoy.getTime() - 20 * 864e5)),
      end: f(hoy),
      format: 'JSON',
    });
    return `${ClimaService.URL_NASA}?${q}`;
  }

  /** Radiación solar de siete días y generación estimada por kWp instalado. */
  async recursoSolar() {
    const ahora = Date.now();
    if (this.#cache && ahora - this.#cache.guardado < this.#ttl) return this.#cache.datos;
    const fallas = [];
    const proveedores = [
      ['Open-Meteo', () => this.#pedir(this.urlConsulta()).then((r) => ClimaService.interpretar(r, this.#lugar))],
      ['NASA POWER', () => this.#pedir(this.urlNasa()).then((r) => ClimaService.interpretarNasa(r, this.#lugar))],
    ];
    for (const [nombre, consultar] of proveedores) {
      try {
        const datos = await consultar();
        if (fallas.length) datos.nota = `${fallas.map((f) => f.split(':')[0]).join(', ')} no respondió; se usan datos de ${nombre}.`;
        this.#cache = { guardado: ahora, datos };
        return datos;
      } catch (e) {
        fallas.push(`${nombre}: ${e.message}`);
        this.#registro(`[clima] ${nombre} falló: ${e.message}`);
      }
    }
    if (this.#cache) return { ...this.#cache.datos, desactualizado: true };
    throw new ServicioExternoError('de clima (Open-Meteo y NASA POWER)', fallas.join('; '));
  }

  async #pedir(url) {
    const res = await (this.#fetch || globalThis.fetch)(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PyME-Verde/1.0 (proyecto escolar)' },
      signal: AbortSignal.timeout(this.#timeout),
    });
    if (!res.ok) throw new Error(`respondió HTTP ${res.status}`);
    return res.json();
  }

  static #resultado(fuente, tipo, lugar, dias, temperaturaActual) {
    const validos = dias.filter((x) => x.radiacionKwhM2 !== null);
    if (validos.length === 0) throw new Error('la respuesta no trae radiación');
    // Horas de sol pico: kWh/m² al día bajo 1 kW/m² de irradiancia estándar.
    const horasSolPico = redondear(validos.reduce((s, x) => s + x.radiacionKwhM2, 0) / validos.length);
    return {
      fuente,
      tipo,
      lugar: lugar.nombre,
      consultado: new Date().toISOString(),
      temperaturaActual,
      horasSolPico,
      generacionMensualPorKwp: redondear(horasSolPico * 30 * ClimaService.RENDIMIENTO, 1),
      rendimientoSupuesto: ClimaService.RENDIMIENTO,
      dias,
    };
  }

  /** Convierte la respuesta de Open-Meteo al formato de la aplicación. */
  static interpretar(r, lugar) {
    const d = r && r.daily;
    if (!d || !Array.isArray(d.time) || !Array.isArray(d.shortwave_radiation_sum) || d.time.length === 0) {
      throw new Error('la respuesta no trae datos diarios');
    }
    // Open-Meteo entrega la radiación diaria en MJ/m²; 1 kWh = 3.6 MJ.
    const dias = d.time.map((fecha, i) => ({
      fecha,
      radiacionKwhM2: redondear(Number(d.shortwave_radiation_sum[i]) / 3.6),
      temperaturaMax: redondear(Number(d.temperature_2m_max?.[i]), 1),
      temperaturaMin: redondear(Number(d.temperature_2m_min?.[i]), 1),
    }));
    return ClimaService.#resultado('Open-Meteo', 'pronostico', lugar, dias, redondear(Number(r.current?.temperature_2m), 1));
  }

  /** Convierte la respuesta de NASA POWER: ya viene en kWh/m² al día; -999 marca días sin dato. */
  static interpretarNasa(r, lugar) {
    const p = r && r.properties && r.properties.parameter;
    const rad = p && p.ALLSKY_SFC_SW_DWN;
    if (!rad || typeof rad !== 'object') throw new Error('la respuesta no trae radiación diaria');
    const valor = (n) => (Number.isFinite(Number(n)) && Number(n) > -900 ? Number(n) : NaN);
    const dias = Object.keys(rad).sort()
      .filter((k) => Number.isFinite(valor(rad[k])))
      .slice(-7)
      .map((k) => ({
        fecha: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`,
        radiacionKwhM2: redondear(valor(rad[k])),
        temperaturaMax: redondear(valor(p.T2M_MAX?.[k]), 1),
        temperaturaMin: redondear(valor(p.T2M_MIN?.[k]), 1),
      }));
    return ClimaService.#resultado('NASA POWER', 'medicion', lugar, dias, null);
  }
}

module.exports = ClimaService;
