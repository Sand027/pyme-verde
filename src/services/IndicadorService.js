'use strict';

const IndicadorStrategyFactory = require('../patterns/fabricas/IndicadorStrategyFactory');
const { PERMISOS } = require('../models/Rol');
const { normalizarPeriodo, mesesEntre, limitesDelMes, sumarMeses, etiquetaMes } = require('../utils/periodo');
const { ProhibidoError, NoEncontradoError, ValidacionError } = require('../utils/errores');

/**
 * Calcula los indicadores de un periodo delegando cada fórmula a su
 * estrategia (patrón Strategy) y los compara contra sus metas.
 */
class IndicadorService {
  #indicadores;
  #registros;
  #acciones;
  #parametros;
  #pymes;
  #eventos;

  constructor({ indicadorRepository, registroRepository, accionRepository, parametroRepository, pymeRepository, eventBus }) {
    this.#indicadores = indicadorRepository;
    this.#registros = registroRepository;
    this.#acciones = accionRepository;
    this.#parametros = parametroRepository;
    this.#pymes = pymeRepository;
    this.#eventos = eventBus;
  }

  /** Evalúa una definición sobre un conjunto de datos ya cargado. */
  static evaluar(indicador, contexto) {
    const estrategia = IndicadorStrategyFactory.para(indicador.clave);
    const r = estrategia.calcular({ ...contexto, indicador });
    return {
      ...indicador.toJSON(),
      valor: r.valor,
      numerador: r.numerador,
      denominador: r.denominador,
      explicacion: r.explicacion,
      estado: indicador.evaluar(r.valor),
      brecha: indicador.brecha(r.valor),
      periodo: { desde: contexto.periodo.desde, hasta: contexto.periodo.hasta, meses: contexto.periodo.meses.length },
    };
  }

  async #contexto(pymeId, periodo) {
    const [pyme, registros, acciones, parametros] = await Promise.all([
      this.#pymes.porId(pymeId),
      this.#registros.enPeriodo(pymeId, periodo.desde, periodo.hasta),
      this.#acciones.listar(pymeId),
      this.#parametros.mapa(pymeId),
    ]);
    return { pyme, registros, acciones, parametros, periodo };
  }

  /** Todos los indicadores de la empresa en un periodo. */
  async calcular(pymeId, consultaPeriodo = {}, { soloPublicos = false } = {}) {
    const periodo = normalizarPeriodo(consultaPeriodo);
    const [definiciones, contexto] = await Promise.all([
      this.#indicadores.listar(pymeId, { soloPublicos }),
      this.#contexto(pymeId, periodo),
    ]);
    return {
      periodo: { desde: periodo.desde, hasta: periodo.hasta, meses: periodo.meses },
      indicadores: definiciones.map((d) => IndicadorService.evaluar(d, contexto)),
    };
  }

  async listar(usuario, consultaPeriodo) {
    if (!usuario.puede(PERMISOS.INDICADORES_LEER)) throw new ProhibidoError();
    return this.calcular(usuario.pymeId, consultaPeriodo);
  }

  async #definicion(pymeId, id) {
    const definicion = await this.#indicadores.porId(Number(id), pymeId);
    if (!definicion) throw new NoEncontradoError('El indicador');
    return definicion;
  }

  async obtener(usuario, id, consultaPeriodo) {
    if (!usuario.puede(PERMISOS.INDICADORES_LEER)) throw new ProhibidoError();
    const definicion = await this.#definicion(usuario.pymeId, id);
    const periodo = normalizarPeriodo(consultaPeriodo);
    return IndicadorService.evaluar(definicion, await this.#contexto(usuario.pymeId, periodo));
  }

  /**
   * Serie mensual de un indicador: un valor por mes de los últimos `meses`.
   * Carga los datos una sola vez y evalúa la estrategia mes por mes.
   */
  async serie(pymeId, id, { meses = 6, hasta = null } = {}) {
    const n = Number(meses);
    if (!Number.isInteger(n) || n < 1 || n > 24) throw new ValidacionError({ meses: 'Elige entre 1 y 24 meses.' });
    const definicion = await this.#definicion(pymeId, id);
    const fin = limitesDelMes(hasta || new Date().toISOString().slice(0, 10)).hasta;
    const inicio = sumarMeses(`${fin.slice(0, 7)}-01`, -(n - 1));
    const contexto = await this.#contexto(pymeId, { desde: inicio, hasta: fin, meses: mesesEntre(inicio, fin) });

    const puntos = contexto.periodo.meses.map((mes) => {
      const { desde, hasta: h } = limitesDelMes(`${mes}-01`);
      const delMes = {
        ...contexto,
        registros: contexto.registros.filter((r) => r.mes === mes),
        periodo: { desde, hasta: h, meses: [mes] },
      };
      const r = IndicadorService.evaluar(definicion, delMes);
      return { mes, etiqueta: etiquetaMes(mes), valor: r.valor, estado: r.estado };
    });
    return { indicador: definicion.toJSON(), puntos };
  }

  async serieParaUsuario(usuario, id, consulta) {
    if (!usuario.puede(PERMISOS.INDICADORES_LEER)) throw new ProhibidoError();
    return this.serie(usuario.pymeId, id, consulta);
  }

  /** Solo indicadores marcados como públicos, para la sección de visitantes. */
  async publicos(pymeId, consultaPeriodo) {
    return this.calcular(pymeId, consultaPeriodo, { soloPublicos: true });
  }

  async seriePublica(pymeId, id, consulta) {
    const definicion = await this.#definicion(pymeId, id);
    if (!definicion.publico) throw new NoEncontradoError('El indicador');
    return this.serie(pymeId, id, consulta);
  }

  async definiciones(usuario) {
    if (!usuario.puede(PERMISOS.INDICADORES_LEER)) throw new ProhibidoError();
    return this.#indicadores.listar(usuario.pymeId);
  }

  async actualizarMeta(usuario, id, { meta, publico }, ip) {
    if (!usuario.puede(PERMISOS.INDICADORES_ADMINISTRAR)) throw new ProhibidoError();
    const definicion = await this.#definicion(usuario.pymeId, id);
    const anterior = definicion.meta;
    const esPublico = publico === undefined ? undefined : publico === true || publico === 'true' || publico === 'on';
    definicion.actualizarMeta(meta, esPublico);
    await this.#indicadores.actualizarMeta(definicion);
    await this.#eventos.publicar('indicador.meta_actualizada', {
      usuarioId: usuario.id, ip, entidad: 'indicador', entidadId: definicion.id,
      detalle: { anterior, nueva: definicion.meta, publico: definicion.publico },
    });
    return definicion;
  }
}

module.exports = IndicadorService;
