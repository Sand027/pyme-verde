'use strict';

/**
 * Crea las tablas del esquema. Con --reset las elimina antes.
 * Uso: node src/db/migrate.js [--reset]
 */
const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

const TABLAS = ['bitacora', 'evidencia', 'accion', 'indicador', 'registro', 'parametro', 'categoria', 'usuario', 'pyme', '"session"'];

async function migrar({ reset = false } = {}) {
  const db = Database.getInstance();
  if (reset) {
    await db.query(`DROP TABLE IF EXISTS ${TABLAS.join(', ')} CASCADE`);
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(sql);
}

module.exports = { migrar };

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  migrar({ reset })
    .then(() => {
      console.log(reset ? 'Esquema recreado.' : 'Esquema actualizado.');
      return Database.getInstance().cerrar();
    })
    .catch((err) => {
      console.error('Error al migrar:', err.message);
      process.exit(1);
    });
}
