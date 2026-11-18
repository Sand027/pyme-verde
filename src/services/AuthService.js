'use strict';

const bcrypt = require('bcryptjs');
const env = require('../config/env');
const Usuario = require('../models/Usuario');
const { NoAutenticadoError, ValidacionError, AppError } = require('../utils/errores');
const Validador = require('../utils/Validador');

// Hash de referencia para igualar el tiempo de respuesta cuando el usuario no
// existe (evita deducir qué cuentas existen midiendo el tiempo).
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia-para-tiempo-constante', 12);

class AuthService {
  #usuarios;
  #eventos;

  constructor({ usuarioRepository, eventBus }) {
    this.#usuarios = usuarioRepository;
    this.#eventos = eventBus;
  }

  /**
   * Verifica credenciales. Bloquea la cuenta 15 minutos después de 5 intentos
   * fallidos seguidos.
   * @returns {Promise<Usuario>}
   */
  async autenticar(username, password, ip) {
    new Validador({ username, password })
      .requerido('username', 'El usuario').requerido('password', 'La contraseña')
      .lanzarSiHayErrores('Escribe tu usuario y tu contraseña.');

    const usuario = await this.#usuarios.porUsername(username);
    if (!usuario) {
      await bcrypt.compare(password, HASH_FICTICIO);
      await this.#eventos.publicar('sesion.fallida', { ip, detalle: { username: String(username).slice(0, 40), motivo: 'usuario' } });
      throw new NoAutenticadoError('Usuario o contraseña incorrectos.');
    }

    if (usuario.estaBloqueado()) {
      const minutos = Math.ceil((usuario.bloqueadoHasta - new Date()) / 60000);
      await this.#eventos.publicar('sesion.bloqueada', { usuarioId: usuario.id, ip });
      throw new AppError(`La cuenta está bloqueada por intentos fallidos. Intenta de nuevo en ${minutos} min.`, 423, 'CUENTA_BLOQUEADA');
    }

    const correcta = await usuario.verificarPassword(password);
    if (!correcta || !usuario.activo) {
      if (!correcta) {
        await this.#usuarios.registrarIntentoFallido(usuario.id, env.LOGIN_MAX_INTENTOS, env.LOGIN_BLOQUEO_MIN);
      }
      await this.#eventos.publicar('sesion.fallida', {
        usuarioId: usuario.id, ip, detalle: { motivo: correcta ? 'inactivo' : 'contrasena' },
      });
      throw new NoAutenticadoError('Usuario o contraseña incorrectos.');
    }

    await this.#usuarios.registrarAccesoExitoso(usuario.id);
    await this.#eventos.publicar('sesion.iniciada', { usuarioId: usuario.id, ip });
    return usuario;
  }

  /** Recupera al usuario de la sesión; null si ya no existe o se desactivó. */
  async usuarioDeSesion(usuarioId) {
    if (!usuarioId) return null;
    const usuario = await this.#usuarios.porId(usuarioId);
    return usuario && usuario.activo ? usuario : null;
  }

  async cambiarPassword(usuario, { actual, nueva, confirmacion }, ip) {
    new Validador({ actual, nueva, confirmacion })
      .requerido('actual', 'La contraseña actual')
      .requerido('nueva', 'La contraseña nueva')
      .requerido('confirmacion', 'La confirmación')
      .regla('confirmacion', nueva === confirmacion, 'La confirmación no coincide con la contraseña nueva.')
      .regla('nueva', !actual || nueva !== actual, 'La contraseña nueva debe ser distinta de la actual.')
      .lanzarSiHayErrores();
    Usuario.validarPassword(nueva, 'nueva');

    if (!(await usuario.verificarPassword(actual))) {
      throw new ValidacionError({ actual: 'La contraseña actual no es correcta.' });
    }
    await usuario.cambiarPassword(nueva);
    await this.#usuarios.actualizar(usuario);
    await this.#eventos.publicar('usuario.contrasena_cambiada', { usuarioId: usuario.id, ip, entidad: 'usuario', entidadId: usuario.id });
  }
}

module.exports = AuthService;
