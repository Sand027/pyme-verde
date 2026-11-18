'use strict';

const DestinoStrategyFactory = require('../patterns/fabricas/DestinoStrategyFactory');
const DestinoResiduoStrategy = require('../patterns/estrategias/destinos/DestinoResiduoStrategy');
const Categoria = require('../models/Categoria');
const { PERMISOS } = require('../models/Rol');
const { normalizarPeriodo } = require('../utils/periodo');
const { ProhibidoError, NoEncontradoError, ValidacionError } = require('../utils/errores');

/** Economía circular: clasificación, aprovechamiento y destino de residuos. */
class ResiduoService {
  #registros;
  #categorias;

  constructor({ registroRepository, categoriaRepository }) {
    this.#registros = registroRepository;
    this.#categorias = categoriaRepository;
  }

  async resumen(usuario, consultaPeriodo) {
    if (!usuario.puede(PERMISOS.REGISTROS_LEER)) throw new ProhibidoError();
    const periodo = normalizarPeriodo(consultaPeriodo);
    const [porCategoria, porDestino] = await Promise.all([
      this.#registros.resumenResiduos(usuario.pymeId, periodo.desde, periodo.hasta),
      this.#registros.resumenDestinos(usuario.pymeId, periodo.desde, periodo.hasta),
    ]);

    const categorias = porCategoria.map((c) => {
      const estrategia = DestinoStrategyFactory.para(c.clasificacion);
      return {
        categoriaId: c.categoria_id,
        categoria: c.categoria,
        clasificacion: c.clasificacion,
        clasificacionEtiqueta: Categoria.CLASIFICACIONES[c.clasificacion],
        unidad: c.unidad,
        generado: c.generado,
        aprovechado: c.aprovechado,
        porcentaje: c.generado > 0 ? Math.round((c.aprovechado / c.generado) * 1000) / 10 : 0,
        registros: c.registros,
        conEvidencia: c.con_evidencia,
        exigeEvidencia: estrategia.exigeEvidencia(),
        recomendaciones: estrategia.recomendaciones(),
      };
    });

    const generado = categorias.reduce((t, c) => t + c.generado, 0);
    const aprovechado = categorias.reduce((t, c) => t + c.aprovechado, 0);
    return {
      periodo: { desde: periodo.desde, hasta: periodo.hasta, meses: periodo.meses },
      totales: {
        generado: Math.round(generado * 1000) / 1000,
        aprovechado: Math.round(aprovechado * 1000) / 1000,
        porcentaje: generado > 0 ? Math.round((aprovechado / generado) * 1000) / 10 : 0,
      },
      categorias,
      destinos: porDestino.map((d) => ({
        destino: d.destino,
        etiqueta: DestinoResiduoStrategy.ETIQUETAS[d.destino],
        aprovechado: d.aprovechado,
        generado: d.generado,
        registros: d.registros,
      })),
    };
  }

  /** Destinos válidos y recomendaciones para una categoría de residuo. */
  async opciones(usuario, categoriaId) {
    if (!usuario.puede(PERMISOS.REGISTROS_LEER)) throw new ProhibidoError();
    const id = Number(categoriaId);
    if (!Number.isInteger(id) || id < 1) throw new ValidacionError({ categoriaId: 'Categoría no válida.' });
    const categoria = await this.#categorias.porId(id, usuario.pymeId);
    if (!categoria) throw new NoEncontradoError('La categoría');
    if (!categoria.esResiduo()) throw new ValidacionError({ categoriaId: 'La categoría no es un residuo.' });
    return { categoria: categoria.toJSON(), ...DestinoStrategyFactory.para(categoria.clasificacion).describir() };
  }

  /** Reglas de todas las clasificaciones (para la guía de la interfaz). */
  static guia() {
    return DestinoStrategyFactory.todas().map((e) => ({
      ...e.describir(),
      etiqueta: Categoria.CLASIFICACIONES[e.clasificacion],
    }));
  }
}

module.exports = ResiduoService;
