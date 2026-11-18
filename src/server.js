'use strict';

const env = require('./config/env');
const { crearApp } = require('./app');
const { migrar } = require('./db/migrate');
const { sembrar } = require('./db/seed');
const Database = require('./config/database');

async function iniciar() {
  // Crea las tablas que falten (idempotente) antes de aceptar peticiones.
  await migrar();
  if (env.AUTO_SEED) {
    // Solo carga datos si la base está vacía; nunca borra nada.
    const r = await sembrar();
    if (r) console.log(r.generadas
      ? 'Caso de demostración cargado con contraseñas aleatorias: define SEED_ADMIN_PASSWORD y SEED_COLABORADOR_PASSWORD y recarga con db:reset.'
      : 'Caso de demostración cargado con las contraseñas de SEED_*.');
  }
  const app = crearApp();
  const servidor = app.listen(env.PORT, () => {
    console.log(`PyME Verde escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const cerrar = () => {
    servidor.close(async () => {
      await Database.getInstance().cerrar();
      process.exit(0);
    });
  };
  process.on('SIGTERM', cerrar);
  process.on('SIGINT', cerrar);
}

iniciar().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
