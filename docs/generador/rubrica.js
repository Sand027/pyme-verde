'use strict';

const fs = require('fs');
const path = require('path');
const { D, RAIZ, COLOR, p, h1, h2, h3, vinetas, tabla, espacio, codigo, nota, figura, portada, indice, documento } = require('./comun');

const SITIO = 'https://pyme-verde.onrender.com';
const REPO = 'https://github.com/Sand027/pyme-verde';

function pruebas() {
  const texto = fs.readFileSync(path.join(RAIZ, 'docs', 'evidencias', 'pruebas-npm-test.txt'), 'utf8');
  return [...texto.matchAll(/✔ ([A-Z]\d{2}) (.+?) \(([\d.]+)ms\)/g)].map(([, id, desc]) => [id, desc]);
}

/** Cuenta líneas de un archivo del proyecto (para citar el tamaño real del código). */
const lineas = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n').length;

/**
 * Tabla de niveles de un criterio con el nivel alcanzado marcado.
 * niveles: [[nombre, descripción, porcentaje], ...] en el orden de la rúbrica.
 */
function niveles(lista, alcanzado) {
  return tabla(['Nivel', 'Descripción en la rúbrica', '%', 'Alcanzado'],
    lista.map(([n, d, pct]) => [n === alcanzado ? `**${n}**` : n, n === alcanzado ? `**${d}**` : d, n === alcanzado ? `**${pct}**` : pct, n === alcanzado ? '**Sí**' : '']),
    [1.6, 6.2, 0.9, 1.3], { tam: 17 });
}

function criterio(num, titulo, peso, lista, alcanzado, obtenido, justificacion, evidencias, extra = []) {
  return [
    h1(`${num}. ${titulo} (${peso} %)`, false),
    niveles(lista, alcanzado),
    espacio(),
    p(`**Nivel alcanzado: ${alcanzado}. Puntaje: ${obtenido} % de ${peso} %.** ${justificacion}`),
    h3('Evidencia'),
    tabla(['Qué se cumple', 'Dónde se comprueba'], evidencias, [4.2, 6.2], { tam: 17 }),
    espacio(),
    ...extra,
  ];
}

module.exports = function rubrica() {
  const res = pruebas();
  const N = res.length;
  const ids = (re) => res.filter(([id]) => re.test(id)).map(([id]) => id).join(', ');

  const resumen = [
    ['1. Front End: Maquetación', '10', 'Excelente', '10'],
    ['2. Front End: Aspecto visual', '10', 'Excelente', '10'],
    ['3. Front End: Navegabilidad y seguridad', '10', 'Excelente', '10'],
    ['4. Front End: Manejo del DOM', '10', 'Excelente', '10'],
    ['5. Back End: Arquitectura y diseño', '15', 'Excelente', '15'],
    ['6. Back End: Orientación a objetos', '15', 'Excelente', '15'],
    ['7. Back End: Interoperabilidad', '5', 'Excelente', '5'],
    ['8. Back End: Persistencia', '15', 'Excelente', '15'],
    ['9. Despliegue de la aplicación', '10', 'Excelente', '10'],
    ['**Total**', '**100**', '', '**100**'],
  ];

  return documento('Rúbrica con evidencias', [
    portada('Rúbrica con evidencias de cumplimiento', 'Autoevaluación de cada criterio de la rúbrica del proyecto final, con la evidencia en el código, en el sitio publicado y en las pruebas'),
    indice(),

    h1('Cómo leer este documento'),
    p('Para cada criterio de la rúbrica se reproduce la tabla de niveles, se marca el nivel que alcanza el proyecto y se muestra la evidencia: archivo y línea del código fuente, página del sitio publicado, captura de pantalla o prueba automatizada. Las rutas de archivo son relativas a la carpeta del proyecto (incluida en la entrega y en el repositorio). Las pruebas se identifican por su clave; su salida completa está en `docs/evidencias/pruebas-npm-test.txt`.'),
    tabla(['Recurso', 'Dirección'], [
      ['Sitio publicado (HTTPS)', SITIO],
      ['Código fuente', REPO],
      ['Documentación de la API', `${SITIO}/api/docs`],
      ['Pruebas automatizadas', `${N} pruebas, ${N} pasan (comando npm test)`],
      ['Credenciales de prueba', 'Bloc de notas y documento privado de la carpeta de entrega'],
    ], [3, 7.4]),
    espacio(),
    nota('El plan gratuito de Render suspende el servicio cuando nadie lo usa: la primera visita puede tardar cerca de un minuto. Después responde con normalidad.'),
    h2('Resumen de la autoevaluación'),
    tabla(['Criterio', 'Peso %', 'Nivel alcanzado', '% obtenido'], resumen, [5, 1.6, 2.2, 1.6]),
    espacio(),

    h2('Requisitos técnicos de la evaluación media'),
    p('El documento "Evaluación Media, Programación Web" lista estas características. La tabla indica dónde se cumple cada una.'),
    tabla(['Requisito', 'Cumplimiento y evidencia'], [
      ['HTML5, CSS3 y JavaScript', 'Vistas EJS con HTML5 semántico (`src/views`), CSS propio (`public/css`, `public/assets`) y JavaScript en módulos ES (`public/js`, 10 archivos).'],
      ['Protocolo HTTPS', `${SITIO} con certificado de Render; redirección 301 de HTTP a HTTPS y HSTS (\`src/middleware/seguridad.js:41\`).`],
      ['Herramientas de diseño de interfaz', 'Sistema de diseño propio en `public/assets` (rejilla, tipografía, componentes); diagramas generados con `docs/diagramas/generar.js`.'],
      ['Validación de datos de entrada', 'Cliente: `validarLocal()` y `mostrarErrores()` en `public/js/pv.js:94` y `:65`. Servidor: `src/utils/Validador.js` y `validar()` de cada modelo. Base: restricciones CHECK. Pruebas R04, R05, A03, C03.'],
      ['Responsivo', 'Criterio 1 de este documento.'],
      ['Manejo de sesiones', '`src/middleware/sesion.js` (express-session con almacén en PostgreSQL); criterio 3.'],
      ['En capas (MVC)', 'Criterio 5.'],
      ['Al menos 5 tablas', 'Nueve tablas de dominio más `session`; criterio 8.'],
      ['Autenticación simple', '`/login`, `src/services/AuthService.js`, bcrypt; criterio 3.'],
      ['Orientada a objetos', 'Criterio 6.'],
      ['Consumir al menos un servicio web público', 'Open-Meteo, en `src/services/ClimaService.js`; criterio 7.'],
      ['Despliegue en un servidor remoto', 'Render y Neon; criterio 9.'],
    ], [3, 7.4], { tam: 17 }),
    espacio(),
    p('**Lenguaje.** La evaluación media menciona PHP; las indicaciones del proyecto final PyME Verde (sección 7, Tecnologías sugeridas) permiten elegir la tecnología "siempre que cumplan los requisitos de la rúbrica" y sugieren Node.js con Express para el back end. El proyecto usa Node.js 22 con Express 4, que es la opción sugerida, y cumple todos los requisitos anteriores.'),

    // 1 ---------------------------------------------------------------------------
    ...criterio(1, 'Front End: Maquetación', 10, [
      ['Excelente', 'Presenta el diseño de la maquetación con una distribución de componentes responsiva.', '10'],
      ['Bueno', 'Presenta el diseño de la maquetación con una buena distribución de componentes.', '9'],
      ['Regular', 'Presenta el diseño de la maquetación.', '8'],
      ['Suficiente', 'Presenta el diseño mínimo.', '7'],
      ['No suficiente', 'No hay diseño.', '5'],
    ], 'Excelente', 10,
    'Todas las páginas usan una rejilla con CSS Grid y Flexbox que se reorganiza en teléfono, tableta y computadora, sin desplazamiento horizontal.',
    [
      ['Etiqueta viewport en todas las páginas', '`src/views/partials/kit-head.ejs`, que incluyen todas las páginas públicas y el panel (`app-inicio.ejs`, línea 8).'],
      ['Consultas de medios en 640, 1024 y 1280 px', '`public/css/app.css:217` (`max-width: 639px`) y siguientes; `public/css/publico.css`.'],
      ['Menú lateral que se vuelve cajón en teléfono', '`public/js/app.js` y `public/css/app.css`; captura 24-movil-menu.'],
      ['Tablas con desplazamiento propio y columnas que se ocultan en teléfono', 'Clase `ap-tabla-envoltura` y `ocultar-tel` en `src/views/panel/*.ejs`.'],
      ['Revisión a 390, 768 y 1366 px', 'Documentación técnica, secciones 4.3 (pruebas manuales) y 4.6; capturas 23 a 25.'],
      ['Comprobación en el sitio', `Abrir ${SITIO} y reducir el ancho de la ventana, o abrirlo en un teléfono.`],
    ],
    [figura('capturas/01-inicio.png', 'Página de inicio en computadora.', { maxAlto: 250 }),
      figura('capturas/25-movil-inicio.png', 'Página de inicio en un teléfono.', { maxAlto: 300 })]),

    // 2 ---------------------------------------------------------------------------
    ...criterio(2, 'Front End: Aspecto visual', 10, [
      ['Excelente', 'Utiliza adecuadamente la combinación de imágenes, de colores y fuentes de letras.', '10'],
      ['Bueno', 'No utiliza adecuadamente la combinación de imágenes o colores o fuentes de letras.', '9'],
      ['Regular', 'Utiliza imágenes, colores y fuentes de letras que no combinan.', '8'],
      ['Suficiente', 'No mantiene el mismo aspecto visual en todas las páginas.', '7'],
      ['No suficiente', 'El aspecto visual no tiene los suficientes elementos.', '5'],
    ], 'Excelente', 10,
    'Una sola paleta, dos familias tipográficas y fotografías del oficio se usan en todas las páginas, públicas y privadas.',
    [
      ['Paleta única definida como variables CSS', '`src/views/partials/kit-head.ejs`: fondo `#f6f1e7`, tinta `#2b241e`, acento terracota `#a3472b`; estados en `public/css/publico.css:6`.'],
      ['Tipografías', 'Host Grotesk (texto y títulos) y JetBrains Mono (cifras y código), cargadas de Google Fonts.'],
      ['Imágenes', 'Fotografías de talleres de calzado en la página de inicio, con licencia y créditos en /creditos; iconos SVG propios.'],
      ['Mismo aspecto en todas las páginas', 'Parciales compartidos `src/views/partials/app-inicio.ejs` y `app-fin.ejs` para todo el panel; capturas 05 a 22 del manual de usuario.'],
      ['Estados con color y texto', 'Chips cumple, cerca y lejos en tablero y tablas (no dependen solo del color).'],
    ],
    [figura('capturas/05-tablero.png', 'Tablero: tarjetas, colores de estado y tipografía.', { maxAlto: 330 })]),

    // 3 ---------------------------------------------------------------------------
    ...criterio(3, 'Front End: Navegabilidad y seguridad', 10, [
      ['Excelente', 'Utiliza protocolo https. Usa manejo de sesiones para el control de acceso a las páginas. Autenticación simple. Tiene una excelente navegabilidad.', '10'],
      ['Bueno', 'Usa manejo de sesiones para el control de acceso a las páginas. Autenticación simple. Tiene una buena navegabilidad.', '9'],
      ['Regular', 'Tiene una buena navegabilidad.', '8'],
      ['Suficiente', 'Tiene algunos errores en la navegación y algunas fallas en la seguridad.', '7'],
      ['No suficiente', 'No maneja seguridad. La navegabilidad es inconsistente.', '5'],
    ], 'Excelente', 10,
    'Las cuatro condiciones del nivel se cumplen y se comprueban en el sitio publicado y con pruebas automatizadas.',
    [
      ['HTTPS', `${SITIO} (candado del navegador). Redirección HTTP a HTTPS y HSTS de un año en \`src/middleware/seguridad.js:41\`.`],
      ['Sesiones para controlar el acceso', 'Sesión en servidor (`src/middleware/sesion.js`), cookie HttpOnly, Secure y SameSite=Lax; id regenerado al entrar (`src/controllers/web/AuthController.js:31`).'],
      ['Control de acceso por página y por rol', '`requiereSesion` y `requierePermiso` en `src/middleware/auth.js:26` y `:35`, aplicados en `src/routes/web.js` y `src/routes/api.js`. Una ruta privada sin sesión lleva a /login; sin permiso muestra Acceso restringido (403).'],
      ['Autenticación', 'Usuario y contraseña con bcrypt costo 12 (`src/models/Usuario.js:8`); bloqueo 15 minutos tras 5 intentos; protección CSRF.'],
      ['Pruebas de seguridad', `${ids(/^S/)}: 401 sin sesión, 403 sin token CSRF, credenciales incorrectas, bloqueo, cabeceras, inyección SQL.`],
      ['Navegabilidad', 'Menú lateral fijo con la sección activa marcada, enlace "Ver la página pública", regreso a la página pedida después de iniciar sesión, enlace para saltar al contenido, navegación con teclado. Mapa del sitio en la documentación técnica (sección 2.6).'],
    ],
    [figura('capturas/22-colaborador-sin-permiso.png', 'Un colaborador que abre una página de administración recibe Acceso restringido (403).', { maxAlto: 250 })]),

    // 4 ---------------------------------------------------------------------------
    ...criterio(4, 'Front End: Manejo del DOM', 10, [
      ['Excelente', 'Domina JavaScript para manipular el DOM.', '10'],
      ['Bueno', 'Utiliza JavaScript para manipular el DOM de manera adecuada.', '9'],
      ['Regular', 'Utiliza JavaScript para manipular el DOM de manera parcial.', '8'],
      ['Suficiente', 'No utiliza JavaScript para manipular el DOM de manera adecuada.', '7'],
      ['No suficiente', 'No utiliza JavaScript.', '5'],
    ], 'Excelente', 10,
    'Las páginas del panel funcionan con JavaScript propio, sin librerías: crean y actualizan elementos, validan formularios, dibujan gráficas y llaman a la API sin recargar la página.',
    [
      ['Creación segura de elementos', '`el()` en `public/js/pv.js:125`: crea nodos con `document.createElement` y texto escapado; nunca `innerHTML` con datos.'],
      ['Validación y errores por campo', '`validarLocal()` (`public/js/pv.js:94`) y `mostrarErrores()` (`:65`) marcan cada campo con su mensaje y `aria-invalid`.'],
      ['Tablas, filtros y paginación sin recargar', '`public/js/registros.js`: filtros, orden, paginación, alta y edición en panel lateral.'],
      ['Gráficas', '`public/js/tablero.js`: gráfica SVG de seis meses generada con el DOM.'],
      ['Interacción con la API', '`api()` en `public/js/pv.js` (fetch con token CSRF); calculadora con escenarios en `sessionStorage` y la sección solar que pinta datos de Open-Meteo (`public/js/calculadora.js`).'],
      ['Tamaño', `${fs.readdirSync(path.join(RAIZ, 'public', 'js')).length} módulos con ${fs.readdirSync(path.join(RAIZ, 'public', 'js')).reduce((s, f) => s + lineas(`public/js/${f}`), 0)} líneas en \`public/js\`.`],
    ],
    [...codigo(`// public/js/pv.js (extracto)
export function el(etiqueta, attrs = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(h instanceof Node ? h : String(h));
  return e;
}`),
    figura('capturas/09-registro-validacion.png', 'Validación en el navegador: cada campo muestra su error.', { maxAlto: 300 })]),

    // 5 ---------------------------------------------------------------------------
    ...criterio(5, 'Back End: Arquitectura y diseño', 15, [
      ['Excelente', 'Patrones arquitecturales: en capas, MVC. Patrones de diseño: utiliza por lo menos dos. Elabora los diagramas UML correspondientes.', '15'],
      ['Bueno', 'Uso de MVC, autenticación simple, por lo menos un patrón de diseño, algunos diagramas UML.', '14'],
      ['Regular', 'Uso de MVC, autenticación incompleta, por lo menos un patrón de diseño.', '13'],
      ['Suficiente', 'Uso de MVC, no hay autenticación.', '11'],
      ['No suficiente', 'No utiliza MVC ni capas, no hay autenticación, solo está en servidor local.', '8'],
    ], 'Excelente', 15,
    'Cuatro capas con MVC, cinco patrones de diseño implementados en el código (se piden dos) y once diagramas.',
    [
      ['Capas', 'Presentación (`src/views`, `public`), aplicación (`src/routes`, `src/controllers`, `src/middleware`), negocio (`src/services`, `src/models`, `src/patterns`), persistencia (`src/repositories`, `src/config/database.js`).'],
      ['MVC', 'Modelos en `src/models`, vistas EJS en `src/views`, controladores en `src/controllers/web` y `src/controllers/api`. Dependencias inyectadas en `src/container.js`.'],
      ['Strategy', '`src/patterns/estrategias/indicadores` (fórmula de cada indicador) y `src/patterns/estrategias/destinos` (destinos por clase de residuo).'],
      ['Factory', '`IndicadorStrategyFactory.para()` (`src/patterns/fabricas/IndicadorStrategyFactory.js:21`), `DestinoStrategyFactory`, `RegistroFactory`.'],
      ['Repository', '`src/repositories/BaseRepository.js` y ocho repositorios.'],
      ['Singleton', '`Database.getInstance()` en `src/config/database.js:40`.'],
      ['Observer', '`EventBus` (`src/patterns/eventos/EventBus.js:12`) y `BitacoraObserver`.'],
      ['Pruebas de los patrones', ids(/^U/)],
      ['Diagramas UML y de diseño', '`docs/diagramas`: arquitectura en capas, despliegue, casos de uso, clases, Strategy y Factory, Repository, Singleton y Observer, secuencia, entidad-relación, navegación, componentes y flujo.'],
    ],
    [figura('diagramas/png/01-arquitectura-capas.png', 'Arquitectura en capas con MVC.', { maxAlto: 420 }),
      figura('diagramas/png/05-patrones-strategy-factory.png', 'Patrones Strategy y Factory.', { maxAlto: 420 })]),

    // 6 ---------------------------------------------------------------------------
    ...criterio(6, 'Back End: Orientación a objetos', 15, [
      ['Excelente', 'Implementa el diseño y la programación orientada a objetos.', '15'],
      ['Bueno', 'Implementa el diseño y la programación orientada a objetos parcialmente.', '14'],
      ['Regular', 'Implementa el diseño y la programación orientada a objetos con errores de conceptos.', '13'],
      ['Suficiente', 'Implementa el diseño y la programación orientada a objetos de forma inconsistente.', '11'],
      ['No suficiente', 'No utiliza orientación a objetos.', '8'],
    ], 'Excelente', 15,
    'El dominio, los servicios, los repositorios, los controladores y los patrones son clases; se aplican encapsulamiento, herencia, polimorfismo, abstracción y composición, y el diseño está en el diagrama de clases.',
    [
      ['Encapsulamiento', 'Campos privados `#` con getters; por ejemplo `src/models/Usuario.js:16` en adelante. El hash de la contraseña no sale del objeto (`toJSON()` lo omite).'],
      ['Abstracción', 'Clase base abstracta `Entidad` (`src/models/Entidad.js:7`), que impide instanciarse con `new.target` (línea 11); `IndicadorStrategy` y `DestinoResiduoStrategy` abstractas.'],
      ['Herencia', '`RegistroConsumo`, `RegistroProduccion`, `RegistroSocial` y `RegistroResiduo` heredan de `Registro` (`src/models/Registro.js:144`, `:151`, `:162`, `:177`); controladores heredan de `WebController` y `ApiController`; repositorios de `BaseRepository`.'],
      ['Polimorfismo', '`calcular()` de cada estrategia de indicador y `validar()` de cada estrategia de destino; `validar()` redefinido en `RegistroResiduo`.'],
      ['Composición y asociación', '`AccionSustentable` contiene sus `Evidencia`; `Registro` se asocia con `Categoria` y `Usuario`.'],
      ['Inyección de dependencias', 'Servicios reciben repositorios y el bus por constructor en `src/container.js`; `ClimaService` recibe su función `fetch`, lo que permite probarlo sin red (W01 a W05).'],
      ['Clases en el proyecto', `${fs.readdirSync(path.join(RAIZ, 'src', 'models')).length} archivos de modelo, ${fs.readdirSync(path.join(RAIZ, 'src', 'services')).length} servicios, ${fs.readdirSync(path.join(RAIZ, 'src', 'repositories')).length} repositorios.`],
    ],
    [figura('diagramas/png/04-clases-dominio.png', 'Diagrama de clases del dominio.', { maxAlto: 520 })]),

    // 7 ---------------------------------------------------------------------------
    ...criterio(7, 'Back End: Interoperabilidad', 5, [
      ['Excelente', 'Diseña y crea por lo menos dos servicios.', '5'],
      ['Bueno', 'Diseña y crea por lo menos un servicio.', '4'],
      ['Regular', 'Consume por lo menos un servicio externo.', '3'],
      ['Suficiente', 'Presenta fallas en el consumo de un servicio externo.', '2'],
      ['No suficiente', 'No crea ni consume ningún servicio.', '1'],
    ], 'Excelente', 5,
    'Se diseñaron y crearon seis servicios REST propios (se piden dos), documentados con OpenAPI 3, y además se consume el servicio web público Open-Meteo.',
    [
      ['Servicio 1: registros (CRUD)', 'GET, POST, PUT, PATCH y DELETE en `/api/registros`. Pruebas ' + ids(/^R/) + '.'],
      ['Servicio 2: indicadores', '`/api/indicadores`, `/:id`, `/:id/serie`, `/:id/meta`. Pruebas ' + ids(/^I/) + '.'],
      ['Servicios 3 a 6', 'Acciones, residuos, calculadora y reportes (CSV). Pruebas ' + ids(/^[ACE]/) + '.'],
      ['Servicios públicos', '`/api/publico/pyme`, `/api/publico/indicadores`, `/api/publico/clima`. Pruebas ' + ids(/^P/) + ', W06.'],
      ['Documentación', `${SITIO}/api/docs y \`/api/docs/openapi.json\` (\`src/docs/openapi.js\`).`],
      ['Consumo de un servicio web público', '`src/services/ClimaService.js` consulta `https://api.open-meteo.com/v1/forecast` (radiación solar y temperatura de León), con tiempo máximo, caché de una hora y manejo de fallas (502). Se muestra en la calculadora. Pruebas ' + ids(/^W/) + '.'],
      ['Formato y errores', 'JSON `{ data, meta }`; errores `{ error: { codigo, mensaje, campos } }` con 401, 403, 404, 409, 422, 423, 429, 502.'],
    ],
    [...codigo(`GET ${SITIO}/api/publico/clima

200 OK
{ "data": { "fuente": "Open-Meteo", "lugar": "León, Guanajuato",
            "temperaturaActual": 20.7, "horasSolPico": 3.89,
            "generacionMensualPorKwp": 93.4, "dias": [ ... 7 días ... ] } }`),
    figura('capturas/26-calculadora-solar.png', 'Datos de Open-Meteo en la calculadora.', { maxAlto: 300 }),
    figura('capturas/04-documentacion-api.png', 'Documentación de la API en /api/docs.', { maxAlto: 300 })]),

    // 8 ---------------------------------------------------------------------------
    ...criterio(8, 'Back End: Persistencia', 15, [
      ['Excelente', 'Manejar por lo menos 5 tablas en la base de datos.', '15'],
      ['Bueno', 'Manejar por lo menos 4 tablas.', '14'],
      ['Regular', 'Manejar por lo menos 3 tablas.', '13'],
      ['Suficiente', 'Manejar por lo menos 2 tablas.', '11'],
      ['No suficiente', 'No tiene persistencia.', '8'],
    ], 'Excelente', 15,
    'La aplicación maneja nueve tablas de dominio relacionadas, más la tabla de sesiones, en PostgreSQL.',
    [
      ['Tablas', '`src/db/schema.sql`: pyme (línea 6), usuario (19), categoria (35), registro (49), indicador (72), accion (88), evidencia (108), parametro (118), bitacora (129) y session (142).'],
      ['Relaciones e integridad', 'Llaves foráneas con CASCADE, RESTRICT o SET NULL según el caso; restricciones CHECK y UNIQUE (documentación técnica, sección 3.5.2).'],
      ['CRUD completo', 'Registros y acciones: crear, leer, actualizar y eliminar desde la interfaz y la API; usuarios y categorías con baja lógica.'],
      ['Consultas parametrizadas', 'Todas las consultas usan `$1, $2...` en `src/repositories`. Pruebas S07 y S08 de inyección SQL.'],
      ['Base exportable', 'La carpeta de entrega incluye `base-de-datos/pyme_verde.sql` con la estructura y los datos de demostración.'],
      ['Base en la nube', 'Neon (PostgreSQL administrado) con conexión TLS.'],
    ],
    [figura('diagramas/png/08-modelo-entidad-relacion.png', 'Modelo entidad-relación.', { maxAlto: 520 })]),

    // 9 ---------------------------------------------------------------------------
    ...criterio(9, 'Despliegue de la aplicación', 10, [
      ['Excelente', 'Colocado en un servidor externo y funciona adecuadamente.', '10'],
      ['Bueno', 'Colocado en un servidor externo y funciona parcialmente.', '9'],
      ['Regular', 'Colocado en el servidor local y funciona bien.', '8'],
      ['Suficiente', 'Colocado en el servidor local y funciona parcialmente.', '7'],
      ['No suficiente', 'No funciona.', '5'],
    ], 'Excelente', 10,
    'La aplicación está publicada en un servidor externo gratuito con HTTPS y todas sus funciones operan contra la base en la nube.',
    [
      ['URL pública', SITIO],
      ['Servidor', 'Render, servicio web Node 22, plan gratuito; configuración en `render.yaml` (verificación de salud en `/salud`, línea 12; despliegue automático, línea 13).'],
      ['Base de datos', 'Neon, PostgreSQL administrado con TLS.'],
      ['Funcionamiento', 'Páginas públicas, inicio de sesión de ambos roles, registro, indicadores, calculadora con Open-Meteo, acciones, reportes y administración operan en el sitio publicado (manual de usuario y video).'],
      ['Comprobación rápida', `${SITIO}/salud responde 200; ${SITIO}/api/publico/indicadores responde JSON.`],
    ],
    [figura('diagramas/png/02-despliegue.png', 'Diagrama de despliegue.', { maxAlto: 330 })]),

    h1('Entregables', false),
    tabla(['Entregable pedido', 'Archivo o dirección'], [
      ['Video del funcionamiento', 'Archivo de video del equipo (guion en `Guion-del-video.txt` de la carpeta de entrega).'],
      ['Rúbrica con evidencias', 'Este documento.'],
      ['URL del proyecto en servidor gratuito', SITIO],
      ['Carpeta con los archivos del sistema y la base de datos', 'Carpeta de entrega: `codigo-fuente/` y `base-de-datos/pyme_verde.sql`.'],
      ['Documentación del proyecto según la guía', '`PyME-Verde_Documentacion-tecnica.docx` (capítulos I a IV), con el manual de usuario y el reporte técnico.'],
      ['Bloc de notas con URL, usuarios y contraseñas', '`Acceso-y-credenciales.txt` (usuario normal y administrador).'],
    ], [4, 6.4]),
  ]);
};
