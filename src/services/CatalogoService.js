'use strict';

const Categoria = require('../models/Categoria');
const { PERMISOS } = require('../models/Rol');
const { ProhibidoError, NoEncontradoError, ValidacionError } = require('../utils/errores');

/** Configuración de la empresa: datos generales, categorías y supuestos. */
class CatalogoService {
  #categorias;
  #parametros;
  #pymes;
  #bitacora;
  #eventos;

  constructor({ categoriaRepository, parametroRepository, pymeRepository, bitacoraRepository, eventBus }) {
    this.#categorias = categoriaRepository;
    this.#parametros = parametroRepository;
    this.#pymes = pymeRepository;
    this.#bitacora = bitacoraRepository;
    this.#eventos = eventBus;
  }

  #exigir(usuario, permiso) {
    if (!usuario.puede(permiso)) throw new ProhibidoError();
  }

  // --- Empresa ---------------------------------------------------------------

  pymePublica() {
    return this.#pymes.publica();
  }

  async pyme(usuario) {
    return this.#pymes.porId(usuario.pymeId);
  }

  async actualizarPyme(usuario, datos, ip) {
    this.#exigir(usuario, PERMISOS.CONFIGURACION_ADMINISTRAR);
    const pyme = await this.#pymes.porId(usuario.pymeId);
    pyme.actualizar(datos);
    await this.#pymes.actualizar(pyme);
    await this.#eventos.publicar('pyme.actualizada', { usuarioId: usuario.id, ip, entidad: 'pyme', entidadId: pyme.id });
    return pyme;
  }

  // --- Categorías ------------------------------------------------------------

  categorias(usuario) {
    this.#exigir(usuario, PERMISOS.CATALOGOS_ADMINISTRAR);
    return this.#categorias.listar(usuario.pymeId);
  }

  async crearCategoria(usuario, datos, ip) {
    this.#exigir(usuario, PERMISOS.CATALOGOS_ADMINISTRAR);
    Categoria.validar(datos);
    const existentes = await this.#categorias.listar(usuario.pymeId);
    if (existentes.some((c) => c.nombre.toLowerCase() === String(datos.nombre).trim().toLowerCase())) {
      throw new ValidacionError({ nombre: 'Ya existe una categoría con ese nombre.' });
    }
    const categoria = new Categoria({
      pymeId: usuario.pymeId,
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      unidad: datos.unidad.trim(),
      clasificacion: datos.tipo === 'residuo' ? datos.clasificacion : null,
      descripcion: (datos.descripcion || '').trim(),
    });
    await this.#categorias.insertar(categoria);
    await this.#eventos.publicar('categoria.creada', {
      usuarioId: usuario.id, ip, entidad: 'categoria', entidadId: categoria.id, detalle: { nombre: categoria.nombre },
    });
    return categoria;
  }

  async actualizarCategoria(usuario, id, datos, ip) {
    this.#exigir(usuario, PERMISOS.CATALOGOS_ADMINISTRAR);
    const categoria = await this.#categorias.porId(Number(id), usuario.pymeId);
    if (!categoria) throw new NoEncontradoError('La categoría');
    const activa = datos.activa === undefined ? undefined : datos.activa === true || datos.activa === 'true' || datos.activa === 'on';
    categoria.actualizar({ nombre: datos.nombre ?? categoria.nombre, descripcion: datos.descripcion, activa });
    await this.#categorias.actualizar(categoria);
    await this.#eventos.publicar('categoria.actualizada', {
      usuarioId: usuario.id, ip, entidad: 'categoria', entidadId: categoria.id, detalle: { nombre: categoria.nombre, activa: categoria.activa },
    });
    return categoria;
  }

  // --- Parámetros (supuestos de cálculo) -------------------------------------

  parametros(usuario) {
    this.#exigir(usuario, PERMISOS.PANEL_VER);
    return this.#parametros.listar(usuario.pymeId);
  }

  async actualizarParametro(usuario, id, datos, ip) {
    this.#exigir(usuario, PERMISOS.CONFIGURACION_ADMINISTRAR);
    const parametro = await this.#parametros.porId(Number(id), usuario.pymeId);
    if (!parametro) throw new NoEncontradoError('El parámetro');
    const anterior = parametro.valor;
    parametro.actualizar(datos);
    await this.#parametros.actualizar(parametro);
    await this.#eventos.publicar('parametro.actualizado', {
      usuarioId: usuario.id, ip, entidad: 'parametro', entidadId: parametro.id,
      detalle: { clave: parametro.clave, anterior, nuevo: parametro.valor },
    });
    return parametro;
  }

  // --- Bitácora --------------------------------------------------------------

  bitacora(usuario, q = {}) {
    this.#exigir(usuario, PERMISOS.BITACORA_LEER);
    return this.#bitacora.listar(usuario.pymeId, { pagina: q.pagina, evento: q.evento || null });
  }
}

module.exports = CatalogoService;
