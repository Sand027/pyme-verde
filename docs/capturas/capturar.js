'use strict';

/**
 * Toma las capturas de pantalla del manual de usuario contra el servidor local.
 * Inicia sesión con las cuentas de prueba leyendo las contraseñas de .env (no las imprime).
 * Uso: node docs/capturas/capturar.js <ruta a puppeteer-core> [http://localhost:3000]
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const OUT = __dirname;
const B = process.argv[3] || 'http://localhost:3000';
const env = Object.fromEntries(fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function entrar(pagina, usuario, clave) {
  await pagina.goto(`${B}/login`, { waitUntil: 'networkidle0' });
  await pagina.type('#f-usuario', usuario);
  await pagina.type('#f-pass', clave);
  await Promise.all([pagina.waitForNavigation({ waitUntil: 'networkidle0' }), pagina.click('button[type=submit]')]);
}

async function foto(pagina, nombre, url, { antes, completa = false, alto } = {}) {
  if (url) await pagina.goto(`${B}${url}`, { waitUntil: 'networkidle0' });
  // sin animaciones de entrada ni avisos temporales en la captura
  await pagina.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important} .ap-toast{display:none!important}' });
  if (antes) await antes(pagina);
  await espera(500);
  const opciones = { path: path.join(OUT, `${nombre}.png`), fullPage: completa };
  if (alto) opciones.clip = { x: 0, y: 0, width: pagina.viewport().width, height: alto };
  await pagina.screenshot(opciones);
  console.log(nombre);
}

const clicEnTexto = (texto) => async (p) => {
  await p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); b?.click(); }, texto);
  await espera(600);
};

async function main() {
  const puppeteer = require(process.argv[2] || 'puppeteer-core');
  const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });

  // Visitante (escritorio)
  let ctx = await navegador.createBrowserContext();
  let p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 820, deviceScaleFactor: 1.5 });
  await foto(p, '01-inicio', '/');
  await foto(p, '02-indicadores-publicos', '/#indicadores', { antes: async (q) => { await q.evaluate(() => document.querySelector('#indicadores')?.scrollIntoView()); await espera(900); } });
  await foto(p, '03-login', '/login');
  await foto(p, '04-documentacion-api', '/api/docs');

  // Administrador
  await entrar(p, 'admin.demo', env.SEED_ADMIN_PASSWORD);
  await foto(p, '05-tablero', '/panel');
  await foto(p, '06-tablero-grafica', null, { antes: async (q) => { await q.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent.includes('Seis meses'))?.scrollIntoView({ block: 'center' })); await espera(600); } });
  await foto(p, '07-registros', '/panel/registros');
  await foto(p, '08-registro-nuevo', '/panel/registros?nuevo=1', { antes: async () => espera(700) });
  await foto(p, '09-registro-validacion', '/panel/registros?nuevo=1', {
    antes: async (q) => {
      await espera(500);
      await q.evaluate(() => { const f = document.querySelector('.ap-panel form'); f.querySelector('button[type=submit]').click(); });
      await espera(500);
    },
  });
  await foto(p, '10-residuos', '/panel/residuos');
  await foto(p, '11-calculadora', '/panel/calculadora');
  await foto(p, '12-acciones', '/panel/acciones');
  await foto(p, '13-accion-detalle', '/panel/acciones', { antes: clicEnTexto('Editar') });
  await foto(p, '14-reportes', '/panel/reportes');
  await foto(p, '15-reporte-imprimible', '/panel/reportes/imprimir');
  await foto(p, '16-usuarios', '/admin/usuarios');
  await foto(p, '17-configuracion-metas', '/admin/configuracion?seccion=metas');
  await foto(p, '18-bitacora', '/admin/bitacora');
  await foto(p, '19-perfil', '/perfil');
  await ctx.close();

  // Colaborador
  ctx = await navegador.createBrowserContext();
  p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 820, deviceScaleFactor: 1.5 });
  await entrar(p, 'colaborador.demo', env.SEED_COLABORADOR_PASSWORD);
  await foto(p, '20-colaborador-tablero', '/panel');
  await foto(p, '21-colaborador-accion', '/panel/acciones', { antes: async (q) => { await q.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('Abrir Optimizar'))?.click()); await espera(600); } });
  await foto(p, '22-colaborador-sin-permiso', '/admin/usuarios');
  // Teléfono
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await foto(p, '23-movil-registros', '/panel/registros');
  await foto(p, '24-movil-menu', '/panel', { antes: async (q) => { await q.click('[data-menu-abrir]'); await espera(500); } });
  await ctx.close();

  ctx = await navegador.createBrowserContext();
  p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await foto(p, '25-movil-inicio', '/');
  await navegador.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
