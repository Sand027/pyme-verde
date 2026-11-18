'use strict';

const express = require('express');
const c = require('../container');
const AuthController = require('../controllers/web/AuthController');
const PublicoController = require('../controllers/web/PublicoController');
const PanelController = require('../controllers/web/PanelController');
const AdminController = require('../controllers/web/AdminController');
const { requiereSesion, requierePermiso } = require('../middleware/auth');
const { asincrono: a } = require('../middleware/errores');
const { asegurarToken } = require('../middleware/csrf');
const { limiteLogin } = require('../middleware/seguridad');
const { PERMISOS: P } = require('../models/Rol');
const { NoEncontradoError } = require('../utils/errores');

const auth = new AuthController(c.authService);
const publico = new PublicoController(c.catalogoService, c.indicadorService, c.registroService);
const panel = new PanelController(c);
const admin = new AdminController(c);

const router = express.Router();
router.param('id', (req, res, next, id) => (/^[1-9]\d{0,9}$/.test(id) ? next() : next(new NoEncontradoError('La página'))));

// --- Sección pública ------------------------------------------------------------
router.get('/', a(publico.inicio));
router.get('/privacidad', publico.privacidad);
router.get('/creditos', publico.creditos);

// --- Autenticación --------------------------------------------------------------
router.get('/login', asegurarToken, auth.mostrarLogin);
router.post('/login', limiteLogin, asegurarToken, a(auth.iniciar));
router.post('/logout', a(auth.cerrar));

// --- Panel privado (sesión obligatoria) ---------------------------------------
router.use(['/panel', '/perfil', '/admin'], requiereSesion, asegurarToken);

router.get('/perfil', auth.perfil);
router.post('/perfil/contrasena', a(auth.cambiarPassword));

router.get('/panel', requierePermiso(P.PANEL_VER), a(panel.tablero));
router.get('/panel/registros', requierePermiso(P.REGISTROS_LEER), a(panel.registros));
router.get('/panel/residuos', requierePermiso(P.REGISTROS_LEER), a(panel.residuos));
router.get('/panel/calculadora', requierePermiso(P.PANEL_VER), a(panel.calculadora));
router.get('/panel/acciones', requierePermiso(P.ACCIONES_LEER), a(panel.acciones));
router.get('/panel/reportes', requierePermiso(P.REPORTES_GENERAR), a(panel.reportes));
router.get('/panel/reportes/imprimir', requierePermiso(P.REPORTES_GENERAR), a(panel.reporteImprimible));

// --- Administración ---------------------------------------------------------------
router.get('/admin/usuarios', requierePermiso(P.USUARIOS_ADMINISTRAR), a(admin.usuarios));
router.post('/admin/usuarios', requierePermiso(P.USUARIOS_ADMINISTRAR), a(admin.crearUsuario));
router.get('/admin/usuarios/:id', requierePermiso(P.USUARIOS_ADMINISTRAR), a(admin.editarUsuario));
router.post('/admin/usuarios/:id', requierePermiso(P.USUARIOS_ADMINISTRAR), a(admin.actualizarUsuario));

router.get('/admin/configuracion', requierePermiso(P.CONFIGURACION_ADMINISTRAR), a(admin.configuracion));
router.post('/admin/configuracion/empresa', requierePermiso(P.CONFIGURACION_ADMINISTRAR), a(admin.guardarPyme));
router.post('/admin/configuracion/parametros/:id', requierePermiso(P.CONFIGURACION_ADMINISTRAR), a(admin.guardarParametro));
router.post('/admin/configuracion/indicadores/:id', requierePermiso(P.INDICADORES_ADMINISTRAR), a(admin.guardarMeta));
router.post('/admin/configuracion/categorias', requierePermiso(P.CATALOGOS_ADMINISTRAR), a(admin.crearCategoria));
router.post('/admin/configuracion/categorias/:id', requierePermiso(P.CATALOGOS_ADMINISTRAR), a(admin.actualizarCategoria));

router.get('/admin/bitacora', requierePermiso(P.BITACORA_LEER), a(admin.bitacora));

module.exports = router;
