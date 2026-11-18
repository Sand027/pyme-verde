'use strict';

const { Pool, types } = require('pg');
const env = require('./env');

// NUMERIC llega como texto desde pg: se convierte a número para los cálculos.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// INT8 (COUNT, BIGSERIAL) a número; los conteos de este sistema caben en un Number.
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
// DATE se conserva como 'AAAA-MM-DD' para evitar corrimientos por zona horaria.
types.setTypeParser(1082, (v) => v);

/**
 * Patrón Singleton.
 * Garantiza un único pool de conexiones a PostgreSQL para toda la aplicación.
 * Los repositorios obtienen la instancia con Database.getInstance() y nunca
 * crean conexiones propias.
 */
class Database {
  static #instancia = null;
  static #creando = false;
  #pool;

  constructor() {
    if (!Database.#creando) {
      throw new Error('Usa Database.getInstance(); el constructor es privado.');
    }
    this.#pool = new Pool({
      connectionString: env.DATABASE_URL,
      // Con SSL se verifica el certificado del servidor (Neon usa uno público).
      ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
      max: env.isProd ? 5 : 10,
      idleTimeoutMillis: 30000,
    });
    this.#pool.on('error', (err) => {
      console.error('[db] error en un cliente inactivo:', err.message);
    });
  }

  static getInstance() {
    if (!Database.#instancia) {
      Database.#creando = true;
      Database.#instancia = new Database();
      Database.#creando = false;
    }
    return Database.#instancia;
  }

  get pool() {
    return this.#pool;
  }

  /** Ejecuta una consulta parametrizada ($1, $2, ...). */
  query(texto, parametros = []) {
    return this.#pool.query(texto, parametros);
  }

  /**
   * Ejecuta varias operaciones en una transacción.
   * @param {(cliente: import('pg').PoolClient) => Promise<T>} trabajo
   * @returns {Promise<T>}
   * @template T
   */
  async transaccion(trabajo) {
    const cliente = await this.#pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
  }

  async cerrar() {
    await this.#pool.end();
    Database.#instancia = null;
  }
}

module.exports = Database;
