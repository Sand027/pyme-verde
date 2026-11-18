'use strict';

const express = require('express');
const c = require('../container');
const C = require('../controllers/api/controladores');
const { requiereSesion, requierePermiso } = require('../middleware/auth');
const { asincrono } = require('../middleware/errores');
const { limiteApi } = require('../middleware/seguridad');
const { asegurarToken } = require('../middleware/csrf');
const { PERMISOS: P } = require('../models/Rol');
const { NoEncontradoError } = require('../utils/errores');
const openapi = require('../docs/openapi');

const registros = new C.RegistroApiController(c.registroService);
const indicadores = new C.IndicadorApiController(c.indicadorService);
const acciones = new C.AccionApiController(c.accionService);
const residuos = new C.ResiduoApiController(c.residuoService);
const calculadora = new C.CalculadoraApiController(c.calculadoraService);
const reportes = new C.ReporteApiController(c.reporteService);
const publico = new C.PublicoApiController(c.catalogoService, c.indicadorService);
const sesion = new C.SesionApiController();

const router = express.Router();
const a = asincrono;

router.use(limiteApi);

// Todo :id debe ser un entero positivo; si no, el recurso no existe.
router.param('id', (req, res, next, id) => (/^[1-9]\d{0,9}$/.test(id) ? next() : next(new NoEncontradoError('El recurso'))));

// --- Documentación y datos públicos (sin sesión) ------------------------------
router.get('/docs', (req, res) => res.render('publico/api-docs', { titulo: 'Documentación de la API', spec: openapi }));
router.get('/docs/openapi.json', (req, res) => res.json(openapi));
router.get('/publico/pyme', a(publico.pyme));
router.get('/publico/indicadores', a(publico.indicadores));
router.get('/publico/indicadores/:id/serie', a(publico.serie));

// --- A partir de aquí se exige sesión ----------------------------------------
router.use(requiereSesion, asegurarToken);

router.get('/sesion', a(sesion.actual));

// Servicio 1: registros
router.get('/registros', requierePermiso(P.REGISTROS_LEER), a(registros.listar));
router.get('/registros/categorias', requierePermiso(P.REGISTROS_LEER), a(registros.categorias));
router.get('/registros/:id', requierePermiso(P.REGISTROS_LEER), a(registros.obtener));
router.post('/registros', requierePermiso(P.REGISTROS_CREAR), a(registros.crear));
router.put('/registros/:id', requierePermiso(P.REGISTROS_LEER), a(registros.actualizar));
router.patch('/registros/:id/origen', requierePermiso(P.REGISTROS_LEER), a(registros.cambiarOrigen));
router.delete('/registros/:id', requierePermiso(P.REGISTROS_ELIMINAR), a(registros.eliminar));

// Servicio 2: indicadores
router.get('/indicadores', requierePermiso(P.INDICADORES_LEER), a(indicadores.listar));
router.get('/indicadores/:id', requierePermiso(P.INDICADORES_LEER), a(indicadores.obtener));
router.get('/indicadores/:id/serie', requierePermiso(P.INDICADORES_LEER), a(indicadores.serie));
router.patch('/indicadores/:id/meta', requierePermiso(P.INDICADORES_ADMINISTRAR), a(indicadores.actualizarMeta));

// Servicio 3: acciones
router.get('/acciones', requierePermiso(P.ACCIONES_LEER), a(acciones.listar));
router.get('/acciones/:id', requierePermiso(P.ACCIONES_LEER), a(acciones.obtener));
router.post('/acciones', requierePermiso(P.ACCIONES_ADMINISTRAR), a(acciones.crear));
router.put('/acciones/:id', requierePermiso(P.ACCIONES_ADMINISTRAR), a(acciones.actualizar));
router.patch('/acciones/:id/seguimiento', requierePermiso(P.ACCIONES_LEER), a(acciones.seguimiento));
router.post('/acciones/:id/evidencias', requierePermiso(P.ACCIONES_LEER), a(acciones.agregarEvidencia));
router.delete('/acciones/:id', requierePermiso(P.ACCIONES_ADMINISTRAR), a(acciones.eliminar));

// Servicio 4: residuos y economía circular
router.get('/residuos/resumen', requierePermiso(P.REGISTROS_LEER), a(residuos.resumen));
router.get('/residuos/guia', requierePermiso(P.REGISTROS_LEER), a(residuos.guia));
router.get('/residuos/categorias/:id/destinos', requierePermiso(P.REGISTROS_LEER), a(residuos.destinos));

// Servicio 5: calculadora
router.get('/calculadora/supuestos', requierePermiso(P.PANEL_VER), a(calculadora.supuestos));
router.post('/calculadora/escenarios', requierePermiso(P.PANEL_VER), a(calculadora.evaluar));

// Servicio 6: reportes (solo administración)
router.get('/reportes/comparativo', requierePermiso(P.REPORTES_GENERAR), a(reportes.comparativo));
router.get('/reportes/registros.csv', requierePermiso(P.REPORTES_GENERAR), a(reportes.csv));

router.use((req, res, next) => next(new NoEncontradoError('El recurso de la API')));

module.exports = router;
