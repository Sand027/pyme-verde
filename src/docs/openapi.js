'use strict';

/**
 * Especificación OpenAPI 3.0 de los servicios web de PyME Verde.
 * Se publica en /api/docs/openapi.json y se presenta en /api/docs.
 */
const err = (descripcion) => ({ description: descripcion, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const R = {
  400: err('Petición mal formada'),
  401: err('Sin sesión iniciada'),
  403: err('El rol no tiene permiso o falta el token CSRF'),
  404: err('No existe o no pertenece a la empresa'),
  422: err('Datos inválidos; `campos` indica el error de cada campo'),
};
const ok = (descripcion, schema) => ({ description: descripcion, content: { 'application/json': { schema } } });
const dataDe = (schema) => ({ type: 'object', properties: { data: schema, meta: { type: 'object' } } });
const id = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const desde = { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Inicio del periodo (AAAA-MM-DD). Por defecto, hace tres meses.' };
const hasta = { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fin del periodo (AAAA-MM-DD). Por defecto, fin del mes en curso.' };
const cuerpo = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const csrf = [{ sesion: [], csrf: [] }];
const lectura = [{ sesion: [] }];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'PyME Verde API',
    version: '1.0.0',
    description: 'Servicios REST para registrar consumos y residuos, calcular indicadores sustentables, dar seguimiento al plan de acciones y generar reportes. Todas las respuestas son JSON con la forma { data, meta } o { error }. Las operaciones que modifican datos exigen sesión y la cabecera X-CSRF-Token, que se obtiene en GET /api/sesion.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Registros', description: 'Servicio 1: consumos, residuos, producción y actividades sociales' },
    { name: 'Indicadores', description: 'Servicio 2: indicadores calculados, series mensuales y metas' },
    { name: 'Acciones', description: 'Servicio 3: plan de acciones sustentables' },
    { name: 'Residuos', description: 'Servicio 4: economía circular y destino de residuos' },
    { name: 'Calculadora', description: 'Servicio 5: escenarios de consumo y ahorro' },
    { name: 'Reportes', description: 'Servicio 6: comparativos y exportación (administración)' },
    { name: 'Público', description: 'Datos para visitantes sin sesión' },
    { name: 'Sesión', description: 'Usuario actual y token CSRF' },
  ],
  components: {
    securitySchemes: {
      sesion: { type: 'apiKey', in: 'cookie', name: 'pv.sid', description: 'Cookie HttpOnly creada al iniciar sesión en /login.' },
      csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token', description: 'Token de la sesión, requerido en POST, PUT, PATCH y DELETE.' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              codigo: { type: 'string', example: 'VALIDACION' },
              mensaje: { type: 'string', example: 'Revisa los campos marcados.' },
              campos: { type: 'object', additionalProperties: { type: 'string' }, example: { cantidad: 'La cantidad no puede ser menor que 0.' } },
            },
          },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, nombre: { type: 'string', example: 'Recorte de piel' },
          tipo: { type: 'string', enum: ['consumo', 'materia', 'residuo', 'produccion', 'social'] },
          unidad: { type: 'string', example: 'kg' },
          clasificacion: { type: 'string', nullable: true, enum: ['reutilizable', 'reciclable', 'peligroso', 'no_aprovechable'] },
        },
      },
      RegistroEntrada: {
        type: 'object',
        required: ['categoriaId', 'fecha', 'cantidad', 'origenDato'],
        properties: {
          categoriaId: { type: 'integer', example: 5 },
          fecha: { type: 'string', format: 'date', example: '2026-11-14' },
          cantidad: { type: 'number', minimum: 0, example: 18.4 },
          unidad: { type: 'string', example: 'kg', description: 'Opcional. Si difiere de la unidad de la categoría y es equivalente (g, t, L, Wh...), se convierte.' },
          costo: { type: 'number', minimum: 0, nullable: true, example: 5152 },
          origenDato: { type: 'string', enum: ['medidor', 'recibo', 'bascula', 'inventario', 'estimacion', 'demostracion'] },
          cantidadAprovechada: { type: 'number', minimum: 0, description: 'Solo residuos. No puede superar la cantidad.' },
          destino: { type: 'string', enum: ['reutilizacion', 'reciclaje', 'donacion', 'coprocesamiento', 'manejo_especial', 'relleno_sanitario'], description: 'Solo residuos; los destinos válidos dependen de la clasificación.' },
          evidenciaDestino: { type: 'string', description: 'Obligatoria para residuos de manejo especial.' },
          notas: { type: 'string', maxLength: 500 },
        },
      },
      Registro: {
        allOf: [{ $ref: '#/components/schemas/RegistroEntrada' }, {
          type: 'object',
          properties: {
            id: { type: 'integer' }, categoria: { type: 'string' }, tipo: { type: 'string' },
            origenEtiqueta: { type: 'string' }, autor: { type: 'string' }, porcentajeAprovechado: { type: 'number' },
          },
        }],
      },
      Indicador: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, clave: { type: 'string', example: 'TASA_APROVECHAMIENTO' }, nombre: { type: 'string' },
          dimension: { type: 'string', enum: ['ambiental', 'social', 'economica'] }, formula: { type: 'string' },
          unidad: { type: 'string', example: '%' }, meta: { type: 'number' }, sentido: { type: 'string', enum: ['menor', 'mayor'] },
          valor: { type: 'number', nullable: true }, estado: { type: 'string', enum: ['cumple', 'cerca', 'lejos', 'sin_datos'] },
          explicacion: { type: 'string' },
          periodo: { type: 'object', properties: { desde: { type: 'string' }, hasta: { type: 'string' }, meses: { type: 'integer' } } },
        },
      },
      Accion: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, titulo: { type: 'string' }, meta: { type: 'string' },
          fechaInicio: { type: 'string', format: 'date' }, fechaObjetivo: { type: 'string', format: 'date' },
          estado: { type: 'string', enum: ['pendiente', 'en_proceso', 'completada'] }, avance: { type: 'integer', minimum: 0, maximum: 100 },
          indicadorId: { type: 'integer', nullable: true }, responsableId: { type: 'integer', nullable: true },
          evidencias: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/sesion': {
      get: { tags: ['Sesión'], summary: 'Usuario actual, permisos y token CSRF', security: lectura, responses: { 200: ok('Sesión activa', dataDe({ type: 'object' })), 401: R[401] } },
    },
    '/registros': {
      get: {
        tags: ['Registros'], summary: 'Buscar registros con filtros y paginación', security: lectura,
        parameters: [desde, hasta,
          { name: 'categoriaId', in: 'query', schema: { type: 'integer' } },
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['consumo', 'materia', 'residuo', 'produccion', 'social'] } },
          { name: 'origen', in: 'query', schema: { type: 'string' } },
          { name: 'texto', in: 'query', schema: { type: 'string' } },
          { name: 'orden', in: 'query', schema: { type: 'string', enum: ['fecha_desc', 'fecha_asc', 'cantidad_desc', 'costo_desc', 'categoria'] } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'porPagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500 } }],
        responses: { 200: ok('Lista paginada', dataDe({ type: 'array', items: { $ref: '#/components/schemas/Registro' } })), 401: R[401], 422: R[422] },
      },
      post: {
        tags: ['Registros'], summary: 'Registrar una medición', security: csrf,
        requestBody: cuerpo({ $ref: '#/components/schemas/RegistroEntrada' }),
        responses: { 201: ok('Creado; cabecera Location con su URL', dataDe({ $ref: '#/components/schemas/Registro' })), 401: R[401], 403: R[403], 422: R[422] },
      },
    },
    '/registros/categorias': {
      get: { tags: ['Registros'], summary: 'Categorías activas de la empresa', security: lectura, parameters: [{ name: 'tipo', in: 'query', schema: { type: 'string' } }], responses: { 200: ok('Categorías', dataDe({ type: 'array', items: { $ref: '#/components/schemas/Categoria' } })), 401: R[401] } },
    },
    '/registros/{id}': {
      get: { tags: ['Registros'], summary: 'Detalle de un registro', security: lectura, parameters: [id], responses: { 200: ok('Registro', dataDe({ $ref: '#/components/schemas/Registro' })), 404: R[404] } },
      put: { tags: ['Registros'], summary: 'Editar un registro (administración, o colaborador sobre los suyos)', security: csrf, parameters: [id], requestBody: cuerpo({ $ref: '#/components/schemas/RegistroEntrada' }), responses: { 200: ok('Actualizado', dataDe({ $ref: '#/components/schemas/Registro' })), 403: R[403], 404: R[404], 422: R[422] } },
      delete: { tags: ['Registros'], summary: 'Eliminar un registro (administración)', security: csrf, parameters: [id], responses: { 204: { description: 'Eliminado' }, 403: R[403], 404: R[404] } },
    },
    '/registros/{id}/origen': {
      patch: { tags: ['Registros'], summary: 'Actualizar el origen del dato', security: csrf, parameters: [id], requestBody: cuerpo({ type: 'object', required: ['origenDato'], properties: { origenDato: { type: 'string', example: 'bascula' } } }), responses: { 200: ok('Actualizado', dataDe({ $ref: '#/components/schemas/Registro' })), 403: R[403], 404: R[404], 422: R[422] } },
    },
    '/indicadores': {
      get: { tags: ['Indicadores'], summary: 'Indicadores calculados en un periodo', security: lectura, parameters: [desde, hasta], responses: { 200: ok('Indicadores con valor, meta y estado', dataDe({ type: 'array', items: { $ref: '#/components/schemas/Indicador' } })), 401: R[401], 422: R[422] } },
    },
    '/indicadores/{id}': {
      get: { tags: ['Indicadores'], summary: 'Un indicador calculado', security: lectura, parameters: [id, desde, hasta], responses: { 200: ok('Indicador', dataDe({ $ref: '#/components/schemas/Indicador' })), 404: R[404] } },
    },
    '/indicadores/{id}/serie': {
      get: { tags: ['Indicadores'], summary: 'Serie mensual del indicador', security: lectura, parameters: [id, { name: 'meses', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 6 } }], responses: { 200: ok('Un punto por mes', dataDe({ type: 'object' })), 404: R[404], 422: R[422] } },
    },
    '/indicadores/{id}/meta': {
      patch: { tags: ['Indicadores'], summary: 'Cambiar la meta o la visibilidad pública (administración)', security: csrf, parameters: [id], requestBody: cuerpo({ type: 'object', required: ['meta'], properties: { meta: { type: 'number' }, publico: { type: 'boolean' } } }), responses: { 200: ok('Actualizado', dataDe({ $ref: '#/components/schemas/Indicador' })), 403: R[403], 422: R[422] } },
    },
    '/acciones': {
      get: { tags: ['Acciones'], summary: 'Plan de acciones', security: lectura, parameters: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'en_proceso', 'completada'] } }, { name: 'responsableId', in: 'query', schema: { type: 'integer' } }], responses: { 200: ok('Acciones', dataDe({ type: 'array', items: { $ref: '#/components/schemas/Accion' } })) } },
      post: { tags: ['Acciones'], summary: 'Crear una acción (administración)', security: csrf, requestBody: cuerpo({ type: 'object', required: ['titulo', 'meta', 'fechaInicio', 'fechaObjetivo'], properties: { titulo: { type: 'string' }, descripcion: { type: 'string' }, meta: { type: 'string' }, fechaInicio: { type: 'string', format: 'date' }, fechaObjetivo: { type: 'string', format: 'date' }, indicadorId: { type: 'integer' }, responsableId: { type: 'integer' } } }), responses: { 201: ok('Creada', dataDe({ $ref: '#/components/schemas/Accion' })), 403: R[403], 422: R[422] } },
    },
    '/acciones/{id}': {
      get: { tags: ['Acciones'], summary: 'Detalle con evidencias', security: lectura, parameters: [id], responses: { 200: ok('Acción', dataDe({ $ref: '#/components/schemas/Accion' })), 404: R[404] } },
      put: { tags: ['Acciones'], summary: 'Editar datos de la acción (administración)', security: csrf, parameters: [id], requestBody: cuerpo({ type: 'object' }), responses: { 200: ok('Actualizada', dataDe({ $ref: '#/components/schemas/Accion' })), 403: R[403], 422: R[422] } },
      delete: { tags: ['Acciones'], summary: 'Eliminar (administración)', security: csrf, parameters: [id], responses: { 204: { description: 'Eliminada' }, 403: R[403] } },
    },
    '/acciones/{id}/seguimiento': {
      patch: { tags: ['Acciones'], summary: 'Cambiar estado o avance (responsable o administración)', security: csrf, parameters: [id], requestBody: cuerpo({ type: 'object', properties: { estado: { type: 'string', enum: ['pendiente', 'en_proceso', 'completada'] }, avance: { type: 'integer', minimum: 0, maximum: 100 } } }), responses: { 200: ok('Actualizada', dataDe({ $ref: '#/components/schemas/Accion' })), 403: R[403], 422: R[422] } },
    },
    '/acciones/{id}/evidencias': {
      post: { tags: ['Acciones'], summary: 'Agregar una evidencia de avance', security: csrf, parameters: [id], requestBody: cuerpo({ type: 'object', required: ['fecha', 'descripcion'], properties: { fecha: { type: 'string', format: 'date' }, descripcion: { type: 'string' }, enlace: { type: 'string', format: 'uri' } } }), responses: { 201: ok('Agregada', dataDe({ $ref: '#/components/schemas/Accion' })), 403: R[403], 422: R[422] } },
    },
    '/residuos/resumen': {
      get: { tags: ['Residuos'], summary: 'Generado, aprovechado y destino por categoría', security: lectura, parameters: [desde, hasta], responses: { 200: ok('Resumen', dataDe({ type: 'object' })) } },
    },
    '/residuos/guia': {
      get: { tags: ['Residuos'], summary: 'Reglas de destino por clasificación', security: lectura, responses: { 200: ok('Guía', dataDe({ type: 'array', items: { type: 'object' } })) } },
    },
    '/residuos/categorias/{id}/destinos': {
      get: { tags: ['Residuos'], summary: 'Destinos válidos y recomendaciones de una categoría de residuo', security: lectura, parameters: [id], responses: { 200: ok('Opciones', dataDe({ type: 'object' })), 404: R[404], 422: R[422] } },
    },
    '/calculadora/supuestos': {
      get: { tags: ['Calculadora'], summary: 'Conceptos y parámetros de cálculo con su fuente', security: lectura, responses: { 200: ok('Supuestos', dataDe({ type: 'object' })) } },
    },
    '/calculadora/escenarios': {
      post: { tags: ['Calculadora'], summary: 'Evaluar un escenario actual contra uno propuesto', security: csrf, requestBody: cuerpo({ type: 'object', required: ['concepto', 'cantidadActual', 'reduccion'], properties: { concepto: { type: 'string', enum: ['electricidad', 'agua', 'piel', 'manejo_especial'] }, cantidadActual: { type: 'number', example: 960 }, reduccion: { type: 'number', example: 30 }, inversion: { type: 'number', example: 18000 } } }), responses: { 200: ok('Ahorro mensual, anual, retorno y supuestos usados', dataDe({ type: 'object' })), 422: R[422] } },
    },
    '/reportes/comparativo': {
      get: { tags: ['Reportes'], summary: 'Comparar dos periodos de igual duración (administración)', security: lectura, parameters: ['aDesde', 'aHasta', 'bDesde', 'bHasta'].map((n) => ({ name: n, in: 'query', schema: { type: 'string', format: 'date' } })), responses: { 200: ok('Comparativo', dataDe({ type: 'object' })), 403: R[403], 422: R[422] } },
    },
    '/reportes/registros.csv': {
      get: { tags: ['Reportes'], summary: 'Exportar registros a CSV (administración)', security: lectura, parameters: [desde, hasta], responses: { 200: { description: 'Archivo CSV UTF-8', content: { 'text/csv': {} } }, 403: R[403] } },
    },
    '/publico/pyme': {
      get: { tags: ['Público'], summary: 'Presentación de la empresa', security: [], responses: { 200: ok('Empresa', dataDe({ type: 'object' })) } },
    },
    '/publico/indicadores': {
      get: { tags: ['Público'], summary: 'Indicadores marcados como públicos', security: [], parameters: [desde, hasta], responses: { 200: ok('Indicadores', dataDe({ type: 'array', items: { $ref: '#/components/schemas/Indicador' } })) } },
    },
    '/publico/indicadores/{id}/serie': {
      get: { tags: ['Público'], summary: 'Serie mensual de un indicador público', security: [], parameters: [id], responses: { 200: ok('Serie', dataDe({ type: 'object' })), 404: R[404] } },
    },
    '/publico/clima': {
      get: { tags: ['Público'], summary: 'Radiación solar y temperatura en León, obtenidas del servicio web público Open-Meteo', description: 'La aplicación consume https://api.open-meteo.com/v1/forecast desde el servidor, convierte la radiación diaria de MJ/m² a kWh/m² y calcula las horas de sol pico y la generación mensual estimada por kWp instalado (rendimiento 0.8). La respuesta se guarda una hora en memoria. Si Open-Meteo no responde y no hay copia previa, devuelve 502.', security: [], responses: { 200: ok('Recurso solar de los próximos siete días', dataDe({ type: 'object', properties: { fuente: { type: 'string', example: 'Open-Meteo' }, lugar: { type: 'string', example: 'León, Guanajuato' }, temperaturaActual: { type: 'number', example: 21.4 }, horasSolPico: { type: 'number', example: 5.62 }, generacionMensualPorKwp: { type: 'number', example: 134.9 }, dias: { type: 'array', items: { type: 'object' } } } })), 502: { description: 'El servicio externo no respondió', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } } },
    },
  },
};
