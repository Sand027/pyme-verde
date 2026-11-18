'use strict';

const WebController = require('./WebController');
const Categoria = require('../../models/Categoria');
const { Rol } = require('../../models/Rol');

/** Administración: usuarios, configuración de la empresa, catálogos, metas y bitácora. */
class AdminController extends WebController {
  #usuarios;
  #catalogo;
  #indicadores;

  constructor({ usuarioService, catalogoService, indicadorService }) {
    super();
    this.#usuarios = usuarioService;
    this.#catalogo = catalogoService;
    this.#indicadores = indicadorService;
  }

  // --- Usuarios --------------------------------------------------------------

  async usuarios(req, res) {
    const lista = await this.#usuarios.listar(req.usuario);
    return res.render('admin/usuarios', {
      titulo: 'Usuarios',
      usuarios: lista.map((u) => ({ ...u.toJSON(), bloqueado: u.estaBloqueado() })),
      roles: Rol.TODOS.map((r) => ({ nombre: r.nombre, etiqueta: r.etiqueta })),
    });
  }

  async crearUsuario(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#usuarios.crear(req.usuario, req.body, this.ip(req)),
      vista: 'admin/usuarios',
      datosVista: async () => {
        const lista = await this.#usuarios.listar(req.usuario);
        return {
          titulo: 'Usuarios',
          usuarios: lista.map((u) => ({ ...u.toJSON(), bloqueado: u.estaBloqueado() })),
          roles: Rol.TODOS.map((r) => ({ nombre: r.nombre, etiqueta: r.etiqueta })),
          abrirAlta: true,
        };
      },
      mensaje: (u) => `Cuenta ${u.username} creada.`,
      destino: '/admin/usuarios',
    });
  }

  async editarUsuario(req, res) {
    const u = await this.#usuarios.obtener(req.usuario, req.params.id);
    return res.render('admin/usuario-editar', {
      titulo: `Editar ${u.nombre}`,
      cuenta: { ...u.toJSON(), bloqueado: u.estaBloqueado() },
      roles: Rol.TODOS.map((r) => ({ nombre: r.nombre, etiqueta: r.etiqueta })),
    });
  }

  async actualizarUsuario(req, res) {
    const datos = {
      nombre: req.body.nombre,
      correo: req.body.correo,
      rol: req.body.rol,
      activo: req.body.activo === 'on',
      password: req.body.password || undefined,
      desbloquear: req.body.desbloquear === 'on',
    };
    return this.formulario(req, res, {
      accion: () => this.#usuarios.actualizar(req.usuario, req.params.id, datos, this.ip(req)),
      vista: 'admin/usuario-editar',
      datosVista: async () => {
        const u = await this.#usuarios.obtener(req.usuario, req.params.id);
        return {
          titulo: `Editar ${u.nombre}`,
          cuenta: { ...u.toJSON(), bloqueado: u.estaBloqueado() },
          roles: Rol.TODOS.map((r) => ({ nombre: r.nombre, etiqueta: r.etiqueta })),
        };
      },
      mensaje: (u) => `Cuenta de ${u.nombre} actualizada.`,
      destino: '/admin/usuarios',
    });
  }

  // --- Configuración -----------------------------------------------------------

  async #datosConfiguracion(req) {
    const [pyme, categorias, parametros, indicadores] = await Promise.all([
      this.#catalogo.pyme(req.usuario),
      this.#catalogo.categorias(req.usuario),
      this.#catalogo.parametros(req.usuario),
      this.#indicadores.definiciones(req.usuario),
    ]);
    return {
      titulo: 'Configuración',
      pyme: pyme.toJSON(),
      categorias: categorias.map((c) => c.toJSON()),
      parametros: parametros.map((p) => p.toJSON()),
      indicadores: indicadores.map((i) => i.toJSON()),
      tipos: Categoria.TIPOS,
      clasificaciones: Categoria.CLASIFICACIONES,
      seccion: req.query.seccion || 'empresa',
    };
  }

  async configuracion(req, res) {
    return res.render('admin/configuracion', await this.#datosConfiguracion(req));
  }

  async guardarPyme(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#catalogo.actualizarPyme(req.usuario, req.body, this.ip(req)),
      vista: 'admin/configuracion',
      datosVista: async () => ({ ...(await this.#datosConfiguracion(req)), seccion: 'empresa' }),
      mensaje: 'Datos de la empresa guardados.',
      destino: '/admin/configuracion?seccion=empresa',
    });
  }

  async guardarParametro(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#catalogo.actualizarParametro(req.usuario, req.params.id, req.body, this.ip(req)),
      vista: 'admin/configuracion',
      datosVista: async () => ({ ...(await this.#datosConfiguracion(req)), seccion: 'supuestos', parametroConError: Number(req.params.id) }),
      mensaje: (p) => `Supuesto "${p.nombre}" actualizado.`,
      destino: '/admin/configuracion?seccion=supuestos',
    });
  }

  async guardarMeta(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#indicadores.actualizarMeta(req.usuario, req.params.id,
        { meta: req.body.meta, publico: req.body.publico === 'on' }, this.ip(req)),
      vista: 'admin/configuracion',
      datosVista: async () => ({ ...(await this.#datosConfiguracion(req)), seccion: 'metas', indicadorConError: Number(req.params.id) }),
      mensaje: (i) => `Meta de "${i.nombre}" actualizada.`,
      destino: '/admin/configuracion?seccion=metas',
    });
  }

  async crearCategoria(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#catalogo.crearCategoria(req.usuario, req.body, this.ip(req)),
      vista: 'admin/configuracion',
      datosVista: async () => ({ ...(await this.#datosConfiguracion(req)), seccion: 'categorias' }),
      mensaje: (c) => `Categoría "${c.nombre}" creada.`,
      destino: '/admin/configuracion?seccion=categorias',
    });
  }

  async actualizarCategoria(req, res) {
    return this.formulario(req, res, {
      accion: () => this.#catalogo.actualizarCategoria(req.usuario, req.params.id,
        { nombre: req.body.nombre, descripcion: req.body.descripcion, activa: req.body.activa === 'on' }, this.ip(req)),
      vista: 'admin/configuracion',
      datosVista: async () => ({ ...(await this.#datosConfiguracion(req)), seccion: 'categorias', categoriaConError: Number(req.params.id) }),
      mensaje: (c) => `Categoría "${c.nombre}" actualizada.`,
      destino: '/admin/configuracion?seccion=categorias',
    });
  }

  // --- Bitácora ----------------------------------------------------------------

  async bitacora(req, res) {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const r = await this.#catalogo.bitacora(req.usuario, { pagina, evento: req.query.evento });
    return res.render('admin/bitacora', {
      titulo: 'Bitácora de auditoría',
      eventos: r.items,
      pagina,
      paginas: Math.max(1, Math.ceil(r.total / 50)),
      total: r.total,
      filtroEvento: req.query.evento || '',
    });
  }
}

module.exports = AdminController;
