'use strict';

const fs = require('fs');
const path = require('path');
const { D, RAIZ, COLOR, p, h2, vinetas, tabla, espacio, nota, documento } = require('./comun');

/** Lee las contraseñas de prueba de .env sin imprimirlas. */
function leerEnv() {
  const archivo = path.join(RAIZ, '.env');
  if (!fs.existsSync(archivo)) return {};
  return Object.fromEntries(fs.readFileSync(archivo, 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
}

module.exports = function credenciales() {
  const env = leerEnv();
  const admin = env.SEED_ADMIN_PASSWORD;
  const colab = env.SEED_COLABORADOR_PASSWORD;
  if (!admin || !colab) throw new Error('Faltan SEED_ADMIN_PASSWORD o SEED_COLABORADOR_PASSWORD en .env');

  return documento('Credenciales de prueba', [
    new D.Paragraph({ spacing: { before: 200, after: 120 }, children: [new D.TextRun({ text: 'PyME Verde', size: 48, bold: true, color: COLOR.verde })] }),
    new D.Paragraph({ spacing: { after: 300 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: COLOR.verde, space: 10 } }, children: [new D.TextRun({ text: 'Credenciales de prueba para la evaluación', size: 30, bold: true })] }),
    nota('**Documento confidencial.** Se entrega solo a la docente por un canal privado (plataforma institucional o correo institucional). No se publica, no se sube al repositorio y no contiene contraseñas personales de nadie: son cuentas creadas únicamente para revisar la aplicación.'),
    p('**Sitio:** https://______________________________.onrender.com'),
    p('**Inicio de sesión:** pulsar Iniciar sesión en la página principal, o abrir /login.'),
    espacio(),
    tabla(['Rol', 'Usuario', 'Contraseña', 'Qué permite revisar'], [
      ['Administrador', 'admin.demo', '`' + admin + '`', 'Todo el sistema: registros, plan de acciones, reportes, usuarios, configuración y bitácora.'],
      ['Colaborador', 'colaborador.demo', '`' + colab + '`', 'Registro de datos, edición de registros propios, residuos, calculadora y seguimiento de sus acciones. Las páginas de administración responden Acceso restringido.'],
      ['Visitante', 'No requiere cuenta', 'No aplica', 'Página de inicio, indicadores públicos y /api/docs.'],
    ], [1.6, 1.8, 2.2, 4.6], { tam: 19 }),
    espacio(),
    h2('Notas'),
    vinetas([
      'La cuenta se bloquea 15 minutos después de cinco contraseñas equivocadas seguidas. Si ocurre durante la revisión, la otra cuenta sigue disponible y el administrador puede asignar una contraseña nueva desde Usuarios.',
      'Las acciones asignadas a la cuenta pespunte.demo sirven para comprobar que colaborador.demo no puede modificar acciones de otra persona; esa cuenta no se usa para entrar.',
      'Los datos del sistema son de demostración.',
      'Después de la evaluación el equipo cambiará estas contraseñas o eliminará el servicio.',
    ]),
  ]);
};
