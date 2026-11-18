'use strict';

const Database = require('../config/database');

/**
 * Patrón Repository (clase base).
 *
 * Problema que resuelve: centraliza el acceso a datos de cada entidad. Los
 * servicios piden y entregan objetos del dominio; nunca escriben SQL ni
 * conocen nombres de columnas. Toda consulta usa parámetros ($1, $2...) para
 * prevenir inyección SQL. Las vistas y controladores no acceden a la base.
 */
class BaseRepository {
  #tabla;

  constructor(tabla) {
    if (new.target === BaseRepository) throw new TypeError('BaseRepository es abstracta.');
    this.#tabla = tabla;
  }

  get tabla() {
    return this.#tabla;
  }

  get db() {
    return Database.getInstance();
  }

  /** Convierte una fila en objeto del dominio. */
  mapear() {
    throw new Error(`${this.constructor.name} debe implementar mapear(fila).`);
  }

  /** Ejecuta en el cliente de una transacción si se proporciona. */
  async consultar(sql, parametros = [], cliente = null) {
    const ejecutor = cliente || this.db;
    const { rows, rowCount } = await ejecutor.query(sql, parametros);
    return { rows, rowCount };
  }

  async uno(sql, parametros = [], cliente = null) {
    const { rows } = await this.consultar(sql, parametros, cliente);
    return rows[0] ? this.mapear(rows[0]) : null;
  }

  async varios(sql, parametros = [], cliente = null) {
    const { rows } = await this.consultar(sql, parametros, cliente);
    return rows.map((f) => this.mapear(f));
  }

  /** Elimina por id dentro de la empresa. Devuelve true si existía. */
  async eliminar(id, pymeId, cliente = null) {
    const { rowCount } = await this.consultar(
      `DELETE FROM ${this.#tabla} WHERE id = $1 AND pyme_id = $2`, [id, pymeId], cliente,
    );
    return rowCount > 0;
  }

  async contar(pymeId) {
    const { rows } = await this.consultar(`SELECT COUNT(*)::int AS n FROM ${this.#tabla} WHERE pyme_id = $1`, [pymeId]);
    return rows[0].n;
  }
}

module.exports = BaseRepository;
