'use strict';

const Usuario = require('../models/Usuario');
const { PERMISOS } = require('../models/Rol');
const { ProhibidoError, NoEncontradoError, ValidacionError, ConflictoError } = require('../utils/errores');

/** Administración de cuentas (solo administradores). */
class UsuarioService {
  #usuarios;
  #eventos;

  constructor({ usuarioRepository, eventBus }) {
    this.#usuarios = usuarioRepository;
    this.#eventos = eventBus;
  }

  #exigir(actor) {
    if (!actor.puede(PERMISOS.USUARIOS_ADMINISTRAR)) throw new ProhibidoError();
  }

  async #propio(actor, id) {
    const usuario = await this.#usuarios.porId(Number(id));
    if (!usuario || usuario.pymeId !== actor.pymeId) throw new NoEncontradoError('El usuario');
    return usuario;
  }

  listar(actor) {
    this.#exigir(actor);
    return this.#usuarios.listar(actor.pymeId);
  }

  /** Colaboradores activos (para asignar responsables); lo usa cualquier rol con panel. */
  responsables(actor) {
    return this.#usuarios.listarActivos(actor.pymeId);
  }

  async obtener(actor, id) {
    this.#exigir(actor);
    return this.#propio(actor, id);
  }

  async crear(actor, datos, ip) {
    this.#exigir(actor);
    const username = String(datos.username || '').trim().toLowerCase();
    const correo = String(datos.correo || '').trim().toLowerCase();
    const duplicado = await this.#usuarios.existe({ username, correo });
    const errores = {};
    if (duplicado.username) errores.username = 'Ese nombre de usuario ya está en uso.';
    if (duplicado.correo) errores.correo = 'Ese correo ya está registrado.';
    if (Object.keys(errores).length) throw new ValidacionError(errores);

    const usuario = await Usuario.crear({ ...datos, pymeId: actor.pymeId });
    await this.#usuarios.insertar(usuario);
    await this.#eventos.publicar('usuario.creado', {
      usuarioId: actor.id, ip, entidad: 'usuario', entidadId: usuario.id, detalle: { username: usuario.username, rol: usuario.rol.nombre },
    });
    return usuario;
  }

  async actualizar(actor, id, datos, ip) {
    this.#exigir(actor);
    const usuario = await this.#propio(actor, id);
    Usuario.validarDatos({ ...usuario.toJSON(), ...datos }, { nuevo: false });

    const correo = String(datos.correo ?? usuario.correo).trim().toLowerCase();
    if ((await this.#usuarios.existe({ correo }, usuario.id)).correo) {
      throw new ValidacionError({ correo: 'Ese correo ya está registrado.' });
    }
    const activo = datos.activo === undefined ? usuario.activo : datos.activo === true || datos.activo === 'true' || datos.activo === 'on';

    // Un administrador no puede quitarse a sí mismo el rol ni desactivarse:
    // la empresa se quedaría sin quien administre.
    if (usuario.id === actor.id && (datos.rol && datos.rol !== 'administrador' || !activo)) {
      throw new ConflictoError('No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.');
    }

    usuario.actualizarDatos({ nombre: datos.nombre, correo, rol: datos.rol, activo });
    if (datos.password) await usuario.cambiarPassword(datos.password);
    await this.#usuarios.actualizar(usuario);
    if (datos.desbloquear) await this.#usuarios.desbloquear(usuario.id);
    await this.#eventos.publicar('usuario.actualizado', {
      usuarioId: actor.id, ip, entidad: 'usuario', entidadId: usuario.id,
      detalle: { rol: usuario.rol.nombre, activo: usuario.activo, contrasenaRestablecida: Boolean(datos.password) },
    });
    return usuario;
  }
}

module.exports = UsuarioService;
