'use strict';

/**
 * Levanta un PostgreSQL local para desarrollo sin instalar nada en el sistema.
 * Los datos viven fuera de OneDrive (en %LOCALAPPDATA% o ~/.local/share) para
 * que la sincronización no bloquee los archivos del servidor.
 *
 * Uso: npm run db:local   (deja el servidor corriendo; Ctrl+C para detenerlo)
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const EmbeddedPostgres = require('embedded-postgres').default;

const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
const dataDir = path.join(base, 'pyme-verde', 'pgdata');
const PORT = Number(process.env.LOCAL_DB_PORT) || 5433;

async function main() {
  const existe = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
    // UTF-8 explícito: en Windows initdb usaría WIN1252 y fallaría con acentos y símbolos.
    initdbFlags: ['--encoding=UTF8', '--locale=C', '--auth=scram-sha-256'],
  });

  if (!existe) {
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    await pg.initialise();
  }
  await pg.start();

  for (const nombre of ['pyme_verde', 'pyme_verde_test']) {
    try {
      await pg.createDatabase(nombre);
      console.log(`Base ${nombre} creada.`);
    } catch {
      // ya existía
    }
  }

  console.log(`PostgreSQL local listo en localhost:${PORT} (datos en ${dataDir}).`);
  console.log('Deja esta terminal abierta; Ctrl+C para detenerlo.');

  const detener = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', detener);
  process.on('SIGTERM', detener);
}

main().catch((err) => {
  console.error('No se pudo iniciar PostgreSQL local:', err);
  process.exit(1);
});
