'use strict';

const RegistroFactory = require('../patterns/fabricas/RegistroFactory');
const RegistroRepository = require('../repositories/RegistroRepository');
const Categoria = require('../models/Categoria');
const { ORIGENES } = require('../models/Registro');
const { PERMISOS } = require('../models/Rol');
const Validador = require('../utils/Validador');
const { ProhibidoError, NoEncontradoError, ValidacionError } = require('../utils/errores');

/** Reglas de negocio del registro de consumos, residuos y producción. */
class RegistroService {
  #registros;
  #categorias;
  #eventos;

  constructor({ registroRepository, categoriaRepository, eventBus }) {
    this.#registros = registroRepository;
    this.#categorias = categoriaRepository;
    this.#eventos = eventBus;
  }

  #exigir(usuario, permiso) {
    if (!usuario.puede(permiso)) throw new ProhibidoError();
  }

  /** Puede editar si es administrador o si el registro es suyo. */
  #puedeEditar(usuario, registro) {
    return usuario.puede(PERMISOS.REGISTROS_EDITAR_TODOS)
      || (usuario.puede(PERMISOS.REGISTROS_EDITAR_PROPIOS) && registro.perteneceA(usuario));
  }

  categorias(usuario, { soloActivas = true, tipo = null } = {}) {
    this.#exigir(usuario, PERMISOS.REGISTROS_LEER);
    if (tipo && !Object.keys(Categoria.TIPOS).includes(tipo)) {
      throw new ValidacionError({ tipo: 'Tipo de categoría desconocido.' });
    }
    return this.#categorias.listar(usuario.pymeId, { soloActivas, tipo });
  }

  /** Valida y normaliza los filtros que llegan por query string. */
  static normalizarFiltros(q = {}) {
    const v = new Validador(q)
      .fecha('desde', 'La fecha inicial').fecha('hasta', 'La fecha final')
      .numero('categoriaId', 'La categoría', { min: 1, entero: true })
      .enLista('tipo', 'El tipo', Object.keys(Categoria.TIPOS))
      .enLista('origen', 'El origen', Object.keys(ORIGENES))
      .enLista('orden', 'El orden', RegistroRepository.ORDENES)
      .numero('pagina', 'La página', { min: 1, entero: true })
      .numero('porPagina', 'El tamaño de página', { min: 1, max: 500, entero: true })
      .texto('texto', 'La búsqueda', { max: 80 });
    if (q.desde && q.hasta && q.desde > q.hasta) v.agregar('hasta', 'La fecha final debe ser posterior a la inicial.');
    v.lanzarSiHayErrores('Los filtros no son válidos.');
    return {
      desde: q.desde || null,
      hasta: q.hasta || null,
      categoriaId: q.categoriaId ? Number(q.categoriaId) : null,
      tipo: q.tipo || null,
      origen: q.origen || null,
      texto: q.texto ? String(q.texto).trim() : null,
      orden: q.orden || 'fecha_desc',
      pagina: q.pagina ? Number(q.pagina) : 1,
      porPagina: q.porPagina ? Number(q.porPagina) : 20,
      soloMios: q.soloMios === 'true' || q.soloMios === '1',
    };
  }

  async buscar(usuario, consulta) {
    this.#exigir(usuario, PERMISOS.REGISTROS_LEER);
    const filtros = RegistroService.normalizarFiltros(consulta);
    const resultado = await this.#registros.buscar(usuario.pymeId, {
      ...filtros, usuarioId: filtros.soloMios ? usuario.id : null,
    });
    return {
      ...resultado,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.max(1, Math.ceil(resultado.total / filtros.porPagina)),
      filtros,
    };
  }

  async obtener(usuario, id) {
    this.#exigir(usuario, PERMISOS.REGISTROS_LEER);
    const registro = await this.#registros.porId(Number(id), usuario.pymeId);
    if (!registro) throw new NoEncontradoError('El registro');
    return registro;
  }

  permisosSobre(usuario, registro) {
    return {
      editar: this.#puedeEditar(usuario, registro),
      eliminar: usuario.puede(PERMISOS.REGISTROS_ELIMINAR),
    };
  }

  async #categoria(usuario, categoriaId) {
    const id = Number(categoriaId);
    if (!Number.isInteger(id) || id < 1) throw new ValidacionError({ categoriaId: 'Selecciona una categoría.' });
    return this.#categorias.porId(id, usuario.pymeId);
  }

  async crear(usuario, datos, ip) {
    this.#exigir(usuario, PERMISOS.REGISTROS_CREAR);
    const categoria = await this.#categoria(usuario, datos.categoriaId);
    const registro = RegistroFactory.crear(datos, categoria, {
      pymeId: usuario.pymeId, usuarioId: usuario.id, autorNombre: usuario.nombre,
    });
    await this.#registros.insertar(registro);
    await this.#eventos.publicar('registro.creado', {
      usuarioId: usuario.id, ip, entidad: 'registro', entidadId: registro.id,
      detalle: { categoria: categoria.nombre, cantidad: registro.cantidad, unidad: registro.unidad, fecha: registro.fecha },
    });
    return registro;
  }

  async actualizar(usuario, id, datos, ip) {
    const actual = await this.obtener(usuario, id);
    if (!this.#puedeEditar(usuario, actual)) {
      throw new ProhibidoError('Solo puedes editar los registros que tú capturaste.');
    }
    const combinados = { ...actual.toJSON(), unidad: undefined, ...datos };
    const categoria = await this.#categoria(usuario, combinados.categoriaId);
    const editado = RegistroFactory.crear(combinados, categoria, {
      id: actual.id, pymeId: actual.pymeId, usuarioId: actual.usuarioId, autorNombre: actual.autorNombre,
    });
    await this.#registros.actualizar(editado);
    await this.#eventos.publicar('registro.actualizado', {
      usuarioId: usuario.id, ip, entidad: 'registro', entidadId: editado.id,
      detalle: { antes: { cantidad: actual.cantidad, fecha: actual.fecha }, despues: { cantidad: editado.cantidad, fecha: editado.fecha } },
    });
    return editado;
  }

  async cambiarOrigen(usuario, id, origenDato, ip) {
    const registro = await this.obtener(usuario, id);
    if (!this.#puedeEditar(usuario, registro)) {
      throw new ProhibidoError('Solo puedes editar los registros que tú capturaste.');
    }
    const anterior = registro.origenDato;
    registro.cambiarOrigen(origenDato);
    await this.#registros.actualizarOrigen(registro);
    await this.#eventos.publicar('registro.origen_cambiado', {
      usuarioId: usuario.id, ip, entidad: 'registro', entidadId: registro.id, detalle: { anterior, nuevo: origenDato },
    });
    return registro;
  }

  /**
   * Últimos registros de residuos para la sección pública. Solo devuelve
   * datos del material (sin autor ni notas internas).
   */
  async residuosRecientesPublicos(pymeId, cantidad = 10) {
    const { items } = await this.#registros.buscar(pymeId, { tipo: 'residuo', porPagina: cantidad });
    return items.map((r) => {
      const d = r.toJSON();
      return {
        id: d.id,
        fecha: d.fecha,
        categoria: d.categoria,
        clasificacion: d.clasificacion,
        cantidad: d.cantidad,
        unidad: d.unidad,
        cantidadAprovechada: d.cantidadAprovechada,
        porcentajeAprovechado: d.porcentajeAprovechado,
        destino: d.destino,
        origenDato: d.origenDato,
      };
    });
  }

  async eliminar(usuario, id, ip) {
    this.#exigir(usuario, PERMISOS.REGISTROS_ELIMINAR);
    const registro = await this.obtener(usuario, id);
    await this.#registros.eliminar(registro.id, usuario.pymeId);
    await this.#eventos.publicar('registro.eliminado', {
      usuarioId: usuario.id, ip, entidad: 'registro', entidadId: registro.id,
      detalle: { categoria: registro.categoria.nombre, cantidad: registro.cantidad, fecha: registro.fecha },
    });
  }
}

module.exports = RegistroService;
