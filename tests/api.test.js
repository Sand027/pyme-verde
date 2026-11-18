'use strict';

/**
 * Pruebas de los servicios web de PyME Verde (node:test + supertest).
 *
 * Corren contra una base aparte (pyme_verde_test o TEST_DATABASE_URL): la
 * recrean con el caso de demostración antes de empezar. Nunca tocan la base
 * de desarrollo ni la de producción.
 *
 * Uso: npm test   (con `npm run db:local` corriendo, o TEST_DATABASE_URL definida)
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/pyme_verde_test';
// Contraseñas nuevas en cada corrida; el seed las devuelve y no se imprimen.
process.env.SEED_ADMIN_PASSWORD = '';
process.env.SEED_COLABORADOR_PASSWORD = '';

if (!/test/i.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error('Las pruebas borran la base: DATABASE_URL debe apuntar a una base cuyo nombre contenga "test".');
}

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { sembrar } = require('../src/db/seed');
const Database = require('../src/config/database');

let app;
let claves;

const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const manana = () => new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);

/** Inicia sesión con el formulario real (token CSRF incluido) y devuelve el agente con su token de API. */
async function entrar(username, password) {
  const agente = request.agent(app);
  const pagina = await agente.get('/login').expect(200);
  const csrf = pagina.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const r = await agente.post('/login').type('form').send({ _csrf: csrf, username, password, siguiente: '/panel' });
  assert.equal(r.status, 303, `inicio de sesión de ${username}`);
  const sesion = await agente.get('/api/sesion').expect(200);
  return { agente, token: sesion.body.data.csrfToken, usuario: sesion.body.data.usuario };
}

/** Atajos para peticiones con el token CSRF en la cabecera. */
const con = (s) => ({
  get: (url) => s.agente.get(url),
  post: (url, cuerpo) => s.agente.post(url).set('X-CSRF-Token', s.token).send(cuerpo),
  put: (url, cuerpo) => s.agente.put(url).set('X-CSRF-Token', s.token).send(cuerpo),
  patch: (url, cuerpo) => s.agente.patch(url).set('X-CSRF-Token', s.token).send(cuerpo),
  del: (url) => s.agente.delete(url).set('X-CSRF-Token', s.token),
});

let admin;
let colab;
let categorias;
const cat = (nombre) => categorias.find((c) => c.nombre.startsWith(nombre));

before(async () => {
  claves = await sembrar({ force: true });
  app = crearApp();
  admin = await entrar('admin.demo', claves.passAdmin);
  colab = await entrar('colaborador.demo', claves.passColab);
  categorias = (await con(admin).get('/api/registros/categorias').expect(200)).body.data;
});

after(async () => {
  await Database.getInstance().cerrar();
});

describe('Datos públicos y documentación', () => {
  it('P01 GET /api/publico/pyme devuelve la empresa sin sesión', async () => {
    const r = await request(app).get('/api/publico/pyme').expect(200).expect('Content-Type', /json/);
    assert.equal(r.body.data.nombre, 'Contrafuerte');
  });

  it('P02 GET /api/publico/indicadores devuelve solo indicadores públicos', async () => {
    const r = await request(app).get('/api/publico/indicadores').expect(200);
    assert.ok(Array.isArray(r.body.data) && r.body.data.length > 0);
    assert.ok(r.body.data.every((i) => i.publico !== false));
  });

  it('P03 GET /api/docs/openapi.json publica la especificación OpenAPI 3', async () => {
    const r = await request(app).get('/api/docs/openapi.json').expect(200);
    assert.match(r.body.openapi, /^3\./);
    assert.ok(r.body.paths['/registros']);
  });
});

describe('Seguridad: sesión, CSRF, cabeceras y bloqueo', () => {
  it('S01 sin sesión la API responde 401 con el formato de error', async () => {
    const r = await request(app).get('/api/registros').expect(401);
    assert.ok(r.body.error.codigo);
    assert.ok(r.body.error.mensaje);
  });

  it('S02 una escritura sin token CSRF se rechaza con 403', async () => {
    const r = await admin.agente.post('/api/registros').send({ categoriaId: cat('Agua').id }).expect(403);
    assert.equal(r.body.error.codigo, 'CSRF');
  });

  it('S03 credenciales incorrectas no inician sesión (401)', async () => {
    const agente = request.agent(app);
    const pagina = await agente.get('/login');
    const csrf = pagina.text.match(/name="_csrf" value="([^"]+)"/)[1];
    await agente.post('/login').type('form').send({ _csrf: csrf, username: 'admin.demo', password: 'no-es-la-clave-1' }).expect(401);
    await agente.get('/api/sesion').expect(401);
  });

  it('S04 cinco intentos fallidos bloquean la cuenta 15 minutos', async () => {
    const agente = request.agent(app);
    const pagina = await agente.get('/login');
    const csrf = pagina.text.match(/name="_csrf" value="([^"]+)"/)[1];
    const intentar = () => agente.post('/login').type('form').send({ _csrf: csrf, username: 'pespunte.demo', password: 'incorrecta-123' });
    for (let i = 0; i < 5; i += 1) await intentar();
    const r = await intentar();
    assert.equal(r.status, 401);
    assert.match(r.text, /bloqueada/);
  });

  it('S05 las respuestas llevan CSP, nosniff y la cookie de sesión HttpOnly', async () => {
    const r = await request(app).get('/login').expect(200);
    assert.match(r.headers['content-security-policy'], /default-src 'self'/);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.ok(!r.headers['x-powered-by']);
    const cookie = (r.headers['set-cookie'] || []).find((c) => c.startsWith('pv.sid='));
    assert.ok(cookie && /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie));
  });

  it('S06 un id que no es entero responde 404', async () => {
    await con(admin).get('/api/registros/abc').expect(404);
  });
});

describe('Servicio 1: registros (CRUD)', () => {
  let id;

  it('R01 crea un registro de consumo (201 y Location)', async () => {
    const r = await con(colab).post('/api/registros', {
      categoriaId: cat('Agua').id, fecha: hoy(), cantidad: 3.5, costo: 140, origenDato: 'recibo', notas: 'Prueba automatizada',
    }).expect(201);
    id = r.body.data.id;
    assert.ok(id);
    assert.equal(r.headers.location, `/api/registros/${id}`);
    assert.equal(Number(r.body.data.cantidad), 3.5);
  });

  it('R02 lee el registro y lo encuentra en la lista filtrada', async () => {
    const uno = await con(colab).get(`/api/registros/${id}`).expect(200);
    assert.equal(uno.body.data.origenDato, 'recibo');
    const lista = await con(colab).get(`/api/registros?texto=automatizada&porPagina=5`).expect(200);
    assert.ok(lista.body.data.some((x) => x.id === id));
    assert.ok(lista.body.meta.total >= 1);
  });

  it('R03 actualiza el registro (200)', async () => {
    const r = await con(colab).put(`/api/registros/${id}`, {
      categoriaId: cat('Agua').id, fecha: hoy(), cantidad: 4, costo: 160, origenDato: 'recibo', notas: 'Prueba automatizada editada',
    }).expect(200);
    assert.equal(Number(r.body.data.cantidad), 4);
  });

  it('R04 rechaza datos inválidos con 422 y los campos con error', async () => {
    const r = await con(colab).post('/api/registros', {
      categoriaId: cat('Agua').id, fecha: manana(), cantidad: -2, origenDato: 'inventado',
    }).expect(422);
    assert.equal(r.body.error.codigo, 'VALIDACION');
    for (const campo of ['fecha', 'cantidad', 'origenDato']) assert.ok(r.body.error.campos[campo], `falta error en ${campo}`);
  });

  it('R05 un residuo de manejo especial no puede ir a relleno sanitario (422)', async () => {
    const r = await con(colab).post('/api/registros', {
      categoriaId: cat('Envases').id, fecha: hoy(), cantidad: 5, origenDato: 'bascula',
      cantidadAprovechada: 0, destino: 'relleno_sanitario',
    }).expect(422);
    assert.ok(r.body.error.campos.destino);
  });

  it('R06 un residuo reutilizable acepta un destino de aprovechamiento de su clasificación', async () => {
    const r = await con(colab).post('/api/registros', {
      categoriaId: cat('Recorte de piel').id, fecha: hoy(), cantidad: 10, origenDato: 'bascula',
      cantidadAprovechada: 6, destino: 'reutilizacion',
    }).expect(201);
    const destinos = await con(colab).get(`/api/residuos/categorias/${cat('Recorte de piel').id}/destinos`).expect(200);
    assert.ok(destinos.body.data.destinosAprovechamiento.some((d) => d.valor === 'reutilizacion'));
    assert.equal(Number(r.body.data.cantidadAprovechada), 6);
    await con(admin).del(`/api/registros/${r.body.data.id}`).expect(204);
  });

  it('R07 un colaborador no puede borrar registros (403)', async () => {
    await con(colab).del(`/api/registros/${id}`).expect(403);
  });

  it('R08 la administración lo elimina (204) y deja de existir (404)', async () => {
    await con(admin).del(`/api/registros/${id}`).expect(204);
    await con(admin).get(`/api/registros/${id}`).expect(404);
  });
});

describe('Servicio 2: indicadores', () => {
  it('I01 lista los indicadores calculados con estado frente a la meta', async () => {
    const r = await con(colab).get('/api/indicadores').expect(200);
    assert.ok(r.body.data.length >= 5);
    const i = r.body.data[0];
    assert.ok('valor' in i && 'meta' in i && 'estado' in i);
  });

  it('I02 la serie mensual devuelve un punto por mes', async () => {
    const lista = await con(colab).get('/api/indicadores').expect(200);
    const r = await con(colab).get(`/api/indicadores/${lista.body.data[0].id}/serie?meses=6`).expect(200);
    const puntos = r.body.data.puntos || r.body.data.serie || r.body.data;
    assert.equal(puntos.length, 6);
  });

  it('I03 solo la administración cambia metas (403 para colaborador, 200 para admin)', async () => {
    const lista = await con(admin).get('/api/indicadores').expect(200);
    const ind = lista.body.data[0];
    await con(colab).patch(`/api/indicadores/${ind.id}/meta`, { meta: 50 }).expect(403);
    const r = await con(admin).patch(`/api/indicadores/${ind.id}/meta`, { meta: Number(ind.meta), publico: true }).expect(200);
    assert.equal(Number(r.body.data.meta), Number(ind.meta));
  });
});

describe('Servicio 3: plan de acciones', () => {
  let id;

  it('A01 la administración crea una acción con responsable (201)', async () => {
    const r = await con(admin).post('/api/acciones', {
      titulo: 'Prueba: revisar compresor', meta: 'Bajar 5 % el consumo eléctrico', fechaInicio: hoy(), fechaObjetivo: '2027-06-30',
      responsableId: colab.usuario.id,
    }).expect(201);
    id = r.body.data.id;
    assert.equal(r.body.data.estado, 'pendiente');
  });

  it('A02 un colaborador no puede crear acciones (403)', async () => {
    await con(colab).post('/api/acciones', { titulo: 'No permitido', meta: 'No permitido', fechaInicio: hoy(), fechaObjetivo: hoy() }).expect(403);
  });

  it('A03 fechas incoherentes se rechazan (422)', async () => {
    const r = await con(admin).post('/api/acciones', { titulo: 'Fechas al revés', meta: 'Meta de prueba', fechaInicio: '2027-01-10', fechaObjetivo: '2027-01-01' }).expect(422);
    assert.ok(r.body.error.campos.fechaObjetivo);
  });

  it('A04 el responsable actualiza el avance; 100 % la marca completada', async () => {
    let r = await con(colab).patch(`/api/acciones/${id}/seguimiento`, { avance: 40 }).expect(200);
    assert.equal(r.body.data.estado, 'en_proceso');
    r = await con(colab).patch(`/api/acciones/${id}/seguimiento`, { avance: 100 }).expect(200);
    assert.equal(r.body.data.estado, 'completada');
  });

  it('A05 el responsable agrega una evidencia', async () => {
    const r = await con(colab).post(`/api/acciones/${id}/evidencias`, { fecha: hoy(), descripcion: 'Foto del compresor revisado y bitácora de mantenimiento.' }).expect(201);
    assert.ok((r.body.data.evidencias || []).length >= 1);
  });

  it('A06 un colaborador no puede actualizar una acción de otra persona (403)', async () => {
    const lista = await con(colab).get('/api/acciones').expect(200);
    const ajena = lista.body.data.find((a) => a.responsableId && a.responsableId !== colab.usuario.id);
    assert.ok(ajena, 'hay una acción de otra persona');
    await con(colab).patch(`/api/acciones/${ajena.id}/seguimiento`, { avance: 10 }).expect(403);
  });

  it('A07 la administración elimina la acción (204)', async () => {
    await con(admin).del(`/api/acciones/${id}`).expect(204);
    await con(admin).get(`/api/acciones/${id}`).expect(404);
  });
});

describe('Servicios 4 y 5: residuos y calculadora', () => {
  it('C01 el resumen de residuos cuadra: aprovechado <= generado y porcentaje entre 0 y 100', async () => {
    const r = await con(colab).get('/api/residuos/resumen').expect(200);
    const t = r.body.data.totales || r.body.data;
    assert.ok(Number(t.aprovechado) <= Number(t.generado));
    assert.ok(Number(t.porcentaje) >= 0 && Number(t.porcentaje) <= 100);
  });

  it('C02 la calculadora estima el ahorro con los supuestos guardados', async () => {
    const sup = await con(colab).get('/api/calculadora/supuestos').expect(200);
    assert.ok(sup.body.data.parametros.length > 0 && sup.body.data.conceptos.agua);
    const r = await con(colab).post('/api/calculadora/escenarios', { concepto: 'agua', cantidadActual: 10, reduccion: 20, inversion: 0 }).expect(200);
    const tarifa = sup.body.data.parametros.find((p) => p.clave === 'tarifa_agua');
    // 10 m3 con 20 % menos = 2 m3 al mes por la tarifa guardada; el supuesto usado viaja en la respuesta.
    assert.equal(r.body.data.ahorro.cantidadMensual, 2);
    assert.ok(Math.abs(r.body.data.ahorro.mensual - 2 * Number(tarifa.valor)) < 0.01);
    assert.equal(r.body.data.ahorro.anual, r.body.data.ahorro.mensual * 12);
    assert.equal(r.body.data.supuestos[0].clave, 'tarifa_agua');
  });

  it('C03 un escenario inválido responde 422', async () => {
    const r = await con(colab).post('/api/calculadora/escenarios', { concepto: 'gas', cantidadActual: 0, reduccion: 150 }).expect(422);
    assert.ok(r.body.error.campos.concepto && r.body.error.campos.reduccion);
  });
});

describe('Servicio 6: reportes', () => {
  it('E01 la administración compara dos periodos', async () => {
    const r = await con(admin).get('/api/reportes/comparativo?aDesde=2026-08-01&aHasta=2026-08-31&bDesde=2026-09-01&bHasta=2026-09-30').expect(200);
    assert.ok(Array.isArray(r.body.data.indicadores));
  });

  it('E02 exporta CSV con encabezados', async () => {
    const r = await con(admin).get('/api/reportes/registros.csv').expect(200);
    assert.match(r.headers['content-type'], /text\/csv/);
    assert.match(r.headers['content-disposition'], /attachment/);
    assert.ok(r.text.split('\n').length > 2);
  });

  it('E03 un colaborador no puede generar reportes (403)', async () => {
    await con(colab).get('/api/reportes/comparativo').expect(403);
    await con(colab).get('/api/reportes/registros.csv').expect(403);
  });
});
