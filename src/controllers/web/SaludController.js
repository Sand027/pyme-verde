'use strict';

const Database = require('../../config/database');

/** Verificación de salud para el proveedor de hospedaje (comprueba la base). */
async function verificar(req, res) {
  try {
    await Database.getInstance().query('SELECT 1');
    res.json({ estado: 'ok' });
  } catch {
    res.status(503).json({ estado: 'sin_base_de_datos' });
  }
}

module.exports = { verificar };
