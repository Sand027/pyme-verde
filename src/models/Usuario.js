'use strict';

const bcrypt = require('bcryptjs');
const Entidad = require('./Entidad');
const { Rol } = require('./Rol');
const Validador = require('../utils/Validador');

const COSTO_HASH = 12;
const USERNAME_RE = /^[a-z0-9._-]{4,40}$/;

/**
 * Persona que usa el panel privado. El hash de la contraseña es privado:
 * no tiene getter y nunca aparece en toJSON().
 */
class Usuario extends Entidad {
  #pymeId;
  #nombre;
  #username;
  #correo;
  #passwordHash;
  #rol;
  #activo;
  #intentosFallidos;
  #bloqueadoHasta;
  #ultimoAcceso;

  constructor({ id = null, pymeId, nombre, username, correo, passwordHash, rol, activo = true,
    intentosFallidos = 0, bloqueadoHasta = null, ultimoAcceso = null }) {
    super(id);
    this.#pymeId = pymeId;
    this.#nombre = nombre;
    this.#username = username;
    this.#correo = correo;
    this.#passwordHash = passwordHash;
    this.#rol = rol instanceof Rol ? rol : Rol.desdeNombre(rol);
    this.#activo = Boolean(activo);
    this.#intentosFallidos = intentosFallidos;
    this.#bloqueadoHasta = bloqueadoHasta ? new Date(bloqueadoHasta) : null;
    this.#ultimoAcceso = ultimoAcceso ? new Date(ultimoAcceso) : null;
  }

  get pymeId() { return this.#pymeId; }
  get nombre() { return this.#nombre; }
  get username() { return this.#username; }
  get correo() { return this.#correo; }
  get rol() { return this.#rol; }
  get activo() { return this.#activo; }
  get intentosFallidos() { return this.#intentosFallidos; }
  get bloqueadoHasta() { return this.#bloqueadoHasta; }
  get ultimoAcceso() { return this.#ultimoAcceso; }

  /** Solo el repositorio necesita leer el hash para persistirlo. */
  hashParaPersistir() {
    return this.#passwordHash;
  }

  puede(permiso) {
    return this.#activo && this.#rol.puede(permiso);
  }

  esAdministrador() {
    return this.#rol === Rol.ADMINISTRADOR;
  }

  estaBloqueado(ahora = new Date()) {
    return this.#bloqueadoHasta !== null && this.#bloqueadoHasta > ahora;
  }

  async verificarPassword(plano) {
    if (typeof plano !== 'string' || plano.length === 0) return false;
    return bcrypt.compare(plano, this.#passwordHash);
  }

  async cambiarPassword(nueva) {
    Usuario.validarPassword(nueva);
    this.#passwordHash = await Usuario.hashear(nueva);
  }

  actualizarDatos({ nombre, correo, rol, activo }) {
    if (nombre !== undefined) this.#nombre = String(nombre).trim();
    if (correo !== undefined) this.#correo = String(correo).trim().toLowerCase();
    if (rol !== undefined) this.#rol = Rol.desdeNombre(rol);
    if (activo !== undefined) this.#activo = Boolean(activo);
  }

  static async hashear(plano) {
    return bcrypt.hash(plano, COSTO_HASH);
  }

  /** Política mínima: 10 caracteres con letras y números. */
  static validarPassword(plano, campo = 'password') {
    new Validador({ [campo]: plano })
      .requerido(campo, 'La contraseña')
      .regla(campo, typeof plano === 'string' && plano.length >= 10, 'La contraseña debe tener al menos 10 caracteres.')
      .regla(campo, /[A-Za-z]/.test(plano || '') && /\d/.test(plano || ''), 'La contraseña debe combinar letras y números.')
      .lanzarSiHayErrores();
  }

  static validarDatos(datos, { nuevo = true } = {}) {
    const v = new Validador(datos);
    v.requerido('nombre', 'El nombre').texto('nombre', 'El nombre', { min: 3, max: 120 })
      .requerido('correo', 'El correo').correo('correo', 'El correo')
      .requerido('rol', 'El rol').enLista('rol', 'El rol', Rol.NOMBRES);
    if (nuevo) {
      v.requerido('username', 'El usuario')
        .regla('username', USERNAME_RE.test(String(datos.username || '')),
          'El usuario admite de 4 a 40 caracteres: minúsculas, números, punto, guion o guion bajo.');
    }
    v.lanzarSiHayErrores();
  }

  static async crear({ pymeId, nombre, username, correo, password, rol }) {
    Usuario.validarDatos({ nombre, username, correo, rol });
    Usuario.validarPassword(password);
    return new Usuario({
      pymeId,
      nombre: nombre.trim(),
      username: username.trim().toLowerCase(),
      correo: correo.trim().toLowerCase(),
      passwordHash: await Usuario.hashear(password),
      rol,
    });
  }

  toJSON() {
    return {
      id: this.id,
      pymeId: this.#pymeId,
      nombre: this.#nombre,
      username: this.#username,
      correo: this.#correo,
      rol: this.#rol.nombre,
      rolEtiqueta: this.#rol.etiqueta,
      activo: this.#activo,
      ultimoAcceso: this.#ultimoAcceso,
    };
  }
}

module.exports = Usuario;
