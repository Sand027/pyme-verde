'use strict';

const { PERMISOS } = require('../models/Rol');
const { ProhibidoError, ValidacionError } = require('../utils/errores');
const { normalizarPeriodo, limitesDelMes, sumarMeses, hoyISO } = require('../utils/periodo');
const RegistroService = require('./RegistroService');

/** Compara periodos, resume resultados y exporta datos. */
class ReporteService {
  #indicadores;
  #registros;
  #acciones;
  #residuos;

  constructor({ indicadorService, registroRepository, accionRepository, residuoService }) {
    this.#indicadores = indicadorService;
    this.#registros = registroRepository;
    this.#acciones = accionRepository;
    this.#residuos = residuoService;
  }

  #exigir(usuario) {
    if (!usuario.puede(PERMISOS.REPORTES_GENERAR)) throw new ProhibidoError('Solo un administrador puede generar reportes.');
  }

  /** Por defecto: último mes completo (B) contra el mes anterior (A). */
  static periodosPorDefecto(hoy = hoyISO()) {
    const inicioMesActual = `${hoy.slice(0, 7)}-01`;
    const b = limitesDelMes(sumarMeses(inicioMesActual, -1));
    const a = limitesDelMes(sumarMeses(inicioMesActual, -2));
    return { aDesde: a.desde, aHasta: a.hasta, bDesde: b.desde, bHasta: b.hasta };
  }

  static #variacion(a, b) {
    if (a === null || b === null) return null;
    if (a === 0) return b === 0 ? 0 : null;
    return Math.round(((b - a) / Math.abs(a)) * 1000) / 10;
  }

  async comparar(usuario, q = {}) {
    this.#exigir(usuario);
    const def = ReporteService.periodosPorDefecto();
    const pa = normalizarPeriodo({ desde: q.aDesde || def.aDesde, hasta: q.aHasta || def.aHasta });
    const pb = normalizarPeriodo({ desde: q.bDesde || def.bDesde, hasta: q.bHasta || def.bHasta });
    if (pa.meses.length !== pb.meses.length) {
      throw new ValidacionError({ bHasta: 'Compara periodos con el mismo número de meses para que los totales sean comparables.' });
    }

    const [ia, ib, ta, tb, residuos, acciones] = await Promise.all([
      this.#indicadores.calcular(usuario.pymeId, pa),
      this.#indicadores.calcular(usuario.pymeId, pb),
      this.#registros.totalesMensuales(usuario.pymeId, pa.desde, pa.hasta),
      this.#registros.totalesMensuales(usuario.pymeId, pb.desde, pb.hasta),
      this.#residuos.resumen(usuario, pb),
      this.#acciones.listar(usuario.pymeId),
    ]);

    const indicadores = ib.indicadores.map((b) => {
      const a = ia.indicadores.find((x) => x.id === b.id);
      const variacion = ReporteService.#variacion(a?.valor ?? null, b.valor);
      const mejora = variacion === null || variacion === 0 ? null : (b.sentido === 'menor' ? variacion < 0 : variacion > 0);
      return { id: b.id, nombre: b.nombre, unidad: b.unidad, dimension: b.dimensionEtiqueta, meta: b.meta,
        sentido: b.sentido, a: a?.valor ?? null, b: b.valor, estado: b.estado, variacion, mejora };
    });

    const agrupar = (filas) => filas.reduce((m, f) => {
      const k = f.categoria_id;
      if (!m.has(k)) m.set(k, { categoria: f.categoria, tipo: f.tipo, unidad: f.unidad, cantidad: 0, costo: 0 });
      const e = m.get(k);
      e.cantidad += f.cantidad;
      e.costo += f.costo;
      return m;
    }, new Map());
    const ga = agrupar(ta);
    const gb = agrupar(tb);
    const ids = new Set([...ga.keys(), ...gb.keys()]);
    const categorias = [...ids].map((id) => {
      const a = ga.get(id);
      const b = gb.get(id);
      const base = b || a;
      const ca = a ? Math.round(a.cantidad * 100) / 100 : 0;
      const cb = b ? Math.round(b.cantidad * 100) / 100 : 0;
      return { categoria: base.categoria, tipo: base.tipo, unidad: base.unidad, a: ca, b: cb,
        costoA: a ? Math.round(a.costo) : 0, costoB: b ? Math.round(b.costo) : 0, variacion: ReporteService.#variacion(ca, cb) };
    }).sort((x, y) => x.tipo.localeCompare(y.tipo) || x.categoria.localeCompare(y.categoria));

    const enB = acciones.filter((x) => x.fechaInicio <= pb.hasta);
    return {
      periodoA: { desde: pa.desde, hasta: pa.hasta, meses: pa.meses.length },
      periodoB: { desde: pb.desde, hasta: pb.hasta, meses: pb.meses.length },
      indicadores,
      categorias,
      residuos: residuos.totales,
      acciones: {
        total: enB.length,
        completadas: enB.filter((x) => x.estado === 'completada').length,
        enProceso: enB.filter((x) => x.estado === 'en_proceso').length,
        pendientes: enB.filter((x) => x.estado === 'pendiente').length,
        vencidas: enB.filter((x) => x.estaVencida()).length,
        lista: enB.map((x) => x.toJSON()),
      },
    };
  }

  /** CSV compatible con Excel (BOM UTF-8, separador coma, campos entrecomillados). */
  async csvRegistros(usuario, q = {}) {
    this.#exigir(usuario);
    const filtros = RegistroService.normalizarFiltros({ ...q, pagina: 1, porPagina: 500 });
    const filas = [];
    let pagina = 1;
    let total = 0;
    do {
      const r = await this.#registros.buscar(usuario.pymeId, { ...filtros, pagina, porPagina: 500 });
      filas.push(...r.items);
      total = r.total;
      pagina += 1;
    } while (filas.length < total && pagina <= 40);

    const celda = (v) => {
      if (v === null || v === undefined) return '';
      let s = String(v);
      // Evita que Excel interprete el contenido como fórmula (inyección CSV).
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const encabezado = ['id', 'fecha', 'categoria', 'tipo', 'cantidad', 'unidad', 'costo_mxn', 'origen_dato',
      'cantidad_aprovechada', 'destino', 'evidencia_destino', 'capturo', 'notas'];
    const lineas = filas.map((r) => {
      const j = r.toJSON();
      return [j.id, j.fecha, j.categoria, j.tipo, j.cantidad, j.unidad, j.costo, j.origenDato,
        j.cantidadAprovechada, j.destino, j.evidenciaDestino, j.autor, j.notas].map(celda).join(',');
    });
    return `﻿${[encabezado.join(','), ...lineas].join('\r\n')}\r\n`;
  }
}

module.exports = ReporteService;
