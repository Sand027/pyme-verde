'use strict';

const fs = require('fs');
const path = require('path');
const { RAIZ, p, h1, h2, h3, vinetas, numerada, tabla, espacio, codigo, nota, figura, portada, indice, documento } = require('./comun');

/** Lee los resultados de `npm test` guardados como evidencia. */
function pruebas() {
  const texto = fs.readFileSync(path.join(RAIZ, 'docs', 'evidencias', 'pruebas-npm-test.txt'), 'utf8');
  return [...texto.matchAll(/✔ ([A-Z]\d{2}) (.+?) \(([\d.]+)ms\)/g)].map(([, id, desc, ms]) => [id, desc, `Pasa (${Math.max(1, Math.round(Number(ms)))} ms)`]);
}

/*
 * La estructura sigue la guía de documentación del proyecto (DAE, Evaluación Media, Programación Web):
 * Capítulo I Antecedentes, II Análisis del sistema, III Diseño del sitio, IV Desarrollo e implementación.
 */
module.exports = function tecnica() {
  const resultados = pruebas();
  const grupo = (letra) => resultados.filter(([id]) => id.startsWith(letra));
  const N = resultados.length;

  return documento('Documentación técnica', [
    portada('Documentación técnica', 'Antecedentes, análisis del sistema, diseño del sitio, desarrollo e implementación'),
    indice(),

    // ================================================================ CAPÍTULO I
    h1('Capítulo I. Antecedentes'),
    p('PyME Verde es una aplicación web que ayuda a una pequeña empresa a registrar sus consumos, residuos, producción y actividades sociales, calcular indicadores contra metas y dar seguimiento a un plan de mejora con responsables, fechas y evidencias. El caso de estudio es **Contrafuerte**, un taller familiar de calzado de piel en el barrio de San Miguel, en León, Guanajuato, con ocho colaboradores en dos áreas: corte y pespunte, y montado y acabado.'),
    nota('**Datos de demostración.** Los registros, costos y resultados que muestra la aplicación son datos de demostración creados para probar el sistema; no son mediciones reales del taller. Cada registro guarda su origen (`demostracion`, `medidor`, `recibo`, `bascula`, `inventario` o `estimacion`) y la interfaz lo indica en la página de inicio, en las tablas y en los reportes.'),

    h2('1.1 Problemática'),
    p('En el taller cada semana se acumulan recortes de piel y de suela que nadie pesa, los envases de pegamento con solvente se mezclan con la basura común y el recibo de luz sube sin que se sepa por qué. Como no hay registros, no se puede saber cuánto se desperdicia por par producido, si una medida de ahorro funcionó ni qué residuo debe ir con un gestor autorizado.'),
    vinetas([
      'No se mide el consumo de energía, agua y materia prima por par producido.',
      'Los residuos no se clasifican: el recorte aprovechable y los envases de manejo especial terminan en el relleno sanitario.',
      'No hay metas ni indicadores para comparar un mes con otro.',
      'Las acciones de mejora no tienen responsable, fecha ni evidencia.',
    ]),

    h2('1.2 Justificación'),
    p('Una herramienta web accesible desde la computadora del taller o desde el teléfono permite capturar el dato en el momento en que ocurre, calcular los indicadores sin hojas de cálculo y mostrar a la dueña, a los colaboradores y a los clientes cómo avanza el taller. Con el registro sistemático se pueden fijar metas medibles (por ejemplo, aprovechar al menos el 40 % de los residuos), decidir inversiones con un cálculo de ahorro y retorno, y cumplir con la separación de residuos de manejo especial. El proyecto aplica los temas de la materia: HTML5, CSS3 y JavaScript en el cliente, arquitectura MVC en capas, programación orientada a objetos, base de datos relacional, servicios web y despliegue en un servidor remoto con HTTPS.'),

    h2('1.3 Alcances y limitaciones'),
    h3('Alcances'),
    vinetas([
      'Sección pública con la presentación del taller, la problemática, los indicadores públicos y la documentación de la API.',
      'Registro, consulta, edición y eliminación de consumos, residuos, producción y actividades sociales, con validación en cliente y servidor.',
      'Siete indicadores ambientales, sociales y económicos calculados por periodo y comparados contra su meta, con gráfica de seis meses.',
      'Clasificación de residuos con destinos permitidos por clase y evidencia obligatoria para los de manejo especial.',
      'Calculadora de ahorro y retorno de la inversión, y estimación de paneles solares con datos del servicio web público Open-Meteo.',
      'Plan de acciones con responsable, fechas, avance y evidencias; reportes comparativos, versión imprimible y exportación CSV.',
      'Tres tipos de usuario (visitante, colaborador y administrador) verificados en el servidor; bitácora de eventos.',
      `API REST propia con seis servicios, documentada con OpenAPI 3, y ${N} pruebas automatizadas.`,
      'Despliegue en Render con base de datos PostgreSQL en Neon y HTTPS.',
    ]),
    h3('Limitaciones'),
    vinetas([
      'Los datos del caso son de demostración. Los resultados no describen el desempeño real de ningún taller.',
      'Los parámetros de la calculadora (tarifas, precio de la piel, factor de emisión) son supuestos que la administración debe sustituir por los de sus recibos y facturas.',
      'Las evidencias se registran como descripción y enlace; la aplicación no almacena archivos.',
      'Una instalación atiende a una empresa en la interfaz, aunque el modelo de datos ya separa todo por `pyme_id`.',
      'La aplicación no sustituye la asesoría ambiental ni la clasificación oficial de residuos peligrosos; ayuda a llevar el registro.',
      'En el plan gratuito de Render el servicio se suspende sin visitas y tarda cerca de un minuto en despertar; Neon limita las horas de cómputo.',
      'La estimación solar depende de que Open-Meteo responda; si no responde, la página lo indica y el resto de la aplicación sigue funcionando.',
    ]),

    h2('1.4 Objetivo general'),
    p('Desarrollar y publicar una aplicación web, con arquitectura MVC en capas y programación orientada a objetos, que permita a un taller de calzado de León registrar sus consumos, residuos, producción y actividades sociales, calcular indicadores de sustentabilidad contra metas y dar seguimiento a un plan de mejora, para apoyar la toma de decisiones ambientales, sociales y económicas.'),

    h2('1.5 Objetivos específicos'),
    ...numerada([
      'Analizar los procesos del taller e identificar los datos, usuarios y reglas de negocio que debe manejar el sistema.',
      'Diseñar la base de datos relacional y los diagramas UML (casos de uso, clases, secuencia, componentes y despliegue).',
      'Construir una interfaz responsiva con HTML5, CSS3 y JavaScript que valide los datos antes de enviarlos.',
      'Implementar el back end en capas con MVC, al menos dos patrones de diseño y control de acceso por sesión y rol.',
      'Crear servicios web REST propios y consumir un servicio web público.',
      'Probar el sistema con pruebas de caja blanca y de caja negra, incluida la protección contra inyección SQL.',
      'Publicar la aplicación en un servidor remoto gratuito con HTTPS y documentar su uso e instalación.',
    ]),

    h2('1.6 Módulos del proyecto'),
    tabla(['Módulo', 'Descripción', 'Usuario que accede', 'Acciones que puede realizar'], [
      ['Inicio público', 'Presentación del taller, problemática, indicadores públicos, preguntas frecuentes y documentación de la API.', 'Visitante, colaborador y administrador', 'Consultar información y la serie de los indicadores públicos; abrir /api/docs.'],
      ['Acceso', 'Inicio y cierre de sesión, bloqueo por intentos fallidos y cambio de contraseña.', 'Colaborador y administrador', 'Iniciar sesión, cerrar sesión, cambiar su contraseña en Perfil.'],
      ['Tablero de indicadores', 'Siete indicadores del periodo con su meta, estado, gráfica de seis meses y últimos registros.', 'Colaborador y administrador', 'Elegir mes, consultar indicadores y su serie.'],
      ['Registros', 'Captura y consulta de consumos, residuos, producción y actividades sociales.', 'Colaborador y administrador', 'Colaborador: crear, consultar y editar los propios. Administrador: además editar y eliminar cualquiera.'],
      ['Residuos y economía circular', 'Resumen por clase de residuo, destinos permitidos y recomendaciones.', 'Colaborador y administrador', 'Consultar el resumen y los destinos válidos de cada residuo.'],
      ['Calculadora de ahorro', 'Escenarios de reducción con ahorro, retorno y emisiones evitadas; recurso solar de León desde Open-Meteo.', 'Colaborador y administrador', 'Calcular, guardar y comparar escenarios; estimar kWp de paneles.'],
      ['Plan de acciones', 'Acciones con responsable, fechas, meta, indicador, avance y evidencias.', 'Colaborador y administrador', 'Colaborador: actualizar avance y evidencias de sus acciones. Administrador: crear, editar y eliminar.'],
      ['Reportes', 'Comparativo de dos periodos, versión imprimible y CSV.', 'Administrador', 'Comparar periodos, imprimir, exportar CSV.'],
      ['Administración', 'Usuarios, datos de la empresa, categorías, parámetros, metas y bitácora.', 'Administrador', 'Dar de alta usuarios, cambiar rol, desactivar, restablecer contraseña; editar catálogos y metas; consultar la bitácora.'],
    ], [2, 3.4, 2.2, 3.4], { tam: 17 }),
    espacio(),

    h2('1.7 Cronograma y roles de los integrantes del equipo'),
    h3('Roles'),
    tabla(['Integrante', 'Rol', 'Responsabilidades'], [
      ['Gonzalo Josue', 'Desarrollo back end', 'Modelo de datos y PostgreSQL; modelos, servicios, repositorios y patrones de diseño; API REST y su documentación OpenAPI; cliente del servicio web Open-Meteo; seguridad del servidor (sesiones, roles, CSRF, contraseñas); pruebas automatizadas; despliegue en Render y Neon.'],
      ['Oscar', 'Desarrollo front end', 'Diseño de la interfaz y del sistema visual; vistas EJS, HTML5 y CSS3 responsivo; JavaScript del navegador (manipulación del DOM, validación de formularios, gráficas, llamadas a la API); accesibilidad; pruebas manuales en distintos tamaños de pantalla; manual de usuario y documentación.'],
    ], [2, 2, 6.4]),
    espacio(),
    p('Las decisiones de análisis y diseño (casos de uso, modelo entidad-relación, reglas de negocio) se tomaron en conjunto.'),
    h3('Cronograma'),
    p('El proyecto siguió el modelo en cascada (sección 2.5). Las fechas son aproximadas, por semana del semestre AGO-DIC 2026.'),
    tabla(['Fase', 'Entregable', 'Periodo aproximado', 'Responsable'], [
      ['Antecedentes', '1er avance: capítulo I', 'Semanas 1 y 2 de septiembre', 'Ambos'],
      ['Análisis del sistema', '2do avance: reglas de negocio, requerimientos, modelo E-R, diagramas', 'Semanas 3 y 4 de septiembre', 'Ambos; diagramas de datos: Gonzalo Josue; mapa del sitio: Oscar'],
      ['Diseño del sitio', '3er avance: estructura MVC, interfaz, base de datos', 'Semanas 1 y 2 de octubre', 'Interfaz: Oscar; base de datos y capas: Gonzalo Josue'],
      ['Desarrollo', '4to avance: módulos, servicios web, seguridad', 'Semana 3 de octubre a semana 2 de noviembre', 'Back end: Gonzalo Josue; front end: Oscar'],
      ['Pruebas', 'Pruebas de caja blanca y caja negra; corrección de errores', 'Semanas 2 y 3 de noviembre', 'Automatizadas: Gonzalo Josue; manuales: Oscar'],
      ['Implantación y entrega', 'Despliegue en Render y Neon, manuales, video y exposición', 'Semanas 3 y 4 de noviembre', 'Ambos'],
    ], [2, 3.8, 2.6, 2.6], { tam: 17 }),
    espacio(),

    // ================================================================ CAPÍTULO II
    h1('Capítulo II. Análisis del sistema'),

    h2('2.1 Reglas de negocio'),
    p('Las reglas se aplican en el servidor (modelos y servicios) y, cuando es posible, también en la base de datos; la interfaz solo las anticipa.'),
    tabla(['Clave', 'Regla', 'Dónde se aplica'], [
      ['RN01', 'Solo los usuarios con sesión pueden registrar datos; el visitante solo consulta información pública.', '`requiereSesion`, `requierePermiso`'],
      ['RN02', 'Un colaborador solo puede editar los registros que él capturó; el administrador puede editar y eliminar cualquiera.', '`RegistroService`, permisos de `Rol`'],
      ['RN03', 'La fecha de un registro no puede estar en el futuro y la cantidad no puede ser negativa.', '`Registro.validar()`, CHECK'],
      ['RN04', 'En un residuo, la cantidad aprovechada no puede superar la cantidad generada.', '`RegistroResiduo.validar()`, CHECK'],
      ['RN05', 'Cada clase de residuo solo admite ciertos destinos; los de manejo especial exigen evidencia del gestor.', 'Strategy de destinos'],
      ['RN06', 'Una cuenta se bloquea 15 minutos después de cinco contraseñas equivocadas seguidas.', '`Usuario`, `AuthService`'],
      ['RN07', 'La contraseña tiene al menos 10 caracteres, con letras y números, y se guarda solo como hash bcrypt.', '`Usuario.crear()`, `cambiarPassword()`'],
      ['RN08', 'Una acción tiene fecha objetivo igual o posterior a la de inicio; al llegar a 100 % de avance queda completada.', '`AccionSustentable`, CHECK'],
      ['RN09', 'Solo el responsable de una acción o el administrador pueden actualizar su avance y evidencias.', '`AccionService`'],
      ['RN10', 'Un comparativo de reportes usa dos periodos de la misma duración.', '`ReporteService`'],
      ['RN11', 'Una categoría con registros no se borra: se desactiva para conservar el historial.', 'FK RESTRICT, baja lógica'],
      ['RN12', 'El visitante solo ve los indicadores que la administración marca como públicos.', '`IndicadorService.publicos()`'],
      ['RN13', 'Todo cambio de datos, inicio de sesión y bloqueo queda en la bitácora.', 'Observer `BitacoraObserver`'],
    ], [1, 6, 3]),
    espacio(),

    h2('2.2 Requerimientos funcionales y no funcionales'),
    h3('Usuarios y roles'),
    p('Se identificaron tres tipos de usuario. Los permisos se comprueban en el servidor en cada ruta (middleware `requierePermiso`) y, cuando depende del dueño del dato, también en el servicio. Ocultar un botón en la interfaz es solo una ayuda visual.'),
    tabla(['Usuario', 'Quién es en el taller', 'Qué puede hacer'], [
      ['Visitante', 'Cliente, proveedor, docente o cualquier persona sin cuenta.', 'Ver la presentación del taller, la problemática, las recomendaciones, los indicadores públicos con su serie y la documentación de la API.'],
      ['Colaborador', 'Jefatura de corte, área de pespunte.', 'Ver el tablero; registrar datos; consultar todos los registros; editar solo los registros que capturó; consultar residuos y calculadora; ver el plan y actualizar el avance y las evidencias de las acciones de las que es responsable; cambiar su contraseña.'],
      ['Administrador', 'Dueña o encargado del taller.', 'Todo lo anterior, más editar o eliminar cualquier registro, crear y editar acciones, cambiar metas, administrar categorías, parámetros, datos de la empresa y usuarios, generar reportes y exportar CSV, y consultar la bitácora.'],
    ], [2, 3, 6]),
    espacio(),
    h3('Matriz de permisos'),
    p('Los permisos están definidos en `src/models/Rol.js`. Cada rol es un objeto inmutable que agrupa permisos y responde `puede(permiso)`.'),
    tabla(['Permiso', 'Colaborador', 'Administrador'], [
      ['panel:ver', 'Sí', 'Sí'],
      ['registros:leer, registros:crear', 'Sí', 'Sí'],
      ['registros:editar_propios', 'Sí', 'Sí'],
      ['registros:editar_todos, registros:eliminar', 'No', 'Sí'],
      ['indicadores:leer', 'Sí', 'Sí'],
      ['indicadores:administrar (metas)', 'No', 'Sí'],
      ['acciones:leer, acciones:seguir_propias', 'Sí', 'Sí'],
      ['acciones:administrar', 'No', 'Sí'],
      ['reportes:generar', 'No', 'Sí'],
      ['catalogos:administrar, configuracion:administrar', 'No', 'Sí'],
      ['usuarios:administrar, bitacora:leer', 'No', 'Sí'],
    ], [6, 2, 2]),
    espacio(),
    h3('Requerimientos funcionales'),
    tabla(['Clave', 'Requerimiento', 'Rol'], [
      ['RF01', 'Mostrar el nombre, giro, ubicación general, problemática, objetivo y recomendaciones de la empresa.', 'Visitante'],
      ['RF02', 'Mostrar los indicadores marcados como públicos con su valor, meta, estado y serie mensual.', 'Visitante'],
      ['RF03', 'Iniciar y cerrar sesión con usuario y contraseña; bloquear la cuenta 15 minutos tras 5 intentos fallidos.', 'Todos'],
      ['RF04', 'Registrar un dato con categoría, fecha, cantidad, unidad, costo opcional, origen del dato y notas.', 'Colaborador, Admin.'],
      ['RF05', 'En residuos, registrar además la cantidad aprovechada, el destino y la evidencia del destino.', 'Colaborador, Admin.'],
      ['RF06', 'Consultar registros con filtros por periodo, tipo, categoría, origen y texto; ordenar y paginar.', 'Colaborador, Admin.'],
      ['RF07', 'Editar registros propios (colaborador) o cualquiera (administrador); eliminar registros (administrador).', 'Colaborador, Admin.'],
      ['RF08', 'Calcular siete indicadores por periodo y compararlos contra su meta (cumple, cerca, lejos, sin datos).', 'Colaborador, Admin.'],
      ['RF09', 'Mostrar la serie de seis meses de cada indicador en gráfica y tabla.', 'Colaborador, Admin.'],
      ['RF10', 'Resumir residuos por clase: generado, aprovechado, porcentaje, evidencias y recomendaciones.', 'Colaborador, Admin.'],
      ['RF11', 'Restringir los destinos de cada residuo según su clasificación y exigir evidencia en los de manejo especial.', 'Sistema'],
      ['RF12', 'Calcular ahorro mensual y anual, retorno de la inversión y emisiones evitadas de un escenario, mostrando los supuestos.', 'Colaborador, Admin.'],
      ['RF13', 'Crear, editar y eliminar acciones con responsable, fechas, meta e indicador relacionado.', 'Admin.'],
      ['RF14', 'Actualizar el avance de una acción y agregar evidencias (el responsable o la administración); al llegar a 100 % queda completada.', 'Colaborador, Admin.'],
      ['RF15', 'Comparar dos periodos de igual duración y generar un reporte imprimible.', 'Admin.'],
      ['RF16', 'Exportar los registros de un periodo a CSV.', 'Admin.'],
      ['RF17', 'Administrar usuarios (alta, rol, activación, restablecer contraseña).', 'Admin.'],
      ['RF18', 'Administrar datos de la empresa, categorías, parámetros de cálculo y metas.', 'Admin.'],
      ['RF19', 'Registrar en bitácora los inicios de sesión, bloqueos y cambios de datos.', 'Sistema'],
      ['RF20', 'Cambiar la contraseña propia.', 'Colaborador, Admin.'],
    ], [1.1, 7, 2]),
    espacio(),
    h3('Requerimientos no funcionales'),
    tabla(['Clave', 'Requerimiento', 'Cómo se cumple'], [
      ['RNF01 Responsivo', 'Usable en computadora, tableta y teléfono.', 'Diseño fluido con puntos de quiebre; en teléfono el menú lateral se vuelve un cajón y las tablas se desplazan dentro de su contenedor. Revisado a 390, 768 y 1366 px.'],
      ['RNF02 Accesibilidad', 'Navegable con teclado y lector de pantalla.', 'HTML semántico, etiquetas en todos los campos, mensajes de error ligados con `aria-describedby`, foco visible, enlace para saltar al contenido, contraste suficiente.'],
      ['RNF03 Seguridad', 'Cumplir la sección 9 de las indicaciones.', 'Ver la sección 4.3.'],
      ['RNF04 Rendimiento', 'Páginas ligeras.', 'Sin frameworks de cliente; compresión gzip; gráficas en SVG generadas en el navegador.'],
      ['RNF05 Mantenibilidad', 'Agregar funciones sin reescribir.', 'Capas separadas, inyección de dependencias desde `src/container.js`, patrones Strategy y Factory para indicadores y destinos.'],
      ['RNF06 Transparencia', 'No presentar datos simulados como reales; mostrar cómo se calcula.', 'Origen del dato en cada registro, fórmula y explicación en cada indicador, supuestos con fuente en la calculadora.'],
      ['RNF07 Privacidad', 'Recolección mínima de datos personales.', 'Solo nombre visible, usuario, correo de trabajo y rol; aviso en `/privacidad`.'],
    ], [2.2, 3, 6]),
    espacio(),

    h2('2.3 Modelo entidad-relación'),
    p('PostgreSQL con nueve tablas de dominio relacionadas y la tabla `session` para las sesiones del servidor. El diccionario de datos está en la sección 3.5.2.'),
    figura('diagramas/png/08-modelo-entidad-relacion.png', 'Modelo entidad-relación.', { maxAlto: 640 }),
    tabla(['Relación', 'Cardinalidad', 'Al borrar el padre', 'Por qué'], [
      ['pyme → usuario, categoria, registro, indicador, accion, parametro', '1:N', 'CASCADE', 'Todo pertenece a una empresa; el diseño admite varias empresas aunque el caso usa una.'],
      ['categoria → registro', '1:N', 'RESTRICT', 'No se puede borrar una categoría con registros; se desactiva (`activa = false`) para conservar el historial.'],
      ['usuario → registro (autor)', '1:0..N', 'SET NULL', 'Si se elimina una cuenta, sus registros siguen contando en los indicadores.'],
      ['usuario → accion (responsable, creado_por)', '1:0..N', 'SET NULL', 'La acción sobrevive aunque cambie el personal.'],
      ['indicador → accion', '1:0..N', 'SET NULL', 'Una acción puede quedar sin indicador sin perderse.'],
      ['categoria → indicador', '1:0..N', 'SET NULL', 'Indicadores como energía por par apuntan a la categoría que miden.'],
      ['accion → evidencia', '1:N', 'CASCADE', 'Una evidencia no tiene sentido sin su acción (composición).'],
      ['usuario → evidencia, bitacora', '1:0..N', 'SET NULL', 'La bitácora y las evidencias se conservan como historial.'],
    ], [3.6, 1.4, 1.6, 4.4], { tam: 17 }),
    espacio(),

    h2('2.4 Diagramas'),
    h3('Diagrama de casos de uso'),
    p('La tabla resume los casos de uso por actor; el diagrama muestra los mismos casos y la herencia entre actores: el colaborador puede hacer todo lo del visitante y el administrador todo lo del colaborador.'),
    tabla(['Caso', 'Actor', 'Descripción'], [
      ['CU01 Consultar información pública', 'Visitante', 'Ve la empresa, la problemática, los indicadores públicos y su serie.'],
      ['CU02 Iniciar sesión', 'Colaborador, Admin.', 'Entra con usuario y contraseña; el sistema crea una sesión y la registra en bitácora.'],
      ['CU03 Registrar dato', 'Colaborador, Admin.', 'Captura un consumo, residuo, producción o actividad social.'],
      ['CU04 Consultar y editar registros', 'Colaborador, Admin.', 'Filtra, ordena y corrige registros según su permiso.'],
      ['CU05 Consultar tablero de indicadores', 'Colaborador, Admin.', 'Ve tarjetas, tabla y gráfica de un periodo contra la meta.'],
      ['CU06 Revisar residuos y destinos', 'Colaborador, Admin.', 'Ve el resumen por clase y las opciones de aprovechamiento.'],
      ['CU07 Calcular escenario de ahorro', 'Colaborador, Admin.', 'Compara consumo actual contra el esperado con los supuestos vigentes.'],
      ['CU08 Dar seguimiento a una acción', 'Colaborador (responsable), Admin.', 'Actualiza el avance y agrega evidencias.'],
      ['CU09 Administrar el plan de acciones', 'Admin.', 'Crea, edita o elimina acciones.'],
      ['CU10 Generar reporte', 'Admin.', 'Compara dos periodos, imprime el reporte o exporta CSV.'],
      ['CU11 Administrar usuarios y configuración', 'Admin.', 'Usuarios, empresa, categorías, parámetros y metas.'],
      ['CU12 Consultar bitácora', 'Admin.', 'Revisa quién hizo qué y cuándo.'],
    ], [3.2, 2.4, 5]),
    espacio(),
    figura('diagramas/png/03-casos-de-uso.png', 'Diagrama de casos de uso.', { maxAlto: 700 }),
    h3('CU03 Registrar dato'),
    tabla(['Elemento', 'Descripción'], [
      ['Actor', 'Colaborador o administrador con sesión iniciada.'],
      ['Precondición', 'Existe al menos una categoría activa.'],
      ['Flujo principal', '1. Abre Registros y elige Nuevo registro.\n2. Elige la categoría; la unidad se llena con la de la categoría.\n3. Captura fecha, cantidad, costo opcional y origen del dato.\n4. Si es residuo, captura la cantidad aprovechada y elige un destino de la lista permitida para su clase.\n5. Guarda. El navegador valida y envía a `POST /api/registros`.\n6. El servidor valida de nuevo, guarda, publica `registro.creado` en el bus de eventos y responde 201.\n7. La tabla se actualiza sin recargar la página y aparece un mensaje de confirmación.'],
      ['Flujos alternos', 'A1. Falta un campo, la fecha es futura o la cantidad es negativa: el campo se marca con su mensaje y no se envía.\nA2. El servidor rechaza los datos (por ejemplo, residuo de manejo especial con destino relleno sanitario): responde 422 con el mensaje por campo y la interfaz lo muestra junto al campo.\nA3. La sesión expiró: responde 401 y se pide iniciar sesión.'],
      ['Postcondición', 'El registro existe, cuenta en los indicadores del periodo y aparece en la bitácora.'],
    ], [2, 8]),
    espacio(),
    h3('CU08 Dar seguimiento a una acción'),
    tabla(['Elemento', 'Descripción'], [
      ['Actor', 'Colaborador responsable de la acción, o administrador.'],
      ['Flujo principal', '1. Abre Plan de acciones y elige su acción.\n2. Mueve el control de avance y guarda; se envía `PATCH /api/acciones/:id/seguimiento`.\n3. Si el avance llega a 100 %, el estado cambia a completada; si es mayor que 0, a en proceso.\n4. Opcionalmente agrega una evidencia con fecha, descripción y enlace (`POST /api/acciones/:id/evidencias`).'],
      ['Flujos alternos', 'A1. Un colaborador intenta actualizar una acción de otra persona: el servidor responde 403.\nA2. Avance fuera de 0 a 100: 422.'],
      ['Postcondición', 'El indicador Avance del plan se recalcula con el nuevo avance.'],
    ], [2, 8]),
    espacio(),
    h3('CU10 Generar reporte'),
    tabla(['Elemento', 'Descripción'], [
      ['Actor', 'Administrador.'],
      ['Flujo principal', '1. Abre Reportes y elige el periodo A y el periodo B.\n2. El sistema calcula los indicadores de ambos periodos y la diferencia (`GET /api/reportes/comparativo`).\n3. Puede abrir la versión imprimible o descargar el CSV de registros.'],
      ['Flujos alternos', 'A1. Los periodos tienen distinta duración: 422 con el mensaje "Los dos periodos deben tener la misma cantidad de meses".\nA2. Un colaborador abre la ruta: página 403.'],
    ], [2, 8]),
    espacio(),
    h3('Diagrama de clases'),
    figura('diagramas/png/04-clases-dominio.png', 'Diagrama de clases del dominio.', { maxAlto: 640 }),
    p('El diseño orientado a objetos (encapsulamiento, herencia, polimorfismo y relaciones) se explica en la sección 3.3.'),
    h3('Diagrama de secuencia'),
    figura('diagramas/png/07-secuencia-alta-registro.png', 'Diagrama de secuencia del alta de un registro de residuo.', { maxAlto: 660 }),
    h3('Diagrama de componentes'),
    figura('diagramas/png/10-componentes.png', 'Diagrama de componentes.', { maxAlto: 560 }),
    p('El cliente web pide páginas a las rutas web y datos a la API REST; ambos pasan por el middleware de seguridad y usan los servicios de negocio. Los servicios guardan con los repositorios y publican eventos que el observador escribe en la bitácora. `ClimaService` es el único componente que sale a Internet: consume el servicio público Open-Meteo.'),
    h3('Diagrama de despliegue'),
    figura('diagramas/png/02-despliegue.png', 'Diagrama de despliegue.', { maxAlto: 360 }),

    h2('2.5 Planificación de la aplicación web (metodología cascada)'),
    p('Se eligió el modelo en cascada porque los requisitos estaban definidos desde el inicio por las indicaciones del proyecto y la rúbrica, y porque las entregas parciales de la materia coinciden con sus fases. Cada fase terminó con un entregable revisado antes de pasar a la siguiente.'),
    tabla(['Fase', 'Actividades', 'Producto'], [
      ['1. Requisitos', 'Estudio del caso, problemática, objetivos, módulos, roles y reglas de negocio.', 'Capítulo I y sección 2.1'],
      ['2. Análisis', 'Requerimientos funcionales y no funcionales, casos de uso, modelo E-R.', 'Secciones 2.2 a 2.4'],
      ['3. Diseño', 'Arquitectura MVC en capas, clases y patrones, interfaz, base de datos, mapa del sitio.', 'Capítulo III, diagramas'],
      ['4. Implementación', 'Back end (modelos, servicios, repositorios, API), front end (vistas, CSS, JavaScript), servicio web externo.', 'Código en GitHub'],
      ['5. Pruebas', `Pruebas automatizadas de caja blanca y caja negra (${N}), pruebas manuales por rol y por tamaño de pantalla.`, 'Sección 4.3 y evidencia en docs/evidencias'],
      ['6. Implantación', 'Despliegue en Render y Neon con HTTPS, credenciales de prueba, manual de usuario.', 'Sitio publicado, sección 4.4'],
    ], [2, 5.4, 3]),
    espacio(),
    p('El calendario de cada fase está en la sección 1.7.'),

    h2('2.6 Estructura lógica y mapeo del sitio'),
    h3('Diagrama de flujo'),
    figura('diagramas/png/11-diagrama-flujo.png', 'Diagrama de flujo del acceso y la captura de un registro.', { maxAlto: 640 }),
    h3('Mapa del sitio'),
    figura('diagramas/png/09-mapa-navegacion.png', 'Mapa de navegación por rol.', { maxAlto: 520 }),
    tabla(['Ruta', 'Página', 'Acceso'], [
      ['`/`', 'Inicio: empresa, problemática, indicadores públicos, recomendaciones', 'Público'],
      ['`/privacidad`, `/creditos`', 'Aviso de privacidad y créditos', 'Público'],
      ['`/api/docs`', 'Documentación interactiva de la API', 'Público'],
      ['`/login`', 'Inicio de sesión', 'Público'],
      ['`/panel`', 'Tablero de indicadores', 'Colaborador, Admin.'],
      ['`/panel/registros`', 'Registros', 'Colaborador, Admin.'],
      ['`/panel/residuos`', 'Residuos y economía circular', 'Colaborador, Admin.'],
      ['`/panel/calculadora`', 'Calculadora de ahorro', 'Colaborador, Admin.'],
      ['`/panel/acciones`', 'Plan de acciones', 'Colaborador, Admin.'],
      ['`/panel/reportes`, `/panel/reportes/imprimir`', 'Reportes', 'Admin.'],
      ['`/admin/usuarios`', 'Usuarios', 'Admin.'],
      ['`/admin/configuracion`', 'Empresa, categorías, parámetros y metas', 'Admin.'],
      ['`/admin/bitacora`', 'Bitácora', 'Admin.'],
      ['`/perfil`', 'Datos propios y cambio de contraseña', 'Colaborador, Admin.'],
    ], [3.5, 5, 2]),
    espacio(),
    h3('Estructura de la página principal'),
    figura('capturas/01-inicio.png', 'Página principal (/).', { maxAlto: 330 }),
    tabla(['Zona', 'Contenido'], [
      ['Encabezado', 'Logotipo, enlaces a las secciones de la página y botón Iniciar sesión.'],
      ['Portada', 'Título del caso, resumen del problema, cifra destacada y aviso de datos de demostración.'],
      ['Registro', 'Cómo se registra cada kilo de recorte y qué se mide.'],
      ['Indicadores', 'Indicadores públicos con valor, meta y estado, y su serie mensual.'],
      ['Enunciado y destinos', 'Objetivo del taller y destino que corresponde a cada clase de residuo.'],
      ['Preguntas', 'Preguntas frecuentes sobre los registros.'],
      ['Pie de página', 'Contacto, enlaces a privacidad, créditos y API, y la autoría del proyecto.'],
    ], [2.4, 8]),
    espacio(),
    h3('Página interna de muestra: tablero'),
    figura('capturas/05-tablero.png', 'Página interna: tablero de indicadores (/panel).', { maxAlto: 330 }),
    tabla(['Zona', 'Contenido'], [
      ['Menú lateral', 'Secciones del panel según el rol; en teléfono se convierte en un cajón que se abre con un botón.'],
      ['Encabezado', 'Título de la página, selector de mes y usuario con su rol.'],
      ['Indicadores por dimensión', 'Tarjetas ambientales, sociales y económicas con valor, meta y estado (cumple, cerca, lejos, sin datos).'],
      ['Serie de seis meses', 'Gráfica SVG generada en el navegador y tabla con los mismos datos.'],
      ['Plan de acciones y últimos registros', 'Conteo de acciones por estado y los registros más recientes.'],
      ['Pie', 'Versión, enlaces y la autoría del proyecto.'],
    ], [2.4, 8]),
    espacio(),

    // ================================================================ CAPÍTULO III
    h1('Capítulo III. Diseño del sitio'),

    h2('3.1 Estructura (patrones MVC y capas)'),
    p('La aplicación sigue una arquitectura en cuatro capas. Cada capa solo llama a la de abajo. Las vistas EJS reciben objetos ya preparados por los controladores y no tienen acceso a la base de datos; el único lugar donde se escribe SQL es la carpeta `src/repositories`.'),
    figura('diagramas/png/01-arquitectura-capas.png', 'Arquitectura en capas y su correspondencia con MVC.', { maxAlto: 520 }),
    tabla(['Capa', 'Carpetas', 'Responsabilidad'], [
      ['Presentación', '`src/views`, `public/css`, `public/js`', 'Vistas EJS (HTML semántico), estilos responsivos y módulos JavaScript que manipulan el DOM, validan formularios y llaman a la API con `fetch`.'],
      ['Aplicación', '`src/routes`, `src/controllers`, `src/middleware`', 'Reciben la petición, verifican sesión, permiso y token CSRF, pasan los datos al servicio y eligen la vista o la respuesta JSON.'],
      ['Negocio', '`src/services`, `src/models`, `src/patterns`, `src/utils`', 'Reglas del dominio: validación, permisos sobre el dueño del dato, cálculo de indicadores, destinos de residuos, eventos.'],
      ['Persistencia', '`src/repositories`, `src/config/database.js`, `src/db`', 'Consultas SQL parametrizadas, transacciones, conversión de filas a objetos del modelo, esquema y datos de demostración.'],
    ], [2, 3.5, 6]),
    espacio(),
    h3('Modelo, Vista, Controlador'),
    vinetas([
      '**Modelo:** clases de `src/models` (Pyme, Usuario, Rol, Categoria, Registro y sus subclases, Indicador, AccionSustentable, Evidencia, Parametro). Guardan el estado con campos privados y validan sus propias reglas.',
      '**Vista:** plantillas de `src/views` organizadas por área (`publico`, `auth`, `panel`, `admin`, `errores`) y parciales reutilizables (`partials`).',
      '**Controlador:** clases de `src/controllers/web` (devuelven HTML) y `src/controllers/api` (devuelven JSON). Ninguno contiene reglas de negocio: delegan en los servicios.',
    ]),
    p('Las dependencias se crean una sola vez en `src/container.js` (raíz de composición): los repositorios se inyectan en los servicios y los servicios en los controladores. Así una prueba puede sustituir cualquier pieza.'),
    h3('Estructura de carpetas'),
    ...codigo(`pyme-verde/
├── src/
│   ├── server.js            arranque: migra, siembra si AUTO_SEED, escucha
│   ├── app.js               crea la aplicación Express (middleware y rutas)
│   ├── container.js         raíz de composición (inyección de dependencias)
│   ├── config/              env.js (variables), database.js (Singleton)
│   ├── db/                  schema.sql, migrate.js, seed.js
│   ├── models/              clases del dominio
│   ├── patterns/            estrategias, fábricas y eventos
│   ├── repositories/        acceso a datos (Repository)
│   ├── services/            reglas de negocio
│   ├── controllers/web|api  controladores MVC
│   ├── middleware/          sesión, auth, CSRF, seguridad, errores
│   ├── routes/              web.js y api.js
│   ├── docs/openapi.js      especificación OpenAPI 3
│   └── views/               plantillas EJS
├── public/                  CSS, JavaScript del navegador e imágenes
├── tests/                   api.test.js y patrones.test.js
├── docs/                    diagramas, capturas, evidencias y documentos
├── render.yaml              despliegue en Render
└── .env.example             variables de entorno de ejemplo`),

    h2('3.2 Diseño de la interfaz (plantilla y adecuaciones)'),
    p('No se usó una plantilla comercial ni un framework de CSS. La interfaz se construyó sobre un sistema de diseño propio (carpeta `public/assets`: rejilla, tipografía, botones, tarjetas y animaciones) y dos hojas de estilo de la aplicación: `public/css/publico.css` para la sección pública y `public/css/app.css` para el panel. `public/css/impresion.css` da formato al reporte impreso.'),
    tabla(['Elemento', 'Decisión', 'Por qué'], [
      ['Paleta', 'Fondo color harina `#f6f1e7`, superficie `#ebe3d4`, tinta `#2b241e`, acento terracota `#a3472b`. Estados: verde `#3f6b47` cumple, ocre `#a8741a` cerca, terracota `#a3472b` lejos.', 'Colores del cuero y del taller; el contraste de la tinta sobre el fondo supera 12:1.'],
      ['Tipografía', 'Host Grotesk para títulos y texto; JetBrains Mono para cifras, rutas y código (Google Fonts).', 'Lectura clara en pantalla; las cifras monoespaciadas se alinean en tablas.'],
      ['Componentes', 'Tarjetas de indicador, chips de estado, tablas con desplazamiento propio, formularios con mensaje por campo, diálogos nativos `<dialog>`, avisos flotantes.', 'Mismo aspecto en todas las páginas del panel.'],
      ['Gráficas', 'SVG generado con JavaScript, sin librerías.', 'Páginas ligeras y gráficas nítidas a cualquier tamaño.'],
      ['Adecuaciones al caso', 'Fotografías de talleres de calzado en la sección pública (créditos en /creditos), chip "Dato de demostración" en tablas y reportes, explicación de la fórmula en cada indicador.', 'Contexto del taller y transparencia sobre los datos.'],
      ['Responsivo', 'Puntos de quiebre en 640, 1024 y 1280 px; menú lateral que se vuelve cajón; tablas que se desplazan dentro de su caja.', 'Uso desde el teléfono en el área de trabajo (sección 4.6).'],
    ], [1.8, 5, 3.6], { tam: 17 }),
    espacio(),

    h2('3.3 Diseño orientado a objetos y patrones de diseño'),
    h3('Encapsulamiento'),
    p('Los modelos guardan su estado en campos privados de JavaScript (`#campo`) y exponen solo lectura mediante getters. Para cambiar un objeto hay que usar un método que valida, por ejemplo `Usuario.cambiarPassword()`, `AccionSustentable.actualizarAvance()` o `Indicador.actualizarMeta()`. El hash de la contraseña nunca sale del objeto `Usuario` hacia una vista o respuesta JSON: `toJSON()` lo omite y solo el repositorio lo obtiene con `hashParaPersistir()`.'),
    h3('Herencia y polimorfismo'),
    vinetas([
      '`Entidad` es la clase base abstracta: guarda el `id` privado, permite asignarlo una sola vez (`asignarId()`) y obliga a cada subclase a definir `toJSON()`. De ella heredan todos los modelos.',
      '`Registro` es la base de `RegistroConsumo`, `RegistroProduccion`, `RegistroSocial` y `RegistroResiduo`. Solo `RegistroResiduo` agrega cantidad aprovechada, destino y evidencia, y valida que lo aprovechado no supere lo generado.',
      '`IndicadorStrategy` tiene seis subclases concretas y `DestinoResiduoStrategy` tiene cuatro. El servicio llama al mismo método (`calcular()`, `validar()`) y cada subclase responde a su manera.',
      'Las clases abstractas impiden instanciarse con `new.target` y lanzan un error si una subclase no implementa el método requerido.',
    ]),
    h3('Relaciones'),
    vinetas([
      '**Composición:** una `AccionSustentable` contiene sus `Evidencia`; si se elimina la acción, se eliminan sus evidencias (también en la base, con `ON DELETE CASCADE`).',
      '**Asociación:** `Registro` conoce su `Categoria` y su autor (`Usuario`); `AccionSustentable` conoce su responsable y su `Indicador`.',
      '**Dependencia:** los servicios reciben repositorios, el bus de eventos y las fábricas por constructor.',
    ]),
    h3('Responsabilidad de las clases principales'),
    tabla(['Clase', 'Responsabilidad'], [
      ['Usuario, Rol', 'Identidad, hash bcrypt (costo 12), bloqueo por intentos fallidos, permisos.'],
      ['Registro y subclases', 'Un dato medido; valida cantidad, fecha no futura, unidad y origen.'],
      ['Indicador', 'Definición (fórmula, unidad, meta, sentido) y evaluación del estado contra la meta.'],
      ['AccionSustentable, Evidencia', 'Plan de mejora; coherencia de fechas, avance de 0 a 100 y estado.'],
      ['RegistroService', 'Alta, consulta y edición de registros con permisos sobre el autor y reglas de destino.'],
      ['IndicadorService', 'Reúne registros, acciones y parámetros del periodo y delega el cálculo en cada estrategia.'],
      ['ResiduoService', 'Resumen por clase, destinos permitidos y recomendaciones.'],
      ['CalculadoraService', 'Ahorro, retorno de la inversión y emisiones evitadas de un escenario.'],
      ['ReporteService', 'Comparativo de periodos y exportación CSV.'],
      ['AuthService, UsuarioService', 'Inicio de sesión en tiempo constante, bloqueo, administración de cuentas.'],
    ], [3, 7]),
    h3('Patrones de diseño'),
    p('Se aplican cinco patrones. Cada uno resuelve un problema concreto del sistema y está en el código, no solo en el diagrama.'),
    tabla(['Patrón', 'Problema que resuelve', 'Archivos'], [
      ['Strategy', 'Cada indicador tiene su fórmula y cada clase de residuo sus destinos permitidos. Sin el patrón habría `switch` repetidos en servicios y vistas.', '`src/patterns/estrategias/indicadores/*`, `src/patterns/estrategias/destinos/*`'],
      ['Factory', 'Elegir la estrategia correcta a partir de una clave guardada en la base, y crear la subclase de Registro que corresponde al tipo de categoría.', '`IndicadorStrategyFactory`, `DestinoStrategyFactory`, `RegistroFactory`'],
      ['Repository', 'Aislar el SQL del resto de la aplicación y convertir filas en objetos del modelo.', '`src/repositories/*` (BaseRepository y ocho repositorios)'],
      ['Singleton', 'Un solo pool de conexiones a PostgreSQL para toda la aplicación.', '`src/config/database.js` (`Database.getInstance()`)'],
      ['Observer', 'Registrar en bitácora lo que pasa sin que cada servicio escriba en la bitácora.', '`EventBus`, `BitacoraObserver`'],
    ], [1.6, 5, 3.4]),
    espacio(),
    h3('Strategy y Factory'),
    figura('diagramas/png/05-patrones-strategy-factory.png', 'Strategy y Factory para indicadores y destinos de residuos.', { maxAlto: 600 }),
    p('El servicio de indicadores recorre las definiciones guardadas en la tabla `indicador` y, para cada una, pide a la fábrica la estrategia de su clave. Agregar un indicador nuevo es escribir una subclase y registrarla en la fábrica; el servicio no cambia.'),
    ...codigo(`// src/patterns/fabricas/IndicadorStrategyFactory.js (extracto)
static #registro = new Map([
  ['TASA_APROVECHAMIENTO', { estrategia: new E.TasaAprovechamientoStrategy(), ... }],
  ['RESIDUO_POR_PAR',      { estrategia: new E.IntensidadPorParStrategy(), ... }],
  ['AGUA_MENSUAL',         { estrategia: new E.PromedioMensualStrategy(), ... }],
  ...
]);
static para(clave) {
  const entrada = IndicadorStrategyFactory.#registro.get(clave);
  if (!entrada) throw new Error(\`No existe estrategia para el indicador "\${clave}".\`);
  return entrada.estrategia;
}`),
    p('Con los residuos pasa lo mismo: `DestinoStrategyFactory.para(clasificacion)` devuelve la estrategia de la clase y esta decide qué destinos acepta la parte aprovechada, a dónde va la parte que no se aprovecha y si se exige evidencia.'),
    tabla(['Estrategia', 'Clasificación', 'Destinos de lo aprovechado', 'Lo no aprovechado', 'Evidencia'], [
      ['ReutilizableStrategy', 'reutilizable', 'reutilización, donación, reciclaje', 'relleno sanitario', 'Opcional'],
      ['ReciclableStrategy', 'reciclable', 'reciclaje, reutilización', 'relleno sanitario', 'Opcional'],
      ['ManejoEspecialStrategy', 'peligroso', 'coprocesamiento', 'gestor de manejo especial', 'Obligatoria'],
      ['NoAprovechableStrategy', 'no aprovechable', 'ninguno', 'relleno sanitario', 'Opcional'],
    ], [2.8, 1.8, 2.8, 2, 1.4], { tam: 17 }),
    espacio(),
    h3('Repository, Singleton y Observer'),
    figura('diagramas/png/06-patrones-repository-singleton-observer.png', 'Repository, Singleton y Observer.', { maxAlto: 520 }),
    p('`BaseRepository` ofrece `consultar`, `uno`, `varios`, `eliminar` y `contar`, siempre con parámetros `$1, $2...`; cada repositorio concreto agrega sus consultas y su función `mapear()` que crea el objeto del modelo. Todos obtienen el pool con `Database.getInstance()`, que crea la instancia una sola vez.'),
    p('Los servicios publican eventos como `registro.creado`, `accion.seguimiento` o `sesion.bloqueada` en el `EventBus`. `BitacoraObserver` está suscrito a todos y escribe la fila en la tabla `bitacora`. Si un observador falla, el bus registra el error y continúa con los demás, de modo que la operación del usuario no se pierde (prueba U09).'),

    h2('3.4 Accesibilidad (tipos de sesiones de usuario y tipo de servidor)'),
    h3('Tipos de sesión de usuario'),
    tabla(['Tipo', 'Cómo se obtiene', 'Alcance'], [
      ['Visitante (sin sesión)', 'Abrir el sitio.', 'Páginas públicas, indicadores públicos, /api/docs y la API pública (`/api/publico/*`).'],
      ['Colaborador', 'Iniciar sesión con una cuenta de rol colaborador.', 'Panel, registros, residuos, calculadora y seguimiento de sus acciones.'],
      ['Administrador', 'Iniciar sesión con una cuenta de rol administrador.', 'Todo lo anterior más reportes, usuarios, configuración y bitácora.'],
    ], [2.4, 3.4, 4.6]),
    espacio(),
    p('La sesión se maneja en el servidor con `express-session`. Al iniciar sesión se regenera el identificador; la cookie `pv.sid` es HttpOnly, SameSite=Lax y Secure en producción, y la sesión expira tras 2 horas de inactividad. Las sesiones se guardan en la tabla `session` de PostgreSQL, por lo que sobreviven a un reinicio del servidor. Cerrar sesión destruye la sesión en el servidor.'),
    p('Accesibilidad de la interfaz: HTML semántico, etiqueta en cada campo, errores ligados con `aria-describedby`, foco visible, enlace para saltar al contenido, navegación completa con teclado y contraste suficiente.'),
    h3('Tipo de servidor'),
    p('Servidor de aplicaciones Node.js 22 con Express 4, ejecutado como servicio web en Render (plataforma como servicio, plan gratuito). Render termina TLS con su certificado y reenvía la petición al proceso Node; la aplicación redirige a HTTPS cualquier petición que llegue por HTTP y envía HSTS. La base de datos es PostgreSQL administrado en Neon. En desarrollo y pruebas se usa el mismo código con PostgreSQL local (sección 4.2).'),

    h2('3.5 Integración de bases de datos'),
    h3('3.5.1 Gestor de base de datos'),
    p('Se eligió **PostgreSQL** por estas razones:'),
    vinetas([
      'Es relacional y aplica integridad referencial y restricciones `CHECK`, que validan los datos aunque un cliente se salte la aplicación.',
      'Tiene tipos adecuados al caso: `numeric` exacto para cantidades y costos, `date` y `timestamptz` para fechas, `jsonb` para el detalle de la bitácora.',
      'Es software libre y tiene servicio administrado gratuito con SSL (Neon), lo que permite el despliegue remoto sin costo.',
      'El controlador `pg` de Node.js admite consultas parametrizadas y un pool de conexiones.',
      'Sirve también como almacén de sesiones (`connect-pg-simple`), sin otro servicio adicional.',
    ]),
    h3('3.5.2 Modelo usado en la base de datos y diccionario de datos'),
    p('Se usa el modelo relacional normalizado (tercera forma normal): cada tabla describe una entidad, las relaciones se expresan con llaves foráneas y no se guardan valores calculados (los indicadores se calculan a partir de los registros). El esquema completo está en `src/db/schema.sql` y se aplica al arrancar (`src/db/migrate.js`).'),
    p('**Restricciones de integridad**'),
    p('La base valida por su cuenta, aunque un cliente se salte la validación de la aplicación:'),
    vinetas([
      '`CHECK (cantidad >= 0)`, `CHECK (costo IS NULL OR costo >= 0)`, `CHECK (valor >= 0)`, `CHECK (meta >= 0)`.',
      '`cantidad_aprovechada` entre 0 y `cantidad`.',
      'Listas cerradas con `CHECK ... IN (...)` para rol, tipo de categoría, clasificación, origen del dato, destino, dimensión, sentido y estado.',
      '`categoria_clasificacion_residuo`: solo los residuos tienen clasificación y todo residuo debe tenerla.',
      '`accion_fechas`: la fecha objetivo no puede ser anterior a la de inicio. `accion_completada`: una acción completada tiene avance 100.',
      '`avance BETWEEN 0 AND 100`, `num_colaboradores > 0`, `intentos_fallidos >= 0`.',
      'Únicos: `usuario.username`, `usuario.correo`, `(pyme_id, nombre)` en categoría, `(pyme_id, clave)` en indicador y parámetro.',
      'Índices para las consultas frecuentes: registros por empresa y fecha, por categoría; acciones por estado; bitácora por fecha.',
    ]),
    p('**Diccionario de datos**'),
    ...diccionario(),
    p('**Operaciones CRUD**'),
    p('C: crear, R: leer, U: actualizar, D: eliminar. "Lógica" indica una baja que conserva la fila; "Semilla", que la fila se crea con los datos iniciales.'),
    tabla(['Tabla', 'C', 'R', 'U', 'D', 'Rutas'], [
      ['registro', 'Sí', 'Sí', 'Sí', 'Sí', 'POST /api/registros · GET /api/registros y /api/registros/:id · PUT /api/registros/:id · PATCH /api/registros/:id/origen · DELETE /api/registros/:id'],
      ['accion', 'Sí', 'Sí', 'Sí', 'Sí', 'POST /api/acciones · GET /api/acciones y /api/acciones/:id · PUT /api/acciones/:id · PATCH /api/acciones/:id/seguimiento · DELETE /api/acciones/:id'],
      ['evidencia', 'Sí', 'Sí', 'No', 'Cascada', 'POST /api/acciones/:id/evidencias; se leen dentro de GET /api/acciones/:id; se eliminan con su acción.'],
      ['usuario', 'Sí', 'Sí', 'Sí', 'Lógica', 'POST /admin/usuarios · GET /admin/usuarios · POST /admin/usuarios/:id y /perfil/contrasena. Se desactiva (activo = false) para conservar el historial.'],
      ['categoria', 'Sí', 'Sí', 'Sí', 'Lógica', 'POST /admin/configuracion/categorias · GET /api/registros/categorias · POST /admin/configuracion/categorias/:id. Se desactiva (activa = false).'],
      ['indicador', 'Semilla', 'Sí', 'Sí', 'No', 'GET /api/indicadores, /:id y /:id/serie · PATCH /api/indicadores/:id/meta. Cada indicador está ligado a una estrategia, por eso se crea con la semilla.'],
      ['parametro', 'Semilla', 'Sí', 'Sí', 'No', 'GET /api/calculadora/supuestos · POST /admin/configuracion/parametros/:id'],
      ['pyme', 'Semilla', 'Sí', 'Sí', 'No', 'GET /api/publico/pyme · POST /admin/configuracion/empresa'],
      ['bitacora', 'Sí', 'Sí', 'No', 'No', 'La escribe BitacoraObserver; se consulta en GET /admin/bitacora. Solo inserción.'],
    ], [1.3, 0.8, 0.6, 0.6, 0.9, 6.2], { tam: 16 }),
    espacio(),
    p('**Consultas parametrizadas**'),
    p('Ninguna consulta concatena datos del usuario. Todas usan marcadores posicionales y el controlador `pg` envía los valores aparte del texto SQL. Los nombres de columna para ordenar se eligen de una lista fija en el repositorio, nunca del texto recibido.'),
    ...codigo(`// src/repositories/UsuarioRepository.js (extracto)
return this.varios('SELECT * FROM usuario WHERE pyme_id = $1 AND activo ORDER BY nombre', [pymeId]);`),

    // ================================================================ CAPÍTULO IV
    h1('Capítulo IV. Desarrollo e implementación'),

    h2('4.1 Desarrollo de módulos'),
    p('Cada módulo de la sección 1.6 se implementó con su vista, su controlador, su servicio y, cuando aplica, su servicio REST. Las capturas completas por rol están en el manual de usuario.'),
    tabla(['Módulo', 'Vista y script del navegador', 'Controlador y servicio', 'API'], [
      ['Inicio público', '`publico/inicio.ejs`', '`PublicoController`, `CatalogoService`, `IndicadorService`', '`/api/publico/*`'],
      ['Acceso', '`auth/login.ejs`, `auth/perfil.ejs`', '`AuthController`, `AuthService`', '`/api/sesion`'],
      ['Tablero', '`panel/tablero.ejs`, `tablero.js`', '`PanelController`, `IndicadorService`', 'Servicio 2'],
      ['Registros', '`panel/registros.ejs`, `registros.js`', '`RegistroService`', 'Servicio 1'],
      ['Residuos', '`panel/residuos.ejs`, `residuos.js`', '`ResiduoService`, estrategias de destino', 'Servicio 4'],
      ['Calculadora', '`panel/calculadora.ejs`, `calculadora.js`', '`CalculadoraService`, `ClimaService`', 'Servicio 5, `/api/publico/clima`'],
      ['Plan de acciones', '`panel/acciones.ejs`, `acciones.js`', '`AccionService`', 'Servicio 3'],
      ['Reportes', '`panel/reportes.ejs`, `reporte-imprimible.ejs`', '`ReporteService`', 'Servicio 6'],
      ['Administración', '`admin/*.ejs`', '`AdminController`, `UsuarioService`, `CatalogoService`', 'Formularios con CSRF'],
    ], [2, 3, 3.4, 2], { tam: 16 }),
    espacio(),
    figura('capturas/07-registros.png', 'Módulo de registros con filtros y paginación.', { maxAlto: 300 }),
    figura('capturas/12-acciones.png', 'Módulo de plan de acciones.', { maxAlto: 300 }),
    figura('capturas/14-reportes.png', 'Módulo de reportes.', { maxAlto: 300 }),
    p('El JavaScript del navegador manipula el DOM sin librerías: crea filas y tarjetas con `document.createElement` (función `el()` de `public/js/pv.js`, que nunca usa `innerHTML` con datos), valida formularios antes de enviarlos, muestra los errores del servidor junto a cada campo, abre diálogos y paneles, dibuja las gráficas en SVG y actualiza la página con las respuestas de la API sin recargarla.'),

    h2('4.2 Implementación en test server'),
    p('Antes de publicar, la aplicación se ejecutó y probó en un servidor de pruebas local:'),
    vinetas([
      'Servidor de aplicaciones: `npm run dev` en `http://localhost:3000`, el mismo código que corre en Render.',
      'Base de datos de desarrollo: PostgreSQL embebido que levanta `npm run db:local` en el puerto 5433, con la base `pyme_verde` y el caso de demostración (`npm run db:seed`).',
      'Base de pruebas separada: `pyme_verde_test`. Las pruebas automatizadas la recrean en cada corrida y se niegan a correr si el nombre de la base no contiene "test", para no borrar datos reales.',
      'Modo producción local: arranque con `NODE_ENV=production` y una petición que simula el reenvío del proveedor, para comprobar la redirección a HTTPS, HSTS y la cookie Secure.',
    ]),
    ...codigo(`GET /salud                               200
GET / con X-Forwarded-Proto: http        301 -> https://...
Set-Cookie: pv.sid=...; Path=/; HttpOnly; Secure; SameSite=Lax
Strict-Transport-Security: max-age=31536000; includeSubDomains`),
    h3('Instalación local'),
    p('**Requisitos**'),
    vinetas(['Node.js 20 o superior (se probó con 22 y 26).', 'PostgreSQL 14 o superior. Para desarrollo no hace falta instalarlo: `npm run db:local` levanta uno embebido.', 'Git.']),
    p('**Instalación local**'),
    ...numerada([
      'Obtener el código: `git clone <url del repositorio>` y entrar a la carpeta.',
      'Instalar dependencias: `npm install`.',
      'Copiar `.env.example` como `.env`. Para las cuentas de prueba, escribir contraseñas en `SEED_ADMIN_PASSWORD` y `SEED_COLABORADOR_PASSWORD`; si se dejan vacías, la semilla genera unas aleatorias y las muestra una sola vez en la consola.',
      'En otra terminal, iniciar la base local: `npm run db:local` (puerto 5433). Si ya se tiene PostgreSQL, basta con ajustar `DATABASE_URL`.',
      'Crear tablas y cargar el caso de demostración: `npm run db:seed`. Para borrar y volver a cargar: `npm run db:reset`.',
      'Iniciar: `npm run dev` (se reinicia al guardar) o `npm start`.',
      'Abrir `http://localhost:3000`.',
    ]),
    p('**Variables de entorno**'),
    tabla(['Variable', 'Ejemplo o valor', 'Uso'], [
      ['NODE_ENV', 'development | production | test', 'En producción activa cookie Secure, HSTS y redirección a HTTPS.'],
      ['PORT', '3000', 'Puerto HTTP (Render lo asigna solo).'],
      ['DATABASE_URL', 'postgres://usuario:clave@host/base?sslmode=require', 'Conexión a PostgreSQL. Con `sslmode=require` se activa SSL verificado.'],
      ['SESSION_SECRET', 'cadena aleatoria de 32+ caracteres', 'Firma de la cookie. En producción es obligatoria.'],
      ['AUTO_SEED', 'true', 'Al arrancar, carga el caso de demostración si la base está vacía. Nunca borra datos.'],
      ['SEED_ADMIN_PASSWORD', '(secreta)', 'Contraseña de `admin.demo`.'],
      ['SEED_COLABORADOR_PASSWORD', '(secreta)', 'Contraseña de `colaborador.demo`.'],
      ['TEST_DATABASE_URL', 'postgres://.../pyme_verde_test', 'Base para `npm test`; opcional en local.'],
    ], [2.6, 3.4, 4.4], { tam: 17 }),
    espacio(),

    h2('4.3 Seguridad'),
    p('La tabla recorre cada medida de seguridad, dónde está implementada y qué prueba la verifica.'),
    tabla(['Medida pedida', 'Implementación', 'Verificación'], [
      ['Contraseñas con hash', 'bcrypt con costo 12 (`Usuario.crear`, `cambiarPassword`). El inicio de sesión compara contra un hash ficticio cuando el usuario no existe, para que el tiempo de respuesta no revele si la cuenta existe.', 'S03; revisión de la tabla `usuario`'],
      ['Validación en cliente y servidor', 'Cliente: atributos HTML y `validarLocal()` y `mostrarErrores()` de `public/js/pv.js`, con mensaje por campo. Servidor: `Validador` y los métodos `validar()` de cada modelo; además las restricciones CHECK de la base.', 'R04, R05, A03, C03'],
      ['Consultas parametrizadas', 'Todas las consultas usan `$1, $2...` (sección 3.5.2).', 'S07, S08; revisión de `src/repositories`'],
      ['Rutas privadas y roles', '`requiereSesion` y `requierePermiso` en cada ruta; el servicio comprueba además el dueño del registro o el responsable de la acción.', 'S01, R07, I03, A02, A06, E03'],
      ['Sesiones seguras y cookies', 'express-session con almacén en PostgreSQL; cookie `pv.sid` HttpOnly, SameSite=Lax y Secure en producción; expira tras 2 horas de inactividad; el id de sesión se regenera al iniciar sesión.', 'S05; prueba local en modo producción'],
      ['Protección CSRF', 'Token sincronizado por sesión, comparado en tiempo constante, en formularios (`_csrf`) y en la API (`X-CSRF-Token`).', 'S02'],
      ['Errores sin detalles internos', 'Manejador central: los errores esperados devuelven su mensaje; los no esperados devuelven un mensaje genérico y el detalle solo va al registro del servidor.', 'S01, S06'],
      ['Datos personales mínimos', 'Solo nombre visible, usuario, correo de trabajo y rol. Aviso en `/privacidad`.', 'Revisión del esquema'],
      ['HTTPS', 'Render provee el certificado; la aplicación redirige HTTP a HTTPS y envía HSTS de un año.', 'Prueba local en modo producción (301 y HSTS)'],
      ['Medidas adicionales', 'Bloqueo de cuenta tras 5 intentos durante 15 minutos; límite de 20 intentos de inicio de sesión fallidos por IP; CSP con nonce; `X-Content-Type-Options: nosniff`; `frame-ancestors none`; bitácora de eventos.', 'S04, S05'],
    ], [2.2, 5.6, 2.4], { tam: 17 }),
    espacio(),
    h3('Validaciones contra inyecciones SQL'),
    p('Ninguna consulta concatena datos del usuario: todas usan marcadores `$1, $2...` y el controlador `pg` envía los valores aparte del texto SQL. El orden de las listas se elige de una lista blanca de columnas en el repositorio. Las pruebas S07 y S08 envían cadenas de inyección (`\' OR \'1\'=\'1`, `admin.demo\' --` y `fecha; DROP TABLE registro; --`) al inicio de sesión, al filtro de texto y al parámetro de orden: no se inicia sesión, el filtro se trata como texto (cero resultados) y la tabla conserva todos sus registros.'),
    h3('Contraseñas para el inicio de sesión y para el servidor'),
    vinetas([
      '**Login:** mínimo 10 caracteres con letras y números; se guardan con bcrypt (costo 12); bloqueo de 15 minutos tras 5 intentos; límite de 20 intentos fallidos por IP; mensaje genérico que no revela si el usuario existe.',
      '**Servidor:** las credenciales de la base (cadena de conexión de Neon con usuario y contraseña), el secreto de sesión y las contraseñas de las cuentas de prueba son variables de entorno secretas en Render. No están en el código ni en el repositorio: `.env` está en `.gitignore` y `.env.example` solo trae valores de ejemplo.',
      '**Cuentas de GitHub, Render y Neon:** protegidas por los integrantes del equipo; el acceso a la base solo es posible con TLS (`sslmode=require`).',
    ]),
    h3('Pruebas de caja blanca'),
    p('Se prueban las clases internas conociendo su código: estrategias, fábricas, bus de eventos, cálculo de la calculadora y el cliente de Open-Meteo con un `fetch` simulado (conversión de unidades, caché y manejo de fallas). Están en `tests/patrones.test.js`.'),
    tabla(['Id', 'Prueba', 'Resultado'], [...grupo('U'), ...grupo('W').filter(([id]) => id !== 'W06')], [0.8, 7.2, 2], { tam: 17 }),
    espacio(),
    h3('Pruebas de caja negra'),
    p('Se prueba la aplicación desde fuera, solo por sus entradas y salidas HTTP, igual que un cliente: `tests/api.test.js` levanta la aplicación real contra la base de pruebas, inicia sesión por el formulario real con cada rol y verifica códigos y respuestas.'),
    ...codigo('npm test'),
    p(`Resultado de la última ejecución: **${N} pruebas, ${N} pasan, 0 fallan**. La salida completa está en \`docs/evidencias/pruebas-npm-test.txt\`.`),
    p('**Datos públicos y seguridad**'),
    tabla(['Id', 'Prueba', 'Resultado'], [...grupo('P'), ...grupo('S')], [0.8, 7.2, 2], { tam: 17 }),
    espacio(),
    p('**Servicios 1 y 2: registros e indicadores**'),
    tabla(['Id', 'Prueba', 'Resultado'], [...grupo('R'), ...grupo('I')], [0.8, 7.2, 2], { tam: 17 }),
    espacio(),
    p('**Servicios 3 a 6 y servicio externo**'),
    tabla(['Id', 'Prueba', 'Resultado'], [...grupo('A'), ...grupo('C'), ...grupo('E'), ...grupo('W').filter(([id]) => id === 'W06')], [0.8, 7.2, 2], { tam: 17 }),
    espacio(),
    p('**Pruebas manuales de caja negra**'),
    tabla(['Prueba', 'Procedimiento', 'Resultado'], [
      ['Recorrido de páginas', 'Se abrieron todas las rutas con cada rol y sin sesión, registrando el código HTTP.', 'Las páginas permitidas responden 200 y las no permitidas 403 o redirigen a `/login`. Ningún 500.'],
      ['Entradas incorrectas', 'Formularios enviados vacíos, con fechas futuras, cantidades negativas y aprovechado mayor que lo generado.', 'Cada campo muestra su mensaje (manual de usuario, sección 4.2).'],
      ['Diseño responsivo', 'Revisión a 390, 768 y 1366 px de ancho.', 'Sin desplazamiento horizontal de la página; menú en cajón en teléfono.'],
      ['Teclado', 'Navegación con Tab, Enter y Escape en menú, formularios y paneles.', 'Foco visible y panel cerrable con Escape.'],
      ['Cálculo de indicadores', 'Se comparó el valor del indicador con la suma manual de los registros del periodo.', 'Coincide; la explicación de cada indicador muestra numerador y denominador.'],
      ['Modo producción', 'Arranque con `NODE_ENV=production` (sección 4.2).', 'HTTPS forzado, cookie Secure, HSTS.'],
    ], [2.2, 4.4, 4]),

    h2('4.4 Hospedaje y dominio del sitio web'),
    tabla(['Elemento', 'Valor'], [
      ['Sitio publicado', 'https://pyme-verde.onrender.com'],
      ['Dominio', 'Subdominio gratuito de Render (`onrender.com`), con certificado TLS que Render emite y renueva automáticamente.'],
      ['Hospedaje de la aplicación', 'Render, servicio web Node, plan gratuito, región Oregon (EE. UU.), despliegue automático en cada `push` a la rama `main`.'],
      ['Base de datos', 'Neon, PostgreSQL administrado, plan gratuito, conexión con TLS.'],
      ['Código fuente', 'https://github.com/Sand027/pyme-verde'],
      ['Verificación de salud', '`GET /salud` responde 200; Render lo usa para saber si el servicio arrancó.'],
    ], [2.6, 7.8]),
    espacio(),
    h3('Publicación en Render y Neon'),
    ...numerada([
      'Subir el código a un repositorio de GitHub (el archivo `.env` está en `.gitignore` y no se sube).',
      'En neon.tech crear un proyecto (región cercana a la de Render, por ejemplo AWS us-west-2 para Oregon) y copiar la cadena de conexión, que ya termina en `?sslmode=require`.',
      'En render.com elegir New, Blueprint y seleccionar el repositorio. Render lee `render.yaml` y crea el servicio web `pyme-verde` con Node 22, `npm ci --omit=dev`, `npm start` y verificación de salud en `/salud`.',
      'Capturar en Render las variables marcadas como secretas: `DATABASE_URL` (la de Neon), `SEED_ADMIN_PASSWORD` y `SEED_COLABORADOR_PASSWORD`. `SESSION_SECRET` la genera Render.',
      'Al primer arranque la aplicación crea las tablas y, como `AUTO_SEED=true`, carga el caso de demostración.',
      'Abrir la URL `https://<nombre>.onrender.com`, iniciar sesión con cada rol y comprobar el candado de HTTPS.',
    ]),
    nota('El plan gratuito de Render suspende el servicio tras unos minutos sin visitas; la primera petición después tarda cerca de un minuto en responder. Conviene abrir el sitio un par de minutos antes de la evaluación.'),

    h2('4.5 Implementación del cliente de los servicios web'),
    h3('Consumo de un servicio web público: Open-Meteo'),
    p('La aplicación consume el servicio web público **Open-Meteo** (`https://api.open-meteo.com/v1/forecast`), que entrega pronósticos meteorológicos en JSON sin clave de acceso. Se usa para estimar cuántos paneles solares necesitaría el taller.'),
    vinetas([
      '**Cliente:** la clase `ClimaService` (`src/services/ClimaService.js`) arma la URL con la latitud y longitud de León, pide la radiación solar diaria (`shortwave_radiation_sum`), las temperaturas máxima y mínima y la temperatura actual de los próximos siete días, con un tiempo máximo de espera de 5 segundos.',
      '**Transformación:** convierte la radiación de MJ/m² a kWh/m² (÷ 3.6), calcula las horas de sol pico (promedio de kWh/m² al día) y la generación mensual por kWp instalado: horas de sol pico × 30 días × 0.8 de rendimiento.',
      '**Caché y fallas:** guarda la respuesta una hora en memoria. Si Open-Meteo falla y hay copia, la devuelve marcada como desactualizada; si no hay copia, responde 502 con un mensaje claro (`ServicioExternoError`). El resto de la aplicación no depende de este servicio.',
      '**Exposición:** `GET /api/publico/clima` (documentado en `/api/docs`). La calculadora lo pide con `fetch` y muestra horas de sol pico, generación por kWp, kWp necesarios para el consumo capturado, temperatura y una tabla de siete días.',
      '**Pruebas:** W01 a W05 (caja blanca, con respuesta simulada) y W06 (caja negra, la ruta completa).',
    ]),
    ...codigo(`// src/services/ClimaService.js (extracto)
const res = await fetch(this.urlConsulta(), {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(this.#timeout),
});
if (!res.ok) throw new Error(\`respondió HTTP \${res.status}\`);
const datos = ClimaService.interpretar(await res.json(), this.#lugar);`),
    figura('capturas/26-calculadora-solar.png', 'Recurso solar de León con datos de Open-Meteo en la calculadora.', { maxAlto: 330 }),
    h3('Servicios web propios (API REST)'),
    p('La API REST vive bajo `/api` y responde JSON. Hay seis servicios propios, más los endpoints públicos (incluido el que expone los datos de Open-Meteo) y el de sesión. La especificación OpenAPI 3 se publica en `/api/docs/openapi.json` y se puede leer en `/api/docs`.'),
    h3('Convenciones'),
    tabla(['Aspecto', 'Convención'], [
      ['Autenticación', 'Cookie de sesión `pv.sid` (HttpOnly) creada al iniciar sesión en `/login`. Sin sesión: 401.'],
      ['CSRF', 'Las peticiones POST, PUT, PATCH y DELETE envían el token en la cabecera `X-CSRF-Token`; se obtiene en `GET /api/sesion`. Sin token válido: 403.'],
      ['Respuesta correcta', '`{ "data": ..., "meta": ... }`. `meta` lleva el periodo o la paginación.'],
      ['Error', '`{ "error": { "codigo", "mensaje", "campos" } }`. Nunca incluye la pila ni detalles del servidor.'],
      ['Códigos', '200 consulta o cambio · 201 creado, con cabecera `Location` · 204 eliminado · 401 sin sesión · 403 sin permiso o sin token · 404 no existe · 409 conflicto con un dato existente o con una regla de integridad · 422 datos inválidos · 423 cuenta bloqueada · 429 demasiadas peticiones · 500 error interno (mensaje genérico).'],
      ['Periodo', 'Parámetros `desde` y `hasta` en formato AAAA-MM-DD.'],
      ['Límite', '600 peticiones cada 15 minutos por dirección IP.'],
    ], [2, 8]),
    espacio(),
    h3('Endpoints'),
    tabla(['Método y ruta', 'Descripción', 'Permiso'], [
      ['**Servicio 1. Registros**', '', ''],
      ['GET /api/registros', 'Lista con filtros `desde`, `hasta`, `categoriaId`, `tipo`, `origen`, `texto`, `orden`, `pagina`, `porPagina`.', 'registros:leer'],
      ['GET /api/registros/categorias', 'Categorías activas, filtrables por `tipo`.', 'registros:leer'],
      ['GET /api/registros/:id', 'Detalle de un registro.', 'registros:leer'],
      ['POST /api/registros', 'Crea un registro.', 'registros:crear'],
      ['PUT /api/registros/:id', 'Actualiza un registro (propio, o cualquiera si es administrador).', 'registros:editar_*'],
      ['PATCH /api/registros/:id/origen', 'Cambia solo el origen del dato.', 'registros:editar_*'],
      ['DELETE /api/registros/:id', 'Elimina un registro.', 'registros:eliminar'],
      ['**Servicio 2. Indicadores**', '', ''],
      ['GET /api/indicadores', 'Los siete indicadores calculados para el periodo, con valor, meta, estado y explicación.', 'indicadores:leer'],
      ['GET /api/indicadores/:id', 'Un indicador: id, clave, nombre, unidad, fórmula, meta y valor.', 'indicadores:leer'],
      ['GET /api/indicadores/:id/serie', 'Serie mensual (`meses`, de 1 a 24).', 'indicadores:leer'],
      ['PATCH /api/indicadores/:id/meta', 'Cambia la meta.', 'indicadores:administrar'],
      ['**Servicio 3. Acciones**', '', ''],
      ['GET /api/acciones', 'Plan de acciones, filtrable por `estado` y `responsableId`.', 'acciones:leer'],
      ['GET /api/acciones/:id', 'Detalle con evidencias.', 'acciones:leer'],
      ['POST /api/acciones', 'Crea una acción.', 'acciones:administrar'],
      ['PUT /api/acciones/:id', 'Edita una acción.', 'acciones:administrar'],
      ['PATCH /api/acciones/:id/seguimiento', 'Actualiza avance y estado.', 'Responsable o admin.'],
      ['POST /api/acciones/:id/evidencias', 'Agrega una evidencia.', 'Responsable o admin.'],
      ['DELETE /api/acciones/:id', 'Elimina la acción y sus evidencias.', 'acciones:administrar'],
      ['**Servicio 4. Residuos**', '', ''],
      ['GET /api/residuos/resumen', 'Generado, aprovechado y porcentaje por categoría y en total.', 'registros:leer'],
      ['GET /api/residuos/guia', 'Clasificaciones con destinos y recomendaciones.', 'registros:leer'],
      ['GET /api/residuos/categorias/:id/destinos', 'Destinos permitidos para una categoría.', 'registros:leer'],
      ['**Servicio 5. Calculadora**', '', ''],
      ['GET /api/calculadora/supuestos', 'Parámetros vigentes con unidad y fuente.', 'panel:ver'],
      ['POST /api/calculadora/escenarios', 'Evalúa un escenario de ahorro.', 'panel:ver'],
      ['**Servicio 6. Reportes**', '', ''],
      ['GET /api/reportes/comparativo', 'Indicadores de dos periodos y su diferencia.', 'reportes:generar'],
      ['GET /api/reportes/registros.csv', 'Registros del periodo en CSV (UTF-8 con BOM para Excel).', 'reportes:generar'],
      ['**Públicos y sesión**', '', ''],
      ['GET /api/publico/pyme', 'Datos públicos de la empresa.', 'Ninguno'],
      ['GET /api/publico/indicadores', 'Indicadores marcados como públicos.', 'Ninguno'],
      ['GET /api/publico/indicadores/:id/serie', 'Serie de un indicador público.', 'Ninguno'],
      ['GET /api/publico/clima', 'Recurso solar de León obtenido de Open-Meteo (sección 4.5).', 'Ninguno'],
      ['GET /api/sesion', 'Usuario actual, permisos y token CSRF.', 'Sesión'],
    ], [3.8, 5, 2.2], { tam: 17 }),
    espacio(),
    h3('Correspondencia con los servicios sugeridos'),
    p('La sección 8.4 de las indicaciones propone dos servicios como ejemplo. Se implementaron con rutas en plural y con el identificador en la ruta, que es la convención REST; la tabla muestra dónde está cada función sugerida.'),
    tabla(['Sugerido en las indicaciones', 'Implementado', 'Nota'], [
      ['GET /api/registro/categoria', 'GET /api/registros/categorias\nGET /api/registros?categoriaId=5', 'Lista de categorías y registros de una categoría.'],
      ['GET /api/registro/:id', 'GET /api/registros/:id', 'Igual.'],
      ['POST /api/registro/cantidad', 'POST /api/registros', 'Registra cantidad, unidad, fecha, costo y origen en una sola operación.'],
      ['PATCH /api/registro/origen_dato', 'PATCH /api/registros/:id/origen', 'Se indica qué registro cambia; el cuerpo lleva `origenDato`.'],
      ['GET /api/indicadores/id', 'GET /api/indicadores/:id', 'Devuelve el indicador con su id.'],
      ['GET /api/indicadores/nombre', 'GET /api/indicadores (campo `nombre`)', 'Cada elemento trae id, nombre y unidad.'],
      ['GET /api/indicadores/unidad', 'GET /api/indicadores (campo `unidad`)', 'Además trae valor, meta y estado.'],
    ], [3.2, 3.6, 4]),
    espacio(),
    h3('Ejemplos reales'),
    p('Las siguientes respuestas se obtuvieron del servidor local con los datos de demostración.'),
    p('**Consultar registros de una categoría**'),
    ...codigo(`GET /api/registros?categoriaId=5&porPagina=1
Cookie: pv.sid=...

200 OK
{
  "data": [{
    "id": 182, "categoriaId": 5, "categoria": "Recorte de piel", "tipo": "residuo",
    "fecha": "2026-11-14", "cantidad": 15, "unidad": "kg", "costo": 4200,
    "origenDato": "demostracion", "origenEtiqueta": "Dato de demostración",
    "clasificacion": "reutilizable", "cantidadAprovechada": 6.3,
    "porcentajeAprovechado": 42, "destino": "donacion",
    "evidenciaDestino": "Entrega semanal al taller de marroquinería escolar ...",
    "autor": "Jefatura de corte", "permisos": { "editar": true, "eliminar": true }
  }],
  "meta": { "total": 29, "pagina": 1, "porPagina": 1, "paginas": 29 }
}`),
    p('**Datos inválidos**'),
    ...codigo(`POST /api/registros
X-CSRF-Token: ...
Content-Type: application/json

{ "categoriaId": 5, "fecha": "2030-01-01", "cantidad": -3, "unidad": "kg", "origenDato": "bascula" }

422 Unprocessable Entity
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Revisa los campos marcados.",
    "campos": {
      "fecha": "La fecha no puede estar en el futuro.",
      "cantidad": "La cantidad no puede ser menor que 0."
    }
  }
}`),
    p('**Sin sesión**'),
    ...codigo(`GET /api/registros

401 Unauthorized
{ "error": { "codigo": "NO_AUTENTICADO", "mensaje": "Inicia sesión para continuar." } }`),
    p('**Indicador de residuo aprovechado, octubre de 2026**'),
    ...codigo(`GET /api/indicadores?desde=2026-10-01&hasta=2026-10-31

{ "clave": "TASA_APROVECHAMIENTO", "nombre": "Residuo aprovechado",
  "valor": 39.8, "unidad": "%", "meta": 40, "sentido": "mayor", "estado": "cerca",
  "explicacion": "69.6 kg aprovechados de 174.9 kg generados." }`),
    h3('Documentación interactiva'),
    figura('capturas/04-documentacion-api.png', 'Documentación de la API en /api/docs.', { maxAlto: 380 }),
    p('Las pruebas de los servicios están en la sección 4.3.'),

    h2('4.6 Implementación de un sitio web responsivo'),
    p('El diseño es fluido: la rejilla usa CSS Grid y Flexbox con unidades relativas, y las consultas de medios cambian la distribución en tres anchos.'),
    tabla(['Ancho', 'Cambios'], [
      ['Menos de 640 px (teléfono)', 'Una columna; el menú lateral del panel se vuelve un cajón con botón; las tablas se desplazan dentro de su caja y ocultan columnas secundarias (`ocultar-tel`); botones de ancho completo.'],
      ['640 a 1023 px (tableta)', 'Dos columnas en tarjetas e indicadores; formularios en dos columnas.'],
      ['1024 px o más (computadora)', 'Menú lateral fijo, rejilla de 12 columnas, tarjetas en tres o cuatro columnas.'],
    ], [3, 7.4]),
    espacio(),
    p('La etiqueta `<meta name="viewport" content="width=device-width, initial-scale=1">` está en todas las páginas. Se revisó a 390, 768 y 1366 px de ancho sin desplazamiento horizontal de la página (prueba manual de la sección 4.3).'),
    figura('capturas/23-movil-registros.png', 'Registros en un teléfono (390 px).', { maxAlto: 360 }),
    figura('capturas/24-movil-menu.png', 'Menú del panel abierto en un teléfono.', { maxAlto: 360 }),

    h2('Privacidad'),
    vinetas([
      'Se guardan solo los datos necesarios para operar: nombre visible, usuario, correo de trabajo, rol y la contraseña cifrada. No se piden teléfonos, domicilios ni datos de salud.',
      'La bitácora guarda el usuario, el evento, la entidad afectada y la IP, para poder revisar cambios. Solo la administración la consulta.',
      'Las cookies son solo de sesión; no hay rastreo ni analítica de terceros. El navegador solo pide a terceros las fuentes tipográficas de Google Fonts; la consulta a Open-Meteo la hace el servidor y no envía datos de usuarios.',
      'La información pública se limita a los indicadores que la administración marca como públicos.',
      'Las credenciales de prueba se entregan aparte, en un documento privado que no forma parte del repositorio.',
    ]),
    p('Las credenciales para revisar la aplicación se entregan en el documento privado `Credenciales_de_prueba.docx` y en el bloc de notas de la carpeta de entrega, nunca en el repositorio.'),
  ]);
};

/** Diccionario de datos generado a partir de las columnas del esquema. */
function diccionario() {
  const t = (nombre, desc, filas) => [
    h3(`Tabla ${nombre}`),
    p(desc),
    tabla(['Columna', 'Tipo', 'Restricciones', 'Descripción'], filas, [2.2, 1.8, 3, 3.4], { tam: 16 }),
    espacio(),
  ];
  return [
    t('pyme', 'Empresa evaluada.', [
      ['id', 'serial', 'PK', 'Identificador.'], ['nombre', 'varchar(120)', 'NOT NULL', 'Nombre comercial.'], ['giro', 'varchar(120)', 'NOT NULL', 'Actividad.'],
      ['ubicacion_general', 'varchar(160)', 'NOT NULL', 'Barrio y ciudad, sin domicilio exacto.'], ['descripcion, problematica, objetivo', 'text', 'NOT NULL, por omisión vacío', 'Textos de la página de inicio.'],
      ['num_colaboradores', 'integer', 'CHECK > 0', 'Base del indicador de capacitación.'], ['creado_en, actualizado_en', 'timestamptz', 'NOT NULL', 'Auditoría.'],
    ]),
    t('usuario', 'Cuentas de acceso.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['nombre', 'varchar(120)', 'NOT NULL', 'Nombre visible.'],
      ['username', 'varchar(40)', 'UNIQUE', 'Usuario para iniciar sesión.'], ['correo', 'varchar(160)', 'UNIQUE', 'Correo de trabajo.'],
      ['password_hash', 'varchar(100)', 'NOT NULL', 'Hash bcrypt.'], ['rol', 'varchar(20)', 'CHECK administrador | colaborador', ''],
      ['activo', 'boolean', 'NOT NULL', 'Baja lógica.'], ['intentos_fallidos', 'integer', 'CHECK >= 0', 'Contador de bloqueo.'],
      ['bloqueado_hasta', 'timestamptz', 'NULL', 'Fin del bloqueo.'], ['ultimo_acceso', 'timestamptz', 'NULL', ''],
    ]),
    t('categoria', 'Qué se mide: consumos, materia prima, residuos, producción y actividades sociales.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['nombre', 'varchar(80)', 'UNIQUE con pyme_id', ''],
      ['tipo', 'varchar(20)', 'CHECK consumo | materia | residuo | produccion | social', ''], ['unidad', 'varchar(20)', 'NOT NULL', 'kWh, m3, kg, par, h.'],
      ['clasificacion', 'varchar(20)', 'CHECK reutilizable | reciclable | peligroso | no_aprovechable; obligatoria solo en residuos', 'Decide la estrategia de destino.'],
      ['descripcion', 'text', '', ''], ['activa', 'boolean', 'NOT NULL', 'Baja lógica.'],
    ]),
    t('registro', 'Cada dato capturado.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['categoria_id', 'integer', 'FK categoria, RESTRICT', ''],
      ['usuario_id', 'integer', 'FK usuario, SET NULL', 'Autor.'], ['fecha', 'date', 'NOT NULL', 'No futura (aplicación).'],
      ['cantidad', 'numeric(12,3)', 'CHECK >= 0', ''], ['unidad', 'varchar(20)', 'NOT NULL', ''], ['costo', 'numeric(12,2)', 'NULL o >= 0', 'MXN.'],
      ['origen_dato', 'varchar(20)', 'CHECK medidor | recibo | bascula | inventario | estimacion | demostracion', 'De dónde sale el dato.'],
      ['cantidad_aprovechada', 'numeric(12,3)', 'NULL o entre 0 y cantidad', 'Solo residuos.'],
      ['destino', 'varchar(30)', 'CHECK reutilizacion | reciclaje | donacion | coprocesamiento | manejo_especial | relleno_sanitario', 'Solo residuos.'],
      ['evidencia_destino', 'text', 'NULL', 'Recibo, manifiesto o convenio.'], ['notas', 'text', '', ''],
    ]),
    t('indicador', 'Definición de cada indicador; el valor se calcula, no se guarda.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['categoria_id', 'integer', 'FK categoria, SET NULL', 'Categoría que mide, si aplica.'],
      ['clave', 'varchar(40)', 'UNIQUE con pyme_id', 'Liga con la estrategia.'], ['nombre', 'varchar(120)', 'NOT NULL', ''],
      ['dimension', 'varchar(20)', 'CHECK ambiental | social | economica', ''], ['formula', 'text', 'NOT NULL', 'Fórmula legible.'],
      ['unidad', 'varchar(30)', 'NOT NULL', ''], ['meta', 'numeric(12,3)', 'CHECK >= 0', ''], ['sentido', 'varchar(10)', 'CHECK mayor | menor', 'Si conviene subir o bajar.'],
      ['publico', 'boolean', 'NOT NULL', 'Visible para visitantes.'], ['descripcion', 'text', '', ''],
    ]),
    t('accion', 'Plan de acciones sustentables.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['indicador_id', 'integer', 'FK indicador, SET NULL', ''],
      ['responsable_id, creado_por', 'integer', 'FK usuario, SET NULL', ''], ['titulo', 'varchar(140)', 'NOT NULL', ''], ['descripcion', 'text', '', ''],
      ['meta', 'varchar(200)', 'NOT NULL', 'Meta concreta de la acción.'], ['fecha_inicio, fecha_objetivo', 'date', 'CHECK objetivo >= inicio', ''],
      ['estado', 'varchar(20)', 'CHECK pendiente | en_proceso | completada', ''], ['avance', 'smallint', 'CHECK 0..100; completada exige 100', ''],
    ]),
    t('evidencia', 'Comprobantes de avance de una acción.', [
      ['id', 'serial', 'PK', ''], ['accion_id', 'integer', 'FK accion, CASCADE', ''], ['usuario_id', 'integer', 'FK usuario, SET NULL', ''],
      ['fecha', 'date', 'NOT NULL', ''], ['descripcion', 'text', 'NOT NULL', ''], ['enlace', 'varchar(300)', 'NULL', 'Enlace opcional a la evidencia.'],
    ]),
    t('parametro', 'Supuestos de cálculo editables.', [
      ['id', 'serial', 'PK', ''], ['pyme_id', 'integer', 'FK pyme, CASCADE', ''], ['clave', 'varchar(40)', 'UNIQUE con pyme_id', ''],
      ['nombre', 'varchar(120)', 'NOT NULL', ''], ['valor', 'numeric(14,4)', 'CHECK >= 0', ''], ['unidad', 'varchar(30)', 'NOT NULL', ''], ['fuente', 'text', '', 'De dónde sale el valor.'],
    ]),
    t('bitacora', 'Registro de eventos; solo se inserta.', [
      ['id', 'bigserial', 'PK', ''], ['usuario_id', 'integer', 'FK usuario, SET NULL', ''], ['evento', 'varchar(60)', 'NOT NULL', 'Por ejemplo `registro.creado`.'],
      ['entidad, entidad_id', 'varchar(40), integer', 'NULL', 'Qué se afectó.'], ['detalle', 'jsonb', 'NOT NULL', 'Datos del cambio, sin contraseñas.'],
      ['ip', 'varchar(64)', 'NULL', ''], ['creado_en', 'timestamptz', 'NOT NULL, índice', ''],
    ]),
  ];
}
