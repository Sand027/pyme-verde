'use strict';

const ApiController = require('./ApiController');
const ResiduoService = require('../../services/ResiduoService');
const { PERMISOS } = require('../../models/Rol');

/** Servicio web 1: registros de consumos, residuos y producción. */
class RegistroApiController extends ApiController {
  #servicio;

  constructor(registroService) {
    super();
    this.#servicio = registroService;
  }

  async listar(req, res) {
    const r = await this.#servicio.buscar(req.usuario, req.query);
    return this.ok(res, r.items.map((x) => ({ ...x.toJSON(), permisos: this.#servicio.permisosSobre(req.usuario, x) })), {
      meta: { total: r.total, pagina: r.pagina, porPagina: r.porPagina, paginas: r.paginas },
    });
  }

  async categorias(req, res) {
    const lista = await this.#servicio.categorias(req.usuario, { tipo: req.query.tipo || null });
    return this.ok(res, lista.map((c) => c.toJSON()));
  }

  async obtener(req, res) {
    const r = await this.#servicio.obtener(req.usuario, req.params.id);
    return this.ok(res, { ...r.toJSON(), permisos: this.#servicio.permisosSobre(req.usuario, r) });
  }

  async crear(req, res) {
    const r = await this.#servicio.crear(req.usuario, req.body, this.ip(req));
    return this.creado(res, r.toJSON(), `/api/registros/${r.id}`);
  }

  async actualizar(req, res) {
    const r = await this.#servicio.actualizar(req.usuario, req.params.id, req.body, this.ip(req));
    return this.ok(res, r.toJSON());
  }

  async cambiarOrigen(req, res) {
    const r = await this.#servicio.cambiarOrigen(req.usuario, req.params.id, req.body.origenDato, this.ip(req));
    return this.ok(res, r.toJSON());
  }

  async eliminar(req, res) {
    await this.#servicio.eliminar(req.usuario, req.params.id, this.ip(req));
    return this.sinContenido(res);
  }
}

/** Servicio web 2: indicadores calculados, series y metas. */
class IndicadorApiController extends ApiController {
  #servicio;

  constructor(indicadorService) {
    super();
    this.#servicio = indicadorService;
  }

  async listar(req, res) {
    const r = await this.#servicio.listar(req.usuario, req.query);
    return this.ok(res, r.indicadores, { meta: { periodo: r.periodo } });
  }

  async obtener(req, res) {
    return this.ok(res, await this.#servicio.obtener(req.usuario, req.params.id, req.query));
  }

  async serie(req, res) {
    return this.ok(res, await this.#servicio.serieParaUsuario(req.usuario, req.params.id, req.query));
  }

  async actualizarMeta(req, res) {
    const i = await this.#servicio.actualizarMeta(req.usuario, req.params.id, req.body, this.ip(req));
    return this.ok(res, i.toJSON());
  }
}

/** Servicio web 3: plan de acciones sustentables. */
class AccionApiController extends ApiController {
  #servicio;

  constructor(accionService) {
    super();
    this.#servicio = accionService;
  }

  #conPermisos(req, a) {
    return { ...a.toJSON(), permisos: this.#servicio.permisosSobre(req.usuario, a) };
  }

  async listar(req, res) {
    const lista = await this.#servicio.listar(req.usuario, req.query);
    return this.ok(res, lista.map((a) => this.#conPermisos(req, a)));
  }

  async obtener(req, res) {
    return this.ok(res, this.#conPermisos(req, await this.#servicio.obtener(req.usuario, req.params.id)));
  }

  async crear(req, res) {
    const a = await this.#servicio.crear(req.usuario, req.body, this.ip(req));
    return this.creado(res, this.#conPermisos(req, a), `/api/acciones/${a.id}`);
  }

  async actualizar(req, res) {
    const a = await this.#servicio.actualizar(req.usuario, req.params.id, req.body, this.ip(req));
    return this.ok(res, this.#conPermisos(req, a));
  }

  async seguimiento(req, res) {
    const a = await this.#servicio.seguimiento(req.usuario, req.params.id, req.body, this.ip(req));
    return this.ok(res, this.#conPermisos(req, a));
  }

  async agregarEvidencia(req, res) {
    const a = await this.#servicio.agregarEvidencia(req.usuario, req.params.id, req.body, this.ip(req));
    return this.creado(res, this.#conPermisos(req, a));
  }

  async eliminar(req, res) {
    await this.#servicio.eliminar(req.usuario, req.params.id, this.ip(req));
    return this.sinContenido(res);
  }
}

/** Servicio web 4: economía circular y residuos. */
class ResiduoApiController extends ApiController {
  #servicio;

  constructor(residuoService) {
    super();
    this.#servicio = residuoService;
  }

  async resumen(req, res) {
    return this.ok(res, await this.#servicio.resumen(req.usuario, req.query));
  }

  async destinos(req, res) {
    return this.ok(res, await this.#servicio.opciones(req.usuario, req.params.id));
  }

  async guia(req, res) {
    return this.ok(res, ResiduoService.guia());
  }
}

/** Servicio web 5: calculadora de consumo y ahorro. */
class CalculadoraApiController extends ApiController {
  #servicio;

  constructor(calculadoraService) {
    super();
    this.#servicio = calculadoraService;
  }

  async supuestos(req, res) {
    return this.ok(res, await this.#servicio.supuestos(req.usuario));
  }

  async evaluar(req, res) {
    return this.ok(res, await this.#servicio.evaluar(req.usuario, req.body));
  }
}

/** Servicio web 6: reportes comparativos y exportación. */
class ReporteApiController extends ApiController {
  #servicio;

  constructor(reporteService) {
    super();
    this.#servicio = reporteService;
  }

  async comparativo(req, res) {
    return this.ok(res, await this.#servicio.comparar(req.usuario, req.query));
  }

  async csv(req, res) {
    const contenido = await this.#servicio.csvRegistros(req.usuario, req.query);
    const fecha = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="registros-${fecha}.csv"`);
    return res.send(contenido);
  }
}

/** Datos para visitantes (sin sesión): solo indicadores marcados como públicos. */
class PublicoApiController extends ApiController {
  #catalogo;
  #indicadores;

  constructor(catalogoService, indicadorService) {
    super();
    this.#catalogo = catalogoService;
    this.#indicadores = indicadorService;
  }

  async pyme(req, res) {
    const p = await this.#catalogo.pymePublica();
    const { id, nombre, giro, ubicacionGeneral, descripcion, problematica, objetivo } = p.toJSON();
    return this.ok(res, { id, nombre, giro, ubicacionGeneral, descripcion, problematica, objetivo });
  }

  async indicadores(req, res) {
    const p = await this.#catalogo.pymePublica();
    const r = await this.#indicadores.publicos(p.id, req.query);
    return this.ok(res, r.indicadores, { meta: { periodo: r.periodo } });
  }

  async serie(req, res) {
    const p = await this.#catalogo.pymePublica();
    return this.ok(res, await this.#indicadores.seriePublica(p.id, req.params.id, req.query));
  }
}

/** Información de la sesión actual para la interfaz. */
class SesionApiController extends ApiController {
  async actual(req, res) {
    return this.ok(res, {
      usuario: req.usuario.toJSON(),
      permisos: Object.values(PERMISOS).filter((p) => req.usuario.puede(p)),
      // Sin CORS habilitado, solo una página del mismo origen puede leer el token.
      csrfToken: req.session.csrf,
    });
  }
}

module.exports = {
  RegistroApiController,
  IndicadorApiController,
  AccionApiController,
  ResiduoApiController,
  CalculadoraApiController,
  ReporteApiController,
  PublicoApiController,
  SesionApiController,
};
