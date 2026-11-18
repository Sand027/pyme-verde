'use strict';

const BaseRepository = require('./BaseRepository');
const Usuario = require('../models/Usuario');

class UsuarioRepository extends BaseRepository {
  constructor() {
    super('usuario');
  }

  mapear(f) {
    return new Usuario({
      id: f.id,
      pymeId: f.pyme_id,
      nombre: f.nombre,
      username: f.username,
      correo: f.correo,
      passwordHash: f.password_hash,
      rol: f.rol,
      activo: f.activo,
      intentosFallidos: f.intentos_fallidos,
      bloqueadoHasta: f.bloqueado_hasta,
      ultimoAcceso: f.ultimo_acceso,
    });
  }

  porId(id) {
    return this.uno('SELECT * FROM usuario WHERE id = $1', [id]);
  }

  porUsername(username) {
    return this.uno('SELECT * FROM usuario WHERE username = $1', [String(username).trim().toLowerCase()]);
  }

  listar(pymeId) {
    return this.varios('SELECT * FROM usuario WHERE pyme_id = $1 ORDER BY activo DESC, nombre', [pymeId]);
  }

  listarActivos(pymeId) {
    return this.varios('SELECT * FROM usuario WHERE pyme_id = $1 AND activo ORDER BY nombre', [pymeId]);
  }

  async existe({ username, correo }, excluirId = null) {
    const { rows } = await this.consultar(
      `SELECT username, correo FROM usuario
       WHERE (username = $1 OR correo = $2) AND ($3::int IS NULL OR id <> $3)`,
      [username || '', correo || '', excluirId],
    );
    return {
      username: rows.some((r) => r.username === username),
      correo: rows.some((r) => r.correo === correo),
    };
  }

  async insertar(usuario, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO usuario (pyme_id, nombre, username, correo, password_hash, rol, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [usuario.pymeId, usuario.nombre, usuario.username, usuario.correo, usuario.hashParaPersistir(), usuario.rol.nombre, usuario.activo],
      cliente,
    );
    usuario.asignarId(rows[0].id);
    return usuario;
  }

  async actualizar(usuario) {
    await this.consultar(
      `UPDATE usuario SET nombre = $2, correo = $3, rol = $4, activo = $5, password_hash = $6, actualizado_en = now()
       WHERE id = $1`,
      [usuario.id, usuario.nombre, usuario.correo, usuario.rol.nombre, usuario.activo, usuario.hashParaPersistir()],
    );
    return usuario;
  }

  async registrarIntentoFallido(id, maxIntentos, minutosBloqueo) {
    const { rows } = await this.consultar(
      `UPDATE usuario
         SET intentos_fallidos = intentos_fallidos + 1,
             bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= $2
                                    THEN now() + make_interval(mins => $3) ELSE bloqueado_hasta END
       WHERE id = $1
       RETURNING intentos_fallidos, bloqueado_hasta`,
      [id, maxIntentos, minutosBloqueo],
    );
    return rows[0];
  }

  async registrarAccesoExitoso(id) {
    await this.consultar(
      'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() WHERE id = $1', [id],
    );
  }

  async desbloquear(id) {
    await this.consultar('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [id]);
  }
}

module.exports = UsuarioRepository;
