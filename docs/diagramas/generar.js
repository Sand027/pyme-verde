'use strict';

/**
 * Genera los diagramas de la documentación (SVG) y los exporta a PNG con Chrome.
 * Uso: node docs/diagramas/generar.js <ruta a puppeteer-core> [ruta a chrome.exe]
 * Los SVG quedan en docs/diagramas/*.svg y los PNG en docs/diagramas/png/.
 */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const C = {
  tinta: '#2b241e', suave: '#6b5f55', linea: '#8a7d71', fondo: '#ffffff',
  caja: '#f6f1ea', cab: '#e9dfd2', acento: '#a4472a', acentoSuave: '#f3dfd6', verde: '#3f6b4c', verdeSuave: '#e3ede4',
  azul: '#355c7d', azulSuave: '#e2eaf1',
};
const FUENTE = 'Arial, Helvetica, sans-serif';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const anchoTexto = (s, t = 13) => String(s).length * t * 0.56;

/* ------------------------------------------------------------ primitivas */
class Lienzo {
  constructor(w, h) { this.w = w; this.h = h; this.capas = { fondo: [], lineas: [], cajas: [], textos: [] }; }
  add(capa, s) { this.capas[capa].push(s); }
  texto(x, y, s, { t = 13, peso = 400, color = C.tinta, ancla = 'start', estilo = 'normal', capa = 'textos', halo = false } = {}) {
    this.add(capa, `<text x="${x}" y="${y}" font-family="${FUENTE}" font-size="${t}" font-weight="${peso}" font-style="${estilo}" fill="${color}" ${halo ? 'stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round"' : ''} text-anchor="${ancla}">${esc(s)}</text>`);
  }
  rect(x, y, w, h, { relleno = C.caja, borde = C.tinta, r = 0, grosor = 1.2, guion = '', capa = 'cajas' } = {}) {
    this.add(capa, `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${relleno}" stroke="${borde}" stroke-width="${grosor}" ${guion ? `stroke-dasharray="${guion}"` : ''}/>`);
  }
  linea(pts, { color = C.linea, grosor = 1.4, guion = '', fin = '', inicio = '' } = {}) {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    this.add('lineas', `<path d="${d}" fill="none" stroke="${color}" stroke-width="${grosor}" ${guion ? `stroke-dasharray="${guion}"` : ''} ${fin ? `marker-end="url(#${fin})"` : ''} ${inicio ? `marker-start="url(#${inicio})"` : ''}/>`);
  }
  svg() {
    const defs = `<defs>
      <marker id="flecha" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.linea}"/></marker>
      <marker id="abierta" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="${C.linea}" stroke-width="1.4"/></marker>
      <marker id="herencia" viewBox="0 0 14 14" refX="14" refY="7" markerWidth="14" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0 L14,7 L0,14 z" fill="#fff" stroke="${C.tinta}" stroke-width="1.3"/></marker>
      <marker id="rombo" viewBox="0 0 16 10" refX="16" refY="5" markerWidth="16" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,5 L8,0 L16,5 L8,10 z" fill="${C.tinta}"/></marker>
    </defs>`;
    const cuerpo = ['fondo', 'lineas', 'cajas', 'textos'].map((k) => this.capas[k].join('\n')).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">${defs}<rect width="100%" height="100%" fill="${C.fondo}"/>${cuerpo}</svg>`;
  }
}

/** Caja de clase UML: nombre (con estereotipo), atributos y métodos. Devuelve sus bordes. */
function clase(L, x, y, w, nombre, atributos = [], metodos = [], { estereotipo = '', relleno = C.caja, cab = C.cab, abstracta = false, tNombre = 14 } = {}) {
  const lh = 17;
  const hCab = estereotipo ? 40 : 28;
  const hAt = atributos.length ? atributos.length * lh + 10 : 8;
  const hMe = metodos.length ? metodos.length * lh + 10 : 8;
  const h = hCab + hAt + hMe;
  L.rect(x, y, w, h, { relleno });
  L.rect(x, y, w, hCab, { relleno: cab });
  if (estereotipo) L.texto(x + w / 2, y + 15, `«${estereotipo}»`, { t: 11, ancla: 'middle', color: C.suave });
  L.texto(x + w / 2, y + (estereotipo ? 32 : 19), nombre, { t: tNombre, peso: 700, ancla: 'middle', estilo: abstracta ? 'italic' : 'normal' });
  let yy = y + hCab + 16;
  for (const a of atributos) { L.texto(x + 8, yy, a, { t: 12 }); yy += lh; }
  L.linea([[x, y + hCab + hAt], [x + w, y + hCab + hAt]], { color: C.tinta, grosor: 1 });
  yy = y + hCab + hAt + 16;
  for (const m of metodos) { L.texto(x + 8, yy, m, { t: 12 }); yy += lh; }
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, b: y + h, r: x + w };
}

/** Herencia con bus: varios hijos hacia un padre, un solo triángulo. */
function bus(L, padre, hijos, yBus, lado = 'abajo') {
  const yPadre = lado === 'abajo' ? padre.b : padre.y;
  L.linea([[padre.cx, yBus], [padre.cx, yPadre]], { color: C.tinta, fin: 'herencia' });
  const xs = hijos.map((h) => h.cx).concat(padre.cx);
  L.linea([[Math.min(...xs), yBus], [Math.max(...xs), yBus]], { color: C.tinta });
  for (const h of hijos) L.linea([[h.cx, lado === 'abajo' ? h.y : h.b], [h.cx, yBus]], { color: C.tinta });
}

function etiqueta(L, x, y, s, opts = {}) {
  L.texto(x, y, s, { t: 12, ancla: 'middle', color: C.suave, halo: true, ...opts });
}

/* ------------------------------------------------------------ 1. arquitectura en capas */
function arquitectura() {
  const L = new Lienzo(1000, 700);
  L.texto(30, 36, 'Arquitectura en capas con MVC', { t: 20, peso: 700 });
  L.texto(30, 58, 'Cada capa solo llama a la de abajo. Las vistas reciben datos ya preparados y nunca consultan la base.', { t: 13, color: C.suave });
  const capas = [
    { n: 'Capa de presentación (Vista)', c: C.azulSuave, b: C.azul, items: ['Vistas EJS  src/views', 'CSS responsivo  public/css', 'JavaScript del DOM  public/js'] },
    { n: 'Capa de aplicación (Controlador)', c: C.acentoSuave, b: C.acento, items: ['Rutas web y API  src/routes', 'Middleware: sesión, CSRF, roles, seguridad', 'Controladores web y API REST'] },
    { n: 'Capa de negocio (Modelo)', c: C.verdeSuave, b: C.verde, items: ['Servicios  src/services', 'Modelos de dominio  src/models', 'Strategy, Factory, Observer'] },
    { n: 'Capa de persistencia', c: '#efe9e1', b: C.suave, items: ['Repositorios  src/repositories', 'Database (Singleton, pool pg)', 'PostgreSQL: consultas $1, $2…'] },
  ];
  let y = 84;
  for (const [i, k] of capas.entries()) {
    L.rect(30, y, 940, 120, { relleno: k.c, borde: k.b, r: 10, grosor: 1.6 });
    L.texto(50, y + 28, k.n, { t: 15, peso: 700, color: k.b });
    k.items.forEach((t, j) => {
      const x = 50 + j * 305;
      L.rect(x, y + 44, 285, 56, { relleno: '#fff', borde: k.b, r: 8 });
      L.texto(x + 142, y + 77, t, { t: 13, ancla: 'middle' });
    });
    if (i < capas.length - 1) L.linea([[500, y + 120], [500, y + 150]], { color: C.tinta, grosor: 1.6, fin: 'flecha' });
    y += 150;
  }
  L.texto(30, 690, 'Flujo de una petición: navegador → ruta → middleware → controlador → servicio → modelo/patrón → repositorio → PostgreSQL, y la respuesta (HTML o JSON) de regreso.', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 2. despliegue */
function despliegue() {
  const L = new Lienzo(1000, 470);
  L.texto(30, 36, 'Diagrama de despliegue', { t: 20, peso: 700 });
  const nodo = (x, y, w, h, titulo, est, lineas, color) => {
    L.rect(x + 8, y - 8, w, h, { relleno: '#ece5dc', borde: C.tinta, capa: 'fondo' });
    L.rect(x, y, w, h, { relleno: '#fff', borde: C.tinta });
    L.rect(x, y, w, 46, { relleno: color });
    L.texto(x + w / 2, y + 18, `«${est}»`, { t: 11, ancla: 'middle', color: C.suave });
    L.texto(x + w / 2, y + 36, titulo, { t: 14, peso: 700, ancla: 'middle' });
    lineas.forEach((t, i) => L.texto(x + 14, y + 70 + i * 20, t, { t: 12 }));
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h };
  };
  const nav = nodo(30, 90, 250, 190, 'Navegador web', 'dispositivo', ['Computadora, tableta o teléfono', 'HTML + CSS + JavaScript', 'Cookie pv.sid (HttpOnly, Secure)', 'Visitante, colaborador, admin'], C.azulSuave);
  const render = nodo(370, 90, 280, 230, 'Render (servicio web)', 'servidor', ['Node.js 22 + Express 4', 'Vistas EJS y API REST /api', 'helmet: CSP, HSTS, nosniff', 'express-session + CSRF', 'Redirección HTTP → HTTPS', 'Verificación GET /salud'], C.acentoSuave);
  const neon = nodo(740, 90, 230, 190, 'Neon PostgreSQL', 'base de datos', ['PostgreSQL administrado', '9 tablas + session', 'Conexión TLS', '(sslmode=require)'], C.verdeSuave);
  const git = nodo(370, 350 - 20, 280, 70, 'Repositorio GitHub', 'código', [], '#efe9e1');
  L.linea([[nav.r, 170], [render.x, 170]], { color: C.tinta, fin: 'flecha', inicio: 'flecha' });
  etiqueta(L, (nav.r + render.x) / 2, 160, 'HTTPS');
  L.linea([[render.r, 170], [neon.x, 170]], { color: C.tinta, fin: 'flecha', inicio: 'flecha' });
  etiqueta(L, (render.r + neon.x) / 2, 160, 'TLS 5432');
  L.linea([[510, git.y], [510, render.b]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, 590, git.y - 6, 'autoDeploy en cada push');
  const meteo = nodo(740, 340, 230, 100, 'Open-Meteo', 'servicio web público', ['api.open-meteo.com/v1/forecast', 'Radiación solar y temperatura'], C.azulSuave);
  L.linea([[render.r, 290], [700, 290], [700, meteo.y + 60], [meteo.x, meteo.y + 60]], { color: C.tinta, fin: 'flecha' });
  etiqueta(L, 700, 280, 'HTTPS GET, JSON');
  return L;
}

/* ------------------------------------------------------------ 3. casos de uso */
function casosDeUso() {
  const grupos = [
    { actor: 'Visitante', lado: 'izq', casos: ['Consultar la presentación de la PyME', 'Ver indicadores públicos y su serie', 'Leer recomendaciones y preguntas', 'Leer aviso de privacidad', 'Iniciar sesión'] },
    { actor: 'Colaborador', lado: 'izq', casos: ['Registrar consumo, residuo o producción', 'Consultar y filtrar registros', 'Editar sus propios registros', 'Ver el tablero de indicadores', 'Consultar residuos y destinos', 'Comparar escenarios en la calculadora', 'Actualizar el avance de sus acciones', 'Agregar evidencias de avance', 'Cambiar su contraseña'] },
    { actor: 'Administrador', lado: 'der', casos: ['Editar o eliminar cualquier registro', 'Crear, editar y eliminar acciones', 'Comparar periodos, exportar CSV, imprimir', 'Administrar usuarios y roles', 'Configurar empresa, supuestos y metas', 'Administrar el catálogo de conceptos', 'Consultar la bitácora de auditoría'] },
  ];
  const paso = 50;
  const total = grupos.reduce((n, g) => n + g.casos.length, 0);
  const L = new Lienzo(1000, 130 + total * paso + grupos.length * 24 + 64);
  L.texto(30, 36, 'Diagrama de casos de uso', { t: 20, peso: 700 });
  const sx = 300, sw = 400;
  L.rect(sx, 70, sw, L.h - 124, { relleno: '#fbf8f4', borde: C.tinta, r: 6, capa: 'fondo' });
  L.texto(sx + sw / 2, 92, 'Sistema PyME Verde', { t: 14, peso: 700, ancla: 'middle' });
  let y = 130;
  const actores = [];
  for (const g of grupos) {
    const ys = [];
    for (const c of g.casos) {
      L.add('cajas', `<ellipse cx="${sx + sw / 2}" cy="${y}" rx="185" ry="20" fill="#fff" stroke="${C.tinta}" stroke-width="1.2"/>`);
      L.texto(sx + sw / 2, y + 4, c, { t: 12.5, ancla: 'middle' });
      ys.push(y);
      y += paso;
    }
    y += 24;
    const ay = (ys[0] + ys[ys.length - 1]) / 2;
    const ax = g.lado === 'izq' ? 120 : 880;
    // muñeco
    L.add('cajas', `<g stroke="${C.tinta}" stroke-width="1.6" fill="none"><circle cx="${ax}" cy="${ay - 34}" r="11" fill="#fff"/><path d="M${ax},${ay - 23} V${ay + 8} M${ax - 20},${ay - 12} H${ax + 20} M${ax},${ay + 8} L${ax - 15},${ay + 32} M${ax},${ay + 8} L${ax + 15},${ay + 32}"/></g>`);
    L.texto(ax, ay + 52, g.actor, { t: 14, peso: 700, ancla: 'middle' });
    const bx = g.lado === 'izq' ? ax + 26 : ax - 26;
    for (const yy of ys) L.linea([[bx, ay - 4], [g.lado === 'izq' ? sx + sw / 2 - 185 : sx + sw / 2 + 185, yy]], { color: C.linea, grosor: 1.1 });
    actores.push({ ax, ay });
  }
  // generalizaciones: colaborador hereda de visitante; administrador de colaborador
  const [v, c, a] = actores;
  L.linea([[c.ax - 50, c.ay - 40], [v.ax - 50, v.ay + 60]], { color: C.tinta, fin: 'herencia' });
  etiqueta(L, c.ax - 50, (c.ay + v.ay) / 2 + 10, 'hereda');
  const yPie = L.h - 14;
  L.linea([[a.ax, a.ay + 62], [a.ax, yPie], [c.ax, yPie], [c.ax, c.ay + 62]], { color: C.tinta, fin: 'herencia' });
  etiqueta(L, c.ax + 30, (c.ay + yPie) / 2, 'hereda');
  return L;
}

/* ------------------------------------------------------------ 4. clases del dominio */
function clasesDominio() {
  const L = new Lienzo(1130, 1080);
  L.texto(30, 36, 'Diagrama de clases: modelo de dominio (src/models)', { t: 20, peso: 700 });
  L.texto(30, 58, 'Atributos privados (#) con acceso por getters; cada clase valida sus datos al crearse o modificarse.', { t: 13, color: C.suave });
  const w = 250, gap = 25, x0 = 30;
  const X = (i) => x0 + i * (w + gap);
  const pyme = clase(L, X(0), 84, w, 'Pyme', ['- nombre, giro: string', '- ubicacionGeneral: string', '- numColaboradores: int'], ['+ actualizar(datos)', '+ toJSON()']);
  const usuario = clase(L, X(1), 84, w, 'Usuario', ['- username, correo: string', '- passwordHash: string', '- rol: Rol', '- intentosFallidos: int', '- bloqueadoHasta: Date'], ['+ verificarPassword(p): bool', '+ cambiarPassword(actual, nueva)', '+ puede(permiso): bool', '+ estaBloqueado(): bool']);
  const categoria = clase(L, X(2), 84, w, 'Categoria', ['- nombre, unidad: string', '- tipo: consumo|residuo|…', '- clasificacion: string'], ['+ esResiduo(): bool', '+ actualizar(datos)']);
  const parametro = clase(L, X(3), 84, w, 'Parametro', ['- clave, nombre: string', '- valor: number', '- unidad, fuente: string'], ['+ actualizar(valor, fuente)']);
  const yBusA = 330;
  const entidad = clase(L, 250, 360, 280, 'Entidad', ['# id: int'], ['+ esNueva(): bool', '+ asignarId(id)', '+ toJSON()'], { estereotipo: 'abstract', abstracta: true, cab: '#e2d6c6' });
  bus(L, entidad, [pyme, usuario, categoria, parametro], yBusA, 'arriba');
  const rol = clase(L, 660, 360, 240, 'Rol', ['- nombre, etiqueta: string', '- permisos: Set'], ['+ puede(permiso): bool', '+ desdeNombre(n) «static»'], { relleno: '#f1f4f7', cab: C.azulSuave });
  L.linea([[usuario.r - 20, usuario.b], [usuario.r - 20, 346], [rol.cx, 346], [rol.cx, rol.y]], { color: C.tinta, fin: 'abierta' });
  L.texto(rol.cx + 8, rol.y - 4, '1', { t: 12, color: C.suave });
  L.texto(usuario.r - 14, usuario.b + 16, 'N', { t: 12, color: C.suave });
  const yB = 560;
  const registro = clase(L, X(0), yB, w, 'Registro', ['- categoria: Categoria', '- fecha: date', '- cantidad, costo: number', '- origenDato: string'], ['+ costoUnitario(): number', '+ cambiarOrigen(origen)', '+ validarEspecifico() «abstract»'], { estereotipo: 'abstract', abstracta: true });
  const indicador = clase(L, X(1), yB, w, 'Indicador', ['- clave, formula, unidad', '- meta: number', '- sentido: mayor|menor', '- publico: bool'], ['+ evaluar(valor): estado', '+ brecha(valor): number', '+ actualizarMeta(meta)']);
  const accion = clase(L, X(2), yB, w, 'AccionSustentable', ['- titulo, meta: string', '- fechaObjetivo: date', '- estado: pendiente|…', '- avance: 0..100'], ['+ actualizarAvance(n)', '+ cambiarEstado(e)', '+ estaVencida(): bool']);
  const evidencia = clase(L, X(3), yB, w, 'Evidencia', ['- fecha: date', '- descripcion: string', '- enlace: url'], ['+ crear(datos) «static»']);
  bus(L, entidad, [registro, indicador, accion, evidencia], 530, 'abajo');
  L.linea([[evidencia.x, evidencia.y + 70], [accion.r, accion.y + 70]], { color: C.tinta, fin: 'rombo' });
  L.texto(accion.r + 4, accion.y + 88, '1', { t: 12, color: C.suave });
  L.texto(evidencia.x - 4, accion.y + 62, '0..*', { t: 12, color: C.suave, ancla: 'end' });
  L.linea([[accion.x, accion.y + 70], [indicador.r, indicador.y + 70]], { color: C.tinta, fin: 'abierta' });
  etiqueta(L, (accion.x + indicador.r) / 2, indicador.y + 62, '0..1');
  const yC = 820;
  const hijos = [
    clase(L, X(0) - 10, yC, 200, 'RegistroConsumo', [], ['+ validarEspecifico()']),
    clase(L, X(0) + 205, yC, 200, 'RegistroProduccion', [], ['+ validarEspecifico()']),
    clase(L, X(0) + 420, yC, 190, 'RegistroSocial', [], ['+ validarEspecifico()']),
  ];
  const residuo = clase(L, X(0) + 625, yC, 250, 'RegistroResiduo', ['- cantidadAprovechada: number', '- destino, evidenciaDestino'], ['+ validarEspecifico()']);
  bus(L, registro, [...hijos, residuo], 795, 'abajo');
  const estrategia = clase(L, 905, yC + 130, 200, 'DestinoResiduoStrategy', [], ['+ validar(datos): errores'], { estereotipo: 'interface', relleno: '#f1f4f7', cab: C.azulSuave });
  L.linea([[residuo.cx, residuo.b], [residuo.cx, estrategia.y + 40], [estrategia.x, estrategia.y + 40]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  L.texto(residuo.cx + 8, residuo.b + 30, 'usa', { t: 12, color: C.suave });
  L.texto(30, 1066, 'Pyme se relaciona 1..* con Usuario, Categoria, Registro, Indicador, AccionSustentable y Parametro (ver el modelo entidad-relación).', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 5. patrones Strategy + Factory */
function patronesStrategy() {
  const L = new Lienzo(1130, 800);
  L.texto(30, 36, 'Patrones Strategy y Factory', { t: 20, peso: 700 });
  L.texto(30, 58, 'Indicadores: cada fórmula es una estrategia. Residuos: cada clasificación decide los destinos válidos.', { t: 13, color: C.suave });
  // indicadores
  const svc = clase(L, 30, 90, 250, 'IndicadorService', ['- repos, parametros'], ['+ calcular(usuario, periodo)', '+ serie(id, meses)']);
  const fab = clase(L, 400, 90, 300, 'IndicadorStrategyFactory', ['- #registro: Map<clave, estrategia>'], ['+ para(clave) «static»', '+ disponibles() «static»'], { estereotipo: 'factory', relleno: '#f1f4f7', cab: C.azulSuave });
  const abs = clase(L, 820, 90, 280, 'IndicadorStrategy', [], ['+ calcular(contexto) «abstract»', '+ sumar(), dividir(), redondear()'], { estereotipo: 'abstract', abstracta: true });
  L.linea([[svc.r, 130], [fab.x, 130]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (svc.r + fab.x) / 2, 122, 'pide la estrategia');
  L.linea([[fab.r, 130], [abs.x, 130]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (fab.r + abs.x) / 2, 122, 'crea');
  const nombres = ['TasaAprovechamiento', 'IntensidadPorPar', 'PromedioMensual', 'CostoDesperdicio', 'AvancePlan', 'CapacitacionPorColaborador'];
  const hijas = nombres.map((n, i) => clase(L, 30 + i * 182, 300, 170, `${n}`, [], ['+ calcular(ctx)'], { tNombre: n.length > 20 ? 11.5 : 13 }));
  bus(L, abs, hijas, 270, 'abajo');
  L.texto(30, 400, 'Sufijo Strategy omitido en las cajas. Agregar un indicador nuevo = agregar una clase y registrarla en la fábrica, sin tocar el servicio.', { t: 12, color: C.suave });
  // destinos
  const reg = clase(L, 30, 450, 250, 'RegistroFactory', [], ['+ crear(datos, categoria) «static»'], { estereotipo: 'factory', relleno: '#f1f4f7', cab: C.azulSuave });
  const fab2 = clase(L, 400, 450, 300, 'DestinoStrategyFactory', ['- #registro: Map<clasificacion, …>'], ['+ para(clasificacion) «static»'], { estereotipo: 'factory', relleno: '#f1f4f7', cab: C.azulSuave });
  const abs2 = clase(L, 820, 450, 280, 'DestinoResiduoStrategy', [], ['+ destinosAprovechamiento()', '+ destinoDisposicion()', '+ exigeEvidencia(): bool', '+ validar(datos): errores'], { estereotipo: 'abstract', abstracta: true });
  L.linea([[reg.r, 490], [fab2.x, 490]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (reg.r + fab2.x) / 2, 482, 'según la clasificación');
  L.linea([[fab2.r, 490], [abs2.x, 490]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  const n2 = [['ReutilizableStrategy', 'reutilización, donación'], ['ReciclableStrategy', 'reciclaje'], ['ManejoEspecialStrategy', 'coprocesamiento; exige evidencia'], ['NoAprovechableStrategy', 'relleno sanitario']];
  const h2 = n2.map(([n, d], i) => clase(L, 30 + i * 272, 680, 255, n, [d], []));
  bus(L, abs2, h2, 650, 'abajo');
  L.texto(30, 784, 'RegistroFactory también elige la subclase de Registro (Consumo, Producción, Social, Residuo) según el tipo de categoría.', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 6. Repository, Singleton, Observer */
function patronesDatos() {
  const L = new Lienzo(1130, 620);
  L.texto(30, 36, 'Patrones Repository, Singleton y Observer', { t: 20, peso: 700 });
  L.texto(30, 58, 'Los servicios no escriben SQL: usan repositorios. La auditoría se dispara con eventos, sin acoplar los servicios a la bitácora.', { t: 13, color: C.suave });
  const svc = clase(L, 30, 90, 260, 'RegistroService', ['- #registros: RegistroRepository', '- #eventos: EventBus'], ['+ crear(usuario, datos, ip)', '+ actualizar(…), eliminar(…)']);
  const base = clase(L, 420, 90, 300, 'BaseRepository', ['- #tabla: string'], ['+ consultar(sql, params)', '+ uno(), varios(), contar()', '+ eliminar(id, pymeId)', '+ mapear(fila) «abstract»'], { estereotipo: 'abstract', abstracta: true });
  const db = clase(L, 850, 90, 250, 'Database', ['- #instancia «static»', '- #pool: pg.Pool'], ['+ getInstance() «static»', '+ query(sql, params)', '+ transaccion(fn)'], { estereotipo: 'singleton', relleno: '#f1f4f7', cab: C.azulSuave });
  L.linea([[svc.r, 140], [base.x, 140]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (svc.r + base.x) / 2, 132, 'usa');
  L.linea([[base.r, 140], [db.x, 140]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (base.r + db.x) / 2, 132, 'getInstance()');
  const repos = ['Registro', 'Usuario', 'Categoria', 'Indicador', 'Accion', 'Parametro', 'Pyme', 'Bitacora'];
  const hs = repos.map((n, i) => clase(L, 30 + i * 135, 330, 125, `${n}`, [], ['+ mapear()']));
  bus(L, base, hs, 300, 'abajo');
  L.texto(30, 418, 'Cada caja es <Nombre>Repository. Todas las consultas usan parámetros ($1, $2…), nunca texto concatenado.', { t: 12, color: C.suave });
  const bus2 = clase(L, 30, 450, 300, 'EventBus', ['- #suscriptores: Map<evento, Set>'], ['+ suscribir(evento, manejador)', '+ publicar(evento, datos)'], { estereotipo: 'subject', relleno: '#f1f4f7', cab: C.azulSuave });
  const obs = clase(L, 450, 450, 280, 'BitacoraObserver', ['- #repositorio: BitacoraRepository'], ['+ registrar(evento, datos)'], { estereotipo: 'observer' });
  const brep = clase(L, 850, 450, 250, 'BitacoraRepository', [], ['+ registrar(entrada)', '+ listar(filtros)']);
  L.linea([[obs.x, 500], [bus2.r, 500]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, (obs.x + bus2.r) / 2, 492, "suscribir('*')");
  L.linea([[obs.r, 500], [brep.x, 500]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  L.linea([[svc.cx, svc.b], [svc.cx, bus2.y]], { color: C.tinta, guion: '6 4', fin: 'abierta' });
  etiqueta(L, svc.cx, (svc.b + bus2.y) / 2 + 60, "publicar('registro.creado')");
  return L;
}

/* ------------------------------------------------------------ 7. secuencia: alta de un registro */
function secuencia() {
  const vidas = ['Navegador\n(registros.js)', 'Rutas +\nmiddleware', 'RegistroApi\nController', 'Registro\nService', 'Registro\nFactory', 'Destino\nStrategy', 'Registro\nRepository', 'PostgreSQL', 'EventBus +\nObserver'];
  const L = new Lienzo(1130, 840);
  L.texto(30, 36, 'Diagrama de secuencia: alta de un registro de residuo', { t: 20, peso: 700 });
  const x = (i) => 75 + i * 122;
  vidas.forEach((v, i) => {
    L.rect(x(i) - 55, 60, 110, 46, { relleno: i === 0 ? C.azulSuave : C.cab, r: 4 });
    v.split('\n').forEach((t, j) => L.texto(x(i), 79 + j * 16, t, { t: 12, peso: 700, ancla: 'middle' }));
    L.linea([[x(i), 106], [x(i), 106]], { color: C.linea, guion: '4 4', grosor: 1 });
  });
  let y = 140;
  const msj = (a, b, t, { vuelta = false } = {}) => {
    if (a === b) {
      L.linea([[x(a), y], [x(a) + 40, y], [x(a) + 40, y + 20], [x(a) + 4, y + 20]], { color: C.tinta, fin: 'flecha' });
      L.texto(x(a) + 46, y + 14, t, { t: 11.5, halo: true });
      y += 44;
      return;
    }
    L.linea([[x(a), y], [x(b) + (b > a ? -2 : 2), y]], { color: C.tinta, guion: vuelta ? '6 4' : '', fin: vuelta ? 'abierta' : 'flecha' });
    L.texto((x(a) + x(b)) / 2, y - 6, t, { t: 11.5, ancla: 'middle', halo: true });
    y += 40;
  };
  msj(0, 1, 'POST /api/registros  JSON + X-CSRF-Token');
  msj(1, 1, 'requiereSesion · verificarToken · requierePermiso');
  msj(1, 2, 'crear(req, res)');
  msj(2, 3, 'crear(usuario, req.body, ip)');
  msj(3, 4, 'crear(datos, categoria)');
  msj(4, 5, 'validar(cantidad, aprovechada, destino)');
  msj(5, 4, 'errores = {}', { vuelta: true });
  msj(4, 3, 'RegistroResiduo', { vuelta: true });
  msj(3, 6, 'insertar(registro)');
  msj(6, 7, 'INSERT INTO registro … VALUES ($1 … $n)');
  msj(7, 6, 'id', { vuelta: true });
  msj(3, 8, "publicar('registro.creado', detalle)");
  msj(8, 7, 'INSERT INTO bitacora …');
  msj(3, 2, 'registro', { vuelta: true });
  msj(2, 0, '201 Created  { data }  Location: /api/registros/:id', { vuelta: true });
  msj(0, 0, 'actualiza la tabla y muestra el aviso');
  y += 6;
  L.rect(40, y, 1050, 96, { relleno: '#fff7f2', borde: C.acento, r: 6, guion: '5 4' });
  L.texto(56, y + 22, 'alt  [datos inválidos]', { t: 12.5, peso: 700, color: C.acento });
  L.texto(56, y + 44, 'Si la estrategia o el modelo devuelven errores, el servicio lanza ValidacionError y la API responde 422 { error: { codigo, mensaje, campos } };', { t: 12 });
  L.texto(56, y + 64, 'el navegador marca cada campo con su mensaje. Sin sesión: 401. Sin permiso: 403. Token CSRF ausente o distinto: 403 CSRF.', { t: 12 });
  L.h = y + 110;
  vidas.forEach((v, i) => L.linea([[x(i), 106], [x(i), y]], { color: C.linea, guion: '4 4', grosor: 1 }));
  return L;
}

/* ------------------------------------------------------------ 8. modelo entidad-relación */
function entidadRelacion() {
  const L = new Lienzo(1240, 990);
  L.texto(30, 36, 'Modelo entidad-relación (PostgreSQL)', { t: 20, peso: 700 });
  L.texto(30, 58, 'PK: llave primaria · FK: llave foránea · UQ: única. Las reglas CHECK y las acciones ON DELETE están en el diccionario de datos.', { t: 13, color: C.suave });
  const tabla = (x, y, nombre, cols, w = 330) => {
    const lh = 18, h = 38 + cols.length * lh;
    L.rect(x, y, w, h, { relleno: '#fff' });
    L.rect(x, y, w, 30, { relleno: C.cab });
    L.texto(x + 10, y + 20, nombre, { t: 14, peso: 700 });
    cols.forEach(([n, t, k], i) => {
      const yy = y + 30 + 16 + i * lh;
      if (k) L.texto(x + 10, yy, k, { t: 10.5, peso: 700, color: k === 'PK' ? C.acento : C.azul });
      L.texto(x + 40, yy, n, { t: 12, peso: k === 'PK' ? 700 : 400 });
      L.texto(x + w - 10, yy, t, { t: 11, ancla: 'end', color: C.suave });
    });
    return { x, y, w, h, cx: x + w / 2, r: x + w, b: y + h };
  };
  const c1 = 30, c2 = 440, c3 = 850, r1 = 90, r2 = 330, r3 = 660;
  const parametro = tabla(c1, r1, 'parametro', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['clave', 'varchar(40)', 'UQ'], ['nombre', 'varchar(120)'], ['valor', 'numeric ≥ 0'], ['unidad', 'varchar(30)'], ['fuente', 'text']]);
  const pyme = tabla(c2, r1, 'pyme', [['id', 'serial', 'PK'], ['nombre', 'varchar(120)'], ['giro', 'varchar(120)'], ['ubicacion_general', 'varchar(160)'], ['descripcion', 'text'], ['problematica', 'text'], ['objetivo', 'text'], ['num_colaboradores', 'int > 0']]);
  const categoria = tabla(c3, r1, 'categoria', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['nombre', 'varchar(80)', 'UQ'], ['tipo', 'consumo|residuo|…'], ['unidad', 'varchar(20)'], ['clasificacion', 'solo residuos'], ['activa', 'bool']]);
  const bitacora = tabla(c1, r2, 'bitacora', [['id', 'bigserial', 'PK'], ['usuario_id', 'int', 'FK'], ['evento', 'varchar(60)'], ['entidad, entidad_id', 'varchar, int'], ['detalle', 'jsonb'], ['ip', 'varchar(64)'], ['creado_en', 'timestamptz']]);
  const usuario = tabla(c2, r2, 'usuario', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['nombre', 'varchar(120)'], ['username', 'varchar(40)', 'UQ'], ['correo', 'varchar(160)', 'UQ'], ['password_hash', 'bcrypt'], ['rol', 'administrador|colaborador'], ['activo', 'bool'], ['intentos_fallidos', 'int ≥ 0'], ['bloqueado_hasta', 'timestamptz'], ['ultimo_acceso', 'timestamptz']]);
  const registro = tabla(c3, r2, 'registro', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['categoria_id', 'int', 'FK'], ['usuario_id', 'int', 'FK'], ['fecha', 'date'], ['cantidad', 'numeric ≥ 0'], ['unidad', 'varchar(20)'], ['costo', 'numeric ≥ 0'], ['origen_dato', 'medidor|recibo|…'], ['cantidad_aprovechada', '≤ cantidad'], ['destino', 'reutilizacion|…'], ['evidencia_destino', 'text'], ['notas', 'text']]);
  const evidencia = tabla(c1, r3, 'evidencia', [['id', 'serial', 'PK'], ['accion_id', 'int', 'FK'], ['usuario_id', 'int', 'FK'], ['fecha', 'date'], ['descripcion', 'text'], ['enlace', 'varchar(300)']]);
  const accion = tabla(c2, r3, 'accion', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['indicador_id', 'int', 'FK'], ['responsable_id', 'int', 'FK'], ['creado_por', 'int', 'FK'], ['titulo', 'varchar(140)'], ['meta', 'varchar(200)'], ['fecha_inicio', 'date'], ['fecha_objetivo', '≥ fecha_inicio'], ['estado', 'pendiente|en_proceso|…'], ['avance', '0..100']]);
  const indicador = tabla(c3, r3, 'indicador', [['id', 'serial', 'PK'], ['pyme_id', 'int', 'FK'], ['categoria_id', 'int', 'FK'], ['clave', 'varchar(40)', 'UQ'], ['nombre', 'varchar(120)'], ['dimension', 'ambiental|social|…'], ['formula', 'text'], ['unidad', 'varchar(30)'], ['meta', 'numeric ≥ 0'], ['sentido', 'mayor|menor'], ['publico', 'bool']]);
  /** Relación 1:N: línea ortogonal y la cardinalidad junto a cada extremo. */
  const rel = (pts, a, b, nota) => {
    L.linea(pts, { color: C.tinta, grosor: 1.4 });
    const card = (p, q, t) => {
      const vertical = p[0] === q[0];
      const dir = vertical ? Math.sign(q[1] - p[1]) : Math.sign(q[0] - p[0]);
      const x = vertical ? p[0] + 7 : p[0] + dir * 7;
      const y = vertical ? p[1] + (dir > 0 ? 16 : -6) : p[1] - 6;
      L.texto(x, y, t, { t: 12, peso: 700, color: C.acento, ancla: vertical || dir > 0 ? 'start' : 'end' });
    };
    card(pts[0], pts[1], a);
    card(pts[pts.length - 1], pts[pts.length - 2], b);
    if (nota) L.texto(nota[0], nota[1], nota[2], { t: 11, color: C.suave, estilo: 'italic' });
  };
  rel([[pyme.x, 130], [parametro.r, 130]], '1', 'N');
  rel([[pyme.r, 130], [categoria.x, 130]], '1', 'N');
  rel([[560, pyme.b], [560, usuario.y]], '1', 'N');
  rel([[pyme.r, 250], [810, 250], [810, 348], [registro.x, 348]], '1', 'N');
  rel([[1015, categoria.b], [1015, registro.y]], '1', 'N');
  rel([[usuario.r, 420], [registro.x, 420]], '1', '0..N', [778, 440, 'autor']);
  rel([[usuario.x, 380], [bitacora.r, 380]], '1', '0..N');
  rel([[540, usuario.b], [540, accion.y]], '1', '0..N', [548, usuario.b + 50, 'responsable']);
  rel([[690, usuario.b], [690, accion.y]], '1', '0..N', [698, usuario.b + 50, 'creado_por']);
  rel([[usuario.x, 540], [400, 540], [400, 630], [300, 630], [300, evidencia.y]], '1', '0..N');
  rel([[accion.x, 720], [evidencia.r, 720]], '1', 'N');
  rel([[indicador.x, 720], [accion.r, 720]], '1', '0..N');
  rel([[categoria.r, 200], [1215, 200], [1215, 700], [indicador.r, 700]], '1', '0..N');
  L.texto(30, 940, 'indicador.pyme_id y accion.pyme_id también referencian a pyme (1:N); esas dos líneas se omiten para no cruzar el diagrama.', { t: 12, color: C.suave });
  L.texto(30, 960, 'session (sid PK, sess json, expire) guarda las sesiones del servidor y no se relaciona con el dominio.', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 9. mapa de navegación */
function navegacion() {
  const L = new Lienzo(1130, 640);
  L.texto(30, 36, 'Mapa de navegación', { t: 20, peso: 700 });
  const nodo = (x, y, w, t, sub, { color = C.caja, borde = C.tinta } = {}) => {
    L.rect(x, y, w, sub ? 50 : 36, { relleno: color, borde, r: 8 });
    L.texto(x + w / 2, y + 22, t, { t: 13, peso: 700, ancla: 'middle' });
    if (sub) L.texto(x + w / 2, y + 40, sub, { t: 11, ancla: 'middle', color: C.suave });
    return { x, y, w, h: sub ? 50 : 36, cx: x + w / 2, b: y + (sub ? 50 : 36), r: x + w };
  };
  L.rect(20, 60, 1090, 164, { relleno: C.azulSuave, borde: 'none', r: 12, capa: 'fondo' });
  L.texto(36, 84, 'Sección pública (sin sesión)', { t: 13, peso: 700, color: C.azul });
  const inicio = nodo(40, 100, 200, 'Inicio  /', 'empresa, problema, indicadores', { color: '#fff' });
  const anclas = ['Indicadores', 'Cómo se registra', 'Destino de residuos', 'Preguntas'];
  anclas.forEach((t, i) => { const n = nodo(280 + i * 150, 100, 138, t, '#ancla', { color: '#fff' }); L.linea([[inicio.r, 125], [n.x, 125]], { color: C.linea }); });
  const priv = nodo(40, 162, 200, 'Privacidad', null, { color: '#fff' });
  const cred = nodo(260, 162, 160, 'Créditos', null, { color: '#fff' });
  const docs = nodo(440, 162, 200, 'Documentación API', '/api/docs', { color: '#fff' });
  const login = nodo(900, 130, 190, 'Iniciar sesión', '/login', { color: '#fff', borde: C.acento });
  L.linea([[inicio.cx, inicio.b], [inicio.cx, priv.y]], { color: C.linea });
  L.rect(20, 236, 1090, 384, { relleno: C.verdeSuave, borde: 'none', r: 12, capa: 'fondo' });
  L.texto(36, 254, 'Panel privado (con sesión; el menú muestra solo lo que el rol puede usar)', { t: 13, peso: 700, color: C.verde });
  const tablero = nodo(900, 270, 190, 'Tablero', '/panel', { color: '#fff' });
  L.linea([[login.cx, login.b], [tablero.cx, tablero.y]], { color: C.tinta, fin: 'flecha' });
  const col = [
    ['Registros', '/panel/registros', 'alta, edición, filtro, CSV'],
    ['Residuos', '/panel/residuos', 'aprovechamiento y destinos'],
    ['Calculadora', '/panel/calculadora', 'escenarios y supuestos'],
    ['Plan de acciones', '/panel/acciones', 'avance y evidencias'],
    ['Mi perfil', '/perfil', 'cambio de contraseña'],
  ];
  col.forEach(([t, r, d], i) => {
    const n = nodo(40 + i * 170, 290, 158, t, r, { color: '#fff' });
    L.texto(n.cx, n.b + 16, d, { t: 10.5, ancla: 'middle', color: C.suave });
  });
  L.linea([[tablero.x, 315], [870, 315]], { color: C.linea });
  L.texto(36, 400, 'Solo administración', { t: 13, peso: 700, color: C.acento });
  const adm = [
    ['Reportes', '/panel/reportes', 'comparar periodos'],
    ['Versión imprimible', '/panel/reportes/imprimir', 'y CSV'],
    ['Usuarios', '/admin/usuarios', 'alta, rol, bloqueo'],
    ['Configuración', '/admin/configuracion', 'empresa, supuestos, metas'],
    ['Bitácora', '/admin/bitacora', 'auditoría'],
  ];
  adm.forEach(([t, r, d], i) => {
    const n = nodo(40 + i * 210, 420, 196, t, r, { color: '#fff', borde: C.acento });
    L.texto(n.cx, n.b + 16, d, { t: 10.5, ancla: 'middle', color: C.suave });
  });
  L.texto(36, 560, 'Una ruta privada sin sesión lleva a /login y regresa a la página pedida al entrar. Una ruta sin permiso responde 403, aunque se escriba a mano.', { t: 12, color: C.suave });
  L.texto(36, 582, 'Cerrar sesión (POST /logout) destruye la sesión en el servidor y vuelve a /login.', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 10. componentes */
function componentes() {
  const L = new Lienzo(1000, 760);
  L.texto(30, 36, 'Diagrama de componentes', { t: 20, peso: 700 });
  L.texto(30, 58, 'Cada componente usa solo las interfaces del componente de abajo. Las flechas punteadas indican dependencia de uso.', { t: 13, color: C.suave });
  const comp = (x, y, w, h, nombre, lineas = [], color = C.caja, borde = C.tinta) => {
    L.rect(x, y, w, h, { relleno: color, borde, r: 4, grosor: 1.4 });
    L.rect(x + w - 30, y + 8, 18, 22, { relleno: '#fff', borde });
    L.rect(x + w - 35, y + 12, 10, 5, { relleno: '#fff', borde });
    L.rect(x + w - 35, y + 21, 10, 5, { relleno: '#fff', borde });
    L.texto(x + 12, y + 24, nombre, { t: 14, peso: 700 });
    lineas.forEach((t, i) => L.texto(x + 12, y + 46 + i * 17, t, { t: 12, color: C.suave }));
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h };
  };
  const usa = (pts, txt, tx, ty) => { L.linea(pts, { color: C.tinta, guion: '6 4', fin: 'abierta' }); if (txt) etiqueta(L, tx, ty, txt); };

  const nav = comp(30, 80, 300, 110, 'Cliente web (navegador)', ['Vistas HTML renderizadas', 'public/js: pv.js, registros.js,', 'calculadora.js, tablero.js y otros'], C.azulSuave, C.azul);
  const ext = comp(670, 80, 300, 110, 'Open-Meteo (externo)', ['Servicio web público', 'GET /v1/forecast', 'JSON sin clave de acceso'], '#efe9e1', C.suave);
  const web = comp(30, 240, 300, 110, 'Rutas y controladores web', ['src/routes/web.js', 'src/controllers/web/*', 'Devuelven HTML (EJS)'], C.acentoSuave, C.acento);
  const api = comp(350, 240, 300, 110, 'API REST', ['src/routes/api.js', 'src/controllers/api/*', 'Devuelven JSON, OpenAPI 3'], C.acentoSuave, C.acento);
  const mid = comp(670, 240, 300, 110, 'Middleware', ['auth.js: sesión y permisos', 'csrf.js, seguridad.js (helmet)', 'errores.js'], C.acentoSuave, C.acento);
  const srv = comp(30, 400, 620, 130, 'Servicios de negocio', ['AuthService, UsuarioService, RegistroService, IndicadorService,', 'ResiduoService, AccionService, CalculadoraService, ReporteService,', 'CatalogoService, ClimaService (cliente de Open-Meteo)', 'Modelos (src/models) y patrones Strategy, Factory, Observer'], C.verdeSuave, C.verde);
  const ev = comp(670, 400, 300, 130, 'Eventos y bitácora', ['EventBus (Observer)', 'BitacoraObserver', 'Escucha registro.*, accion.*,', 'sesion.* y usuario.*'], C.verdeSuave, C.verde);
  const rep = comp(30, 580, 620, 90, 'Repositorios', ['BaseRepository y 8 repositorios: SQL con parámetros $1, $2…', 'Database.getInstance() (Singleton, pool de pg)'], '#efe9e1', C.suave);
  const db = comp(670, 580, 300, 90, 'PostgreSQL (Neon)', ['9 tablas de dominio', 'tabla session'], '#efe9e1', C.suave);

  usa([[120, nav.b], [120, web.y]], 'HTTPS: páginas', 120, 222);
  usa([[290, nav.b], [290, 215], [500, 215], [500, api.y]], 'fetch JSON + X-CSRF-Token', 400, 207);
  usa([[web.r, 300], [api.x, 300]]);
  usa([[mid.x, 320], [api.r, 320]], 'filtra', 660, 340);
  usa([[180, web.b], [180, srv.y]], 'usa', 200, 378);
  usa([[440, api.b], [440, srv.y]], 'usa', 460, 378);
  usa([[srv.r, 465], [ev.x, 465]], 'publica', 660, 457);
  usa([[340, srv.b], [340, rep.y]], 'usa', 360, 558);
  usa([[ev.cx, ev.b], [ev.cx, 555], [600, 555], [600, rep.y]], 'escribe', 760, 547);
  usa([[rep.r, 625], [db.x, 625]], 'SQL / TLS', 660, 652);
  usa([[600, srv.y], [600, 375], [940, 375], [940, ext.b]], 'HTTPS GET', 870, 367);
  L.texto(30, 720, 'El navegador nunca llama a Open-Meteo directamente: ClimaService lo consulta desde el servidor, guarda la respuesta una hora', { t: 12, color: C.suave });
  L.texto(30, 740, 'y la expone en GET /api/publico/clima.', { t: 12, color: C.suave });
  return L;
}

/* ------------------------------------------------------------ 11. diagrama de flujo */
function flujo() {
  const L = new Lienzo(1000, 1010);
  L.texto(30, 36, 'Diagrama de flujo: acceso y captura de un registro', { t: 20, peso: 700 });
  const W = 280;
  const H = 46;
  const caja = (cx, y, h) => ({ cx, y, b: y + h, l: cx - W / 2, r: cx + W / 2, cy: y + h / 2 });
  const proceso = (cx, y, t) => { L.rect(cx - W / 2, y, W, H, { relleno: C.caja, r: 4 }); L.texto(cx, y + 28, t, { t: 13, ancla: 'middle' }); return caja(cx, y, H); };
  const terminal = (cx, y, t) => { L.rect(cx - 90, y, 180, 40, { relleno: C.verdeSuave, borde: C.verde, r: 20, grosor: 1.6 }); L.texto(cx, y + 25, t, { t: 13, peso: 700, ancla: 'middle', color: C.verde }); return { cx, y, b: y + 40, l: cx - 90, r: cx + 90, cy: y + 20 }; };
  const decision = (cx, y, t) => {
    const w = 290;
    const h = 70;
    L.add('cajas', `<path d="M${cx},${y} L${cx + w / 2},${y + h / 2} L${cx},${y + h} L${cx - w / 2},${y + h / 2} z" fill="${C.acentoSuave}" stroke="${C.acento}" stroke-width="1.4"/>`);
    L.texto(cx, y + h / 2 + 5, t, { t: 13, ancla: 'middle', peso: 700 });
    return { cx, y, b: y + h, l: cx - w / 2, r: cx + w / 2, cy: y + h / 2 };
  };
  const fl = (pts, t, tx, ty) => { L.linea(pts, { color: C.tinta, fin: 'flecha' }); if (t) etiqueta(L, tx, ty, t, { peso: 700, color: C.tinta }); };
  const X = 300;
  const XR = 720;
  const ini = terminal(X, 70, 'Inicio');
  const a1 = proceso(X, 140, 'Abrir el sitio por HTTPS');
  const a2 = proceso(X, 216, 'Ver página pública e indicadores');
  const d1 = decision(X, 292, '¿Iniciar sesión?');
  const a3 = proceso(X, 410, 'Escribir usuario y contraseña');
  const d2 = decision(X, 486, '¿Credenciales válidas?');
  const a4 = proceso(X, 594, 'Crear sesión y mostrar panel por rol');
  const a5 = proceso(X, 670, 'Capturar un registro');
  const d3 = decision(X, 746, '¿Datos válidos?');
  const a6 = proceso(X, 854, 'Guardar y registrar en bitácora');
  const fin = terminal(X, 940, 'Fin');
  const r1 = proceso(XR, 304, 'Seguir como visitante');
  const r2 = proceso(XR, 498, 'Sumar intento fallido');
  const d4 = decision(XR, 576, '¿5 intentos seguidos?');
  const r3 = proceso(XR, 686, 'Bloquear la cuenta 15 minutos');
  // caja angosta a la izquierda para que el regreso no cruce otras flechas
  L.rect(20, 664, 115, 58, { relleno: C.caja, r: 4 });
  L.texto(77, 688, 'Mostrar error', { t: 12.5, ancla: 'middle' });
  L.texto(77, 706, 'por campo', { t: 12.5, ancla: 'middle' });
  [[ini, a1], [a1, a2], [a2, d1], [a3, d2], [a4, a5], [a5, d3], [a6, fin]].forEach(([u, v]) => fl([[X, u.b], [X, v.y]]));
  fl([[X, d1.b], [X, a3.y]], 'Sí', X + 20, d1.b + 22);
  fl([[X, d2.b], [X, a4.y]], 'Sí', X + 20, d2.b + 22);
  fl([[X, d3.b], [X, a6.y]], 'Sí', X + 20, d3.b + 22);
  fl([[d1.r, d1.cy], [r1.l, d1.cy]], 'No', d1.r + 22, d1.cy - 8);
  fl([[r1.r, r1.cy], [975, r1.cy], [975, fin.cy], [fin.r, fin.cy]]);
  fl([[d2.r, d2.cy], [r2.l, d2.cy]], 'No', d2.r + 22, d2.cy - 8);
  fl([[XR, r2.b], [XR, d4.y]]);
  fl([[XR, d4.b], [XR, r3.y]], 'Sí', XR + 20, d4.b + 22);
  fl([[d4.r, d4.cy], [940, d4.cy], [940, 392], [X + 60, 392], [X + 60, a3.y]], 'No', d4.r + 20, d4.cy - 8);
  fl([[r3.r, r3.cy], [975, r3.cy]]);
  fl([[d3.l, d3.cy], [77, d3.cy], [77, 722]], 'No', d3.l - 22, d3.cy - 8);
  fl([[135, a5.cy], [a5.l, a5.cy]]);
  L.texto(30, 1000, 'Los datos se validan dos veces: en el navegador (atributos HTML y pv.js) y en el servidor (Validador y modelos); la base aplica además restricciones CHECK.', { t: 12, color: C.suave });
  return L;
}

const DIAGRAMAS = {
  '01-arquitectura-capas': arquitectura,
  '02-despliegue': despliegue,
  '03-casos-de-uso': casosDeUso,
  '04-clases-dominio': clasesDominio,
  '05-patrones-strategy-factory': patronesStrategy,
  '06-patrones-repository-singleton-observer': patronesDatos,
  '07-secuencia-alta-registro': secuencia,
  '08-modelo-entidad-relacion': entidadRelacion,
  '09-mapa-navegacion': navegacion,
  '10-componentes': componentes,
  '11-diagrama-flujo': flujo,
};

async function main() {
  const puppeteer = require(process.argv[2] || 'puppeteer-core');
  const chrome = process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
  const navegador = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  const pagina = await navegador.newPage();
  for (const [nombre, fn] of Object.entries(DIAGRAMAS)) {
    const L = fn();
    const svg = L.svg();
    fs.writeFileSync(path.join(OUT, `${nombre}.svg`), svg);
    await pagina.setViewport({ width: L.w, height: L.h, deviceScaleFactor: 2 });
    await pagina.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    await pagina.screenshot({ path: path.join(OUT, 'png', `${nombre}.png`), clip: { x: 0, y: 0, width: L.w, height: L.h } });
    console.log(nombre, L.w, L.h);
  }
  await navegador.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
