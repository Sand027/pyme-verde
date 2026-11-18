'use strict';

const WebController = require('./WebController');
const Categoria = require('../../models/Categoria');
const AccionSustentable = require('../../models/AccionSustentable');
const { ORIGENES } = require('../../models/Registro');
const ResiduoService = require('../../services/ResiduoService');
const ReporteService = require('../../services/ReporteService');
const { ValidacionError } = require('../../utils/errores');
const { limitesDelMes, sumarMeses, hoyISO } = require('../../utils/periodo');

/**
 * Páginas del panel privado. Renderizan la estructura y los datos iniciales;
 * la interacción posterior (filtros, altas, ediciones, gráficas) la hace
 * JavaScript en el navegador contra la API REST.
 */
class PanelController extends WebController {
  #s;

  constructor(servicios) {
    super();
    this.#s = servicios;
  }

  /** Mes elegido (?mes=AAAA-MM) o, por omisión, el último mes cerrado. */
  static periodoDelMes(mes) {
    const valido = /^d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''));
    const base = valido ? `${mes}-01` : sumarMeses(`${hoyISO().slice(0, 7)}-01`, -1);
    return limitesDelMes(base);
  }

  async tablero(req, res) {
    const u = req.usuario;
    const { desde, hasta } = PanelController.periodoDelMes(req.query.mes);
    const [{ periodo, indicadores }, conteo, recientes, pyme] = await Promise.all([
      this.#s.indicadorService.listar(u, { desde, hasta }),
      this.#s.accionService.conteo(u),
      this.#s.registroService.buscar(u, { porPagina: 6 }),
      this.#s.catalogoService.pyme(u),
    ]);
    return res.render('panel/tablero', {
      titulo: 'Tablero',
      periodo,
      indicadores,
      conteo,
      recientes: recientes.items.map((r) => r.toJSON()),
      pyme: pyme.toJSON(),
    });
  }

  async registros(req, res) {
    const categorias = await this.#s.registroService.categorias(req.usuario);
    return res.render('panel/registros', {
      titulo: 'Registros',
      categorias: categorias.map((c) => c.toJSON()),
      tipos: Categoria.TIPOS,
      origenes: ORIGENES,
    });
  }

  async residuos(req, res) {
    const resumen = await this.#s.residuoService.resumen(req.usuario, req.query);
    return res.render('panel/residuos', {
      titulo: 'Residuos y economía circular',
      resumen,
      guia: ResiduoService.guia(),
    });
  }

  async calculadora(req, res) {
    const supuestos = await this.#s.calculadoraService.supuestos(req.usuario);
    return res.render('panel/calculadora', { titulo: 'Calculadora de ahorro', supuestos });
  }

  async acciones(req, res) {
    const u = req.usuario;
    const [acciones, indicadores, responsables] = await Promise.all([
      this.#s.accionService.listar(u),
      this.#s.indicadorService.definiciones(u),
      this.#s.usuarioService.responsables(u),
    ]);
    return res.render('panel/acciones', {
      titulo: 'Plan de acciones',
      acciones: acciones.map((a) => ({ ...a.toJSON(), permisos: this.#s.accionService.permisosSobre(u, a) })),
      indicadores: indicadores.map((i) => i.toJSON()),
      responsables: responsables.map((r) => ({ id: r.id, nombre: r.nombre })),
      estados: AccionSustentable.ESTADOS,
    });
  }

  async reportes(req, res) {
    const q = { ...ReporteService.periodosPorDefecto(), ...req.query };
    try {
      const reporte = await this.#s.reporteService.comparar(req.usuario, q);
      return res.render('panel/reportes', { titulo: 'Reportes', reporte, consulta: q });
    } catch (err) {
      if (!(err instanceof ValidacionError)) throw err;
      // Periodos inválidos: se muestra el comparativo por omisión con el motivo.
      const def = ReporteService.periodosPorDefecto();
      const reporte = await this.#s.reporteService.comparar(req.usuario, def);
      res.status(422);
      return res.render('panel/reportes', { titulo: 'Reportes', reporte, consulta: def, avisoError: Object.values(err.errores || {})[0] || err.message });
    }
  }

  async reporteImprimible(req, res) {
    const q = { ...ReporteService.periodosPorDefecto(), ...req.query };
    const [reporte, pyme] = await Promise.all([
      this.#s.reporteService.comparar(req.usuario, q),
      this.#s.catalogoService.pyme(req.usuario),
    ]);
    return res.render('panel/reporte-imprimible', {
      titulo: 'Reporte de resultados', reporte, pyme: pyme.toJSON(), generado: new Date(),
    });
  }
}

module.exports = PanelController;
