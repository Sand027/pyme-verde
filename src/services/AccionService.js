'use strict';

const AccionSustentable = require('../models/AccionSustentable');
const Evidencia = require('../models/Evidencia');
const { PERMISOS } = require('../models/Rol');
const Validador = require('../utils/Validador');
const { ProhibidoError, NoEncontradoError, ValidacionError } = require('../utils/errores');

/** Plan de acciones sustentables y su seguimiento. */
class AccionService {
  #acciones;
  #indicadores;
  #usuarios;
  #eventos;

  constructor({ accionRepository, indicadorRepository, usuarioRepository, eventBus }) {
    this.#acciones = accionRepository;
    this.#indicadores = indicadorRepository;
    this.#usuarios = usuarioRepository;
    this.#eventos = eventBus;
  }

  /** Administrador: todo. Colaborador: solo las acciones de las que es responsable. */
  #puedeSeguir(usuario, accion) {
    return usuario.puede(PERMISOS.ACCIONES_ADMINISTRAR)
      || (usuario.puede(PERMISOS.ACCIONES_SEGUIR_PROPIAS) && accion.esResponsable(usuario));
  }

  permisosSobre(usuario, accion) {
    return {
      seguir: this.#puedeSeguir(usuario, accion),
      administrar: usuario.puede(PERMISOS.ACCIONES_ADMINISTRAR),
    };
  }

  async listar(usuario, q = {}) {
    if (!usuario.puede(PERMISOS.ACCIONES_LEER)) throw new ProhibidoError();
    new Validador(q)
      .enLista('estado', 'El estado', Object.keys(AccionSustentable.ESTADOS))
      .numero('responsableId', 'El responsable', { min: 1, entero: true })
      .numero('indicadorId', 'El indicador', { min: 1, entero: true })
      .lanzarSiHayErrores('Los filtros no son válidos.');
    return this.#acciones.listar(usuario.pymeId, {
      estado: q.estado || null,
      responsableId: q.responsableId ? Number(q.responsableId) : null,
      indicadorId: q.indicadorId ? Number(q.indicadorId) : null,
    });
  }

  async obtener(usuario, id) {
    if (!usuario.puede(PERMISOS.ACCIONES_LEER)) throw new ProhibidoError();
    const accion = await this.#acciones.porId(Number(id), usuario.pymeId);
    if (!accion) throw new NoEncontradoError('La acción');
    return accion;
  }

  /** Verifica que indicador y responsable pertenezcan a la misma empresa. */
  async #validarRelaciones(usuario, { indicadorId, responsableId }) {
    const errores = {};
    if (indicadorId && !(await this.#indicadores.porId(Number(indicadorId), usuario.pymeId))) {
      errores.indicadorId = 'El indicador no existe.';
    }
    if (responsableId) {
      const responsable = await this.#usuarios.porId(Number(responsableId));
      if (!responsable || responsable.pymeId !== usuario.pymeId || !responsable.activo) {
        errores.responsableId = 'El responsable no es un usuario activo de la empresa.';
      }
    }
    if (Object.keys(errores).length) throw new ValidacionError(errores);
  }

  async crear(usuario, datos, ip) {
    if (!usuario.puede(PERMISOS.ACCIONES_ADMINISTRAR)) throw new ProhibidoError();
    const accion = AccionSustentable.crear(datos, { pymeId: usuario.pymeId, creadoPor: usuario.id });
    await this.#validarRelaciones(usuario, accion);
    await this.#acciones.insertar(accion);
    await this.#eventos.publicar('accion.creada', {
      usuarioId: usuario.id, ip, entidad: 'accion', entidadId: accion.id, detalle: { titulo: accion.titulo },
    });
    return this.obtener(usuario, accion.id);
  }

  async actualizar(usuario, id, datos, ip) {
    if (!usuario.puede(PERMISOS.ACCIONES_ADMINISTRAR)) throw new ProhibidoError();
    const accion = await this.obtener(usuario, id);
    accion.actualizarDatos(datos);
    await this.#validarRelaciones(usuario, accion);
    await this.#acciones.actualizar(accion);
    await this.#eventos.publicar('accion.actualizada', {
      usuarioId: usuario.id, ip, entidad: 'accion', entidadId: accion.id, detalle: { titulo: accion.titulo },
    });
    return this.obtener(usuario, accion.id);
  }

  /** Cambia estado y/o avance; el modelo mantiene la coherencia entre ambos. */
  async seguimiento(usuario, id, { estado, avance }, ip) {
    const accion = await this.obtener(usuario, id);
    if (!this.#puedeSeguir(usuario, accion)) {
      throw new ProhibidoError('Solo el responsable de la acción o un administrador pueden actualizarla.');
    }
    if (estado === undefined && avance === undefined) {
      throw new ValidacionError({ estado: 'Indica el estado o el avance.' });
    }
    const antes = { estado: accion.estado, avance: accion.avance };
    if (avance !== undefined && avance !== '') accion.actualizarAvance(avance);
    else accion.cambiarEstado(estado);
    await this.#acciones.actualizar(accion);
    await this.#eventos.publicar('accion.seguimiento', {
      usuarioId: usuario.id, ip, entidad: 'accion', entidadId: accion.id,
      detalle: { antes, despues: { estado: accion.estado, avance: accion.avance } },
    });
    return this.obtener(usuario, accion.id);
  }

  async agregarEvidencia(usuario, id, datos, ip) {
    const accion = await this.obtener(usuario, id);
    if (!this.#puedeSeguir(usuario, accion)) {
      throw new ProhibidoError('Solo el responsable de la acción o un administrador pueden agregar evidencias.');
    }
    const evidencia = Evidencia.crear(datos, { accionId: accion.id, usuarioId: usuario.id });
    await this.#acciones.insertarEvidencia(evidencia);
    await this.#eventos.publicar('accion.evidencia', {
      usuarioId: usuario.id, ip, entidad: 'accion', entidadId: accion.id, detalle: { evidenciaId: evidencia.id },
    });
    return this.obtener(usuario, accion.id);
  }

  async eliminar(usuario, id, ip) {
    if (!usuario.puede(PERMISOS.ACCIONES_ADMINISTRAR)) throw new ProhibidoError();
    const accion = await this.obtener(usuario, id);
    await this.#acciones.eliminar(accion.id, usuario.pymeId);
    await this.#eventos.publicar('accion.eliminada', {
      usuarioId: usuario.id, ip, entidad: 'accion', entidadId: accion.id, detalle: { titulo: accion.titulo },
    });
  }

  async conteo(usuario) {
    if (!usuario.puede(PERMISOS.ACCIONES_LEER)) throw new ProhibidoError();
    return this.#acciones.conteoPorEstado(usuario.pymeId);
  }
}

module.exports = AccionService;
