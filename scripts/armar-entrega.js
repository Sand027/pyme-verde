'use strict';

/**
 * Arma la carpeta de entrega para la docente en entrega-privada/PyME-Verde_Entrega
 * (fuera del repositorio, porque el bloc de notas lleva las contraseñas de prueba):
 *
 *   Acceso-y-credenciales.txt        URL, usuarios y contraseñas (de .env)
 *   Rubrica/                         rúbrica con evidencias
 *   Documentacion/                   documentación técnica, manual, reporte, credenciales
 *   base-de-datos/pyme_verde.sql     estructura y datos, más instrucciones
 *   codigo-fuente/                   archivos del sistema (sin node_modules ni .env)
 *   Guion-del-video.txt
 *
 * y la comprime en entrega-privada/PyME-Verde_Entrega.zip.
 * Uso: npm run entrega   (con la base local corriendo para exportarla)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const PRIV = path.join(RAIZ, 'entrega-privada');
const DEST = path.join(PRIV, 'PyME-Verde_Entrega');
const SITIO = 'https://pyme-verde.onrender.com';

function leerEnv() {
  return Object.fromEntries(fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
}

const copiar = (de, a) => { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.copyFileSync(de, a); };

function main() {
  const env = leerEnv();
  if (!env.SEED_ADMIN_PASSWORD || !env.SEED_COLABORADOR_PASSWORD) throw new Error('Faltan las contraseñas de prueba en .env');
  fs.rmSync(DEST, { recursive: true, force: true });
  fs.mkdirSync(DEST, { recursive: true });

  // Bloc de notas (CRLF para que el Bloc de notas de Windows lo muestre bien).
  const txt = [
    'PyME Verde - Acceso para la revisión',
    'Proyecto final de Programación Web, AGO-DIC 2026. Equipo: Oscar y Gonzalo Josue.',
    '',
    `URL del sitio:        ${SITIO}`,
    `Inicio de sesión:     ${SITIO}/login`,
    `Documentación API:    ${SITIO}/api/docs`,
    'Código fuente:        https://github.com/Sand027/pyme-verde',
    '',
    'USUARIO ADMINISTRADOR',
    '  Usuario:     admin.demo',
    `  Contraseña:  ${env.SEED_ADMIN_PASSWORD}`,
    '  Permite: todo el sistema (registros, plan de acciones, reportes, usuarios,',
    '           configuración y bitácora).',
    '',
    'USUARIO NORMAL (COLABORADOR)',
    '  Usuario:     colaborador.demo',
    `  Contraseña:  ${env.SEED_COLABORADOR_PASSWORD}`,
    '  Permite: registrar datos, editar sus registros, residuos, calculadora y',
    '           seguimiento de sus acciones. Las páginas de administración responden',
    '           "Acceso restringido".',
    '',
    'NOTAS',
    '- El servidor gratuito se suspende sin visitas: la primera carga puede tardar',
    '  cerca de un minuto.',
    '- Cinco contraseñas equivocadas seguidas bloquean la cuenta 15 minutos; la otra',
    '  cuenta sigue disponible.',
    '- Son cuentas creadas solo para la revisión; no son contraseñas personales.',
    '- Los datos del sistema son de demostración.',
    '',
  ].join('\r\n');
  fs.writeFileSync(path.join(DEST, 'Acceso-y-credenciales.txt'), txt);

  // Documentos.
  const docs = path.join(RAIZ, 'docs');
  copiar(path.join(docs, 'PyME-Verde_Rubrica-con-evidencias.docx'), path.join(DEST, 'Rubrica', 'PyME-Verde_Rubrica-con-evidencias.docx'));
  for (const f of ['PyME-Verde_Documentacion-tecnica.docx', 'PyME-Verde_Manual-de-usuario.docx', 'PyME-Verde_Reporte-tecnico.docx']) {
    copiar(path.join(docs, f), path.join(DEST, 'Documentacion', f));
  }
  copiar(path.join(PRIV, 'Credenciales_de_prueba.docx'), path.join(DEST, 'Documentacion', 'Credenciales_de_prueba.docx'));
  copiar(path.join(docs, 'Guion-del-video.txt'), path.join(DEST, 'Guion-del-video.txt'));

  // Base de datos.
  const bd = path.join(DEST, 'base-de-datos');
  execFileSync(process.execPath, [path.join(__dirname, 'exportar-bd.js'), path.join(bd, 'pyme_verde.sql')], { stdio: 'inherit' });
  copiar(path.join(RAIZ, 'src', 'db', 'schema.sql'), path.join(bd, 'schema.sql'));
  fs.writeFileSync(path.join(bd, 'LEEME.txt'), [
    'Base de datos de PyME Verde (PostgreSQL 14 o superior)',
    '',
    'pyme_verde.sql  Estructura y datos de demostración de las nueve tablas.',
    'schema.sql      Solo la estructura.',
    '',
    'Importar:',
    '  createdb pyme_verde',
    '  psql -d pyme_verde -f pyme_verde.sql',
    '',
    'También se puede dejar que la aplicación cree las tablas y cargue los datos:',
    '  npm run db:seed   (ver codigo-fuente/README.md)',
    '',
  ].join('\r\n'));

  // Código fuente: archivos versionados y nuevos que no ignora .gitignore.
  const lista = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: RAIZ }).toString().split('\0').filter(Boolean);
  for (const rel of lista) {
    const de = path.join(RAIZ, rel);
    if (fs.existsSync(de)) copiar(de, path.join(DEST, 'codigo-fuente', rel));
  }

  // ZIP con la herramienta de Windows.
  const zip = path.join(PRIV, 'PyME-Verde_Entrega.zip');
  fs.rmSync(zip, { force: true });
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${DEST}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
  console.log(`Carpeta: ${DEST}\nZIP: ${zip} (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB, ${lista.length} archivos de código)`);
}

main();
