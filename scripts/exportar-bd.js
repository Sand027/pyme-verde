'use strict';

/**
 * Exporta la base de datos a un archivo .sql que se puede importar en cualquier
 * PostgreSQL 14+ con: psql -d <base vacía> -f pyme_verde.sql
 *
 * Incluye la estructura (src/db/schema.sql) y los datos de las nueve tablas de
 * dominio en orden de dependencias. No exporta la tabla session (sesiones activas).
 * No necesita pg_dump: lee las filas con el controlador pg.
 *
 * Uso: npm run db:export [ruta de salida]   (por omisión, base-de-datos/pyme_verde.sql)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../src/config/env');

const TABLAS = ['pyme', 'usuario', 'categoria', 'registro', 'indicador', 'accion', 'evidencia', 'parametro', 'bitacora'];

function literal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const salida = path.resolve(process.argv[2] || path.join(__dirname, '..', 'base-de-datos', 'pyme_verde.sql'));
  const cliente = new Client({ connectionString: env.DATABASE_URL, ssl: env.DB_SSL ? { rejectUnauthorized: true } : false });
  await cliente.connect();
  // Las fechas tipo date se leen como texto para no moverlas de día por la zona horaria.
  cliente.setTypeParser(1082, (t) => t);

  const partes = [
    '-- PyME Verde: exportación de la base de datos (estructura y datos)',
    `-- Generado: ${new Date().toISOString()}`,
    '-- Los datos son de DEMOSTRACIÓN: no son mediciones reales del taller.',
    '-- Las contraseñas de usuario están guardadas solo como hash bcrypt.',
    '-- Importar en una base vacía: psql -d pyme_verde -f pyme_verde.sql',
    '',
    'BEGIN;',
    '',
    fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'),
    '',
  ];

  for (const tabla of TABLAS) {
    const { rows, fields } = await cliente.query(`SELECT * FROM ${tabla} ORDER BY id`);
    partes.push(`-- ${tabla}: ${rows.length} filas`);
    if (rows.length) {
      const cols = fields.map((f) => f.name);
      for (const fila of rows) {
        partes.push(`INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map((c) => literal(fila[c])).join(', ')});`);
      }
      partes.push(`SELECT setval(pg_get_serial_sequence('${tabla}', 'id'), (SELECT MAX(id) FROM ${tabla}));`);
    }
    partes.push('');
  }
  partes.push('COMMIT;', '');
  await cliente.end();

  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, partes.join('\n'));
  console.log(`Base exportada en ${salida}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
