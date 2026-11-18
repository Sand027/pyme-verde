'use strict';

/**
 * Carga el caso de estudio de demostración: un taller de calzado en León, Gto.
 *
 * Todos los registros se guardan con origen_dato = 'demostracion' para que la
 * interfaz los identifique y nunca se presenten como mediciones reales.
 * Los datos pasan por las mismas fábricas y validaciones que la aplicación.
 *
 * Uso: node src/db/seed.js [--force]
 */
const crypto = require('crypto');
const Database = require('../config/database');
const { migrar } = require('./migrate');
const Pyme = require('../models/Pyme');
const Usuario = require('../models/Usuario');
const Categoria = require('../models/Categoria');
const Indicador = require('../models/Indicador');
const Parametro = require('../models/Parametro');
const AccionSustentable = require('../models/AccionSustentable');
const Evidencia = require('../models/Evidencia');
const RegistroFactory = require('../patterns/fabricas/RegistroFactory');
const PymeRepository = require('../repositories/PymeRepository');
const UsuarioRepository = require('../repositories/UsuarioRepository');
const CategoriaRepository = require('../repositories/CategoriaRepository');
const IndicadorRepository = require('../repositories/IndicadorRepository');
const ParametroRepository = require('../repositories/ParametroRepository');
const AccionRepository = require('../repositories/AccionRepository');
const RegistroRepository = require('../repositories/RegistroRepository');

// Generador pseudoaleatorio con semilla: el mismo seed produce los mismos datos.
function mulberry32(semilla) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = mulberry32(20261117);
const variar = (base, pct) => base * (1 + (azar() * 2 - 1) * pct);
const r1 = (n) => Math.round(n * 10) / 10;

function passwordAleatoria() {
  return `${crypto.randomBytes(9).toString('base64url')}7a`;
}

const fechaISO = (d) => d.toISOString().slice(0, 10);

/** Sábados entre dos fechas (cierre semanal del taller). */
function sabados(desde, hasta) {
  const lista = [];
  const d = new Date(`${desde}T12:00:00Z`);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  while (fechaISO(d) <= hasta) {
    lista.push(fechaISO(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return lista;
}

/** Último día de cada mes completo y el día de hoy para el mes en curso. */
function cortesMensuales(desde, hasta) {
  const lista = [];
  const d = new Date(`${desde.slice(0, 7)}-01T12:00:00Z`);
  while (fechaISO(d) <= hasta) {
    const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12));
    lista.push(fechaISO(fin) <= hasta ? fechaISO(fin) : hasta);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return lista;
}

async function sembrar({ force = false } = {}) {
  const db = Database.getInstance();
  await migrar({ reset: force });

  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM pyme');
  if (rows[0].n > 0) {
    console.log('La base ya tiene datos. Usa --force (o npm run db:reset) para recrearla.');
    return null;
  }

  const hoy = fechaISO(new Date());
  const inicio = '2026-05-01';
  const passAdmin = process.env.SEED_ADMIN_PASSWORD || passwordAleatoria();
  const passColab = process.env.SEED_COLABORADOR_PASSWORD || passwordAleatoria();

  const repos = {
    pyme: new PymeRepository(),
    usuario: new UsuarioRepository(),
    categoria: new CategoriaRepository(),
    indicador: new IndicadorRepository(),
    parametro: new ParametroRepository(),
    accion: new AccionRepository(),
    registro: new RegistroRepository(),
  };

  await db.transaccion(async (cx) => {
    // --- Empresa ---------------------------------------------------------------
    const pyme = await repos.pyme.insertar(new Pyme({
      nombre: 'Contrafuerte',
      giro: 'Taller de calzado de piel hecho a mano',
      ubicacionGeneral: 'Barrio de San Miguel, León, Guanajuato',
      descripcion: 'Taller familiar que corta, pespuntea y monta botines y zapatos de piel para tiendas de la región. Trabajan ocho personas en dos áreas: corte y pespunte, y montado y acabado.',
      problematica: 'Cada semana se acumulan recortes de piel y suela que nadie pesa, envases de pegamento con solvente que se mezclan con la basura común y un recibo de luz que sube sin explicación. Sin registros no se sabe cuánto material se pierde, cuánto cuesta ni si las mejoras funcionan.',
      objetivo: 'Medir cada semana los residuos, la energía y el agua por par producido, aprovechar al menos 40 % de los residuos y dar seguimiento a un plan de mejora con responsables y fechas.',
      numColaboradores: 8,
    }), cx);
    const P = pyme.id;

    // --- Usuarios de prueba ------------------------------------------------------
    const admin = await repos.usuario.insertar(await Usuario.crear({
      pymeId: P, nombre: 'Administración del taller', username: 'admin.demo',
      correo: 'admin@contrafuerte.example', password: passAdmin, rol: 'administrador',
    }), cx);
    const corte = await repos.usuario.insertar(await Usuario.crear({
      pymeId: P, nombre: 'Jefatura de corte', username: 'colaborador.demo',
      correo: 'corte@contrafuerte.example', password: passColab, rol: 'colaborador',
    }), cx);
    const pespunte = await repos.usuario.insertar(await Usuario.crear({
      pymeId: P, nombre: 'Área de pespunte', username: 'pespunte.demo',
      correo: 'pespunte@contrafuerte.example', password: passwordAleatoria(), rol: 'colaborador',
    }), cx);

    // --- Categorías ---------------------------------------------------------------
    const cat = {};
    const categorias = [
      ['electricidad', { nombre: 'Electricidad', tipo: 'consumo', unidad: 'kWh', descripcion: 'Lectura del medidor del taller (máquinas de pespunte, compresor, iluminación).' }],
      ['agua', { nombre: 'Agua', tipo: 'consumo', unidad: 'm3', descripcion: 'Consumo del recibo de agua; limpieza, sanitarios y acabado.' }],
      ['piel', { nombre: 'Piel comprada', tipo: 'materia', unidad: 'kg', descripcion: 'Piel de res para cortes, pesada al recibirla.' }],
      ['pares', { nombre: 'Pares producidos', tipo: 'produccion', unidad: 'par', descripcion: 'Pares terminados y empacados en la semana.' }],
      ['recortePiel', { nombre: 'Recorte de piel', tipo: 'residuo', unidad: 'kg', clasificacion: 'reutilizable', descripcion: 'Sobrantes del corte de capellada y forro.' }],
      ['recorteSuela', { nombre: 'Recorte de suela y hule', tipo: 'residuo', unidad: 'kg', clasificacion: 'reciclable', descripcion: 'Rebaba de suela, tapas y hule del montado.' }],
      ['carton', { nombre: 'Cartón y papel', tipo: 'residuo', unidad: 'kg', clasificacion: 'reciclable', descripcion: 'Cajas de proveedores, papel de moldes y separadores.' }],
      ['solvente', { nombre: 'Envases de pegamento y estopas con solvente', tipo: 'residuo', unidad: 'kg', clasificacion: 'peligroso', descripcion: 'Botes de pegamento, estopas y brochas impregnadas de solvente.' }],
      ['general', { nombre: 'Residuo general', tipo: 'residuo', unidad: 'kg', clasificacion: 'no_aprovechable', descripcion: 'Basura sin separar del taller y del comedor.' }],
      ['capacitacion', { nombre: 'Capacitación del personal', tipo: 'social', unidad: 'h', descripcion: 'Horas-persona de capacitación en seguridad, separación de residuos y uso de solventes.' }],
    ];
    for (const [k, datos] of categorias) {
      Categoria.validar(datos);
      cat[k] = await repos.categoria.insertar(new Categoria({ pymeId: P, ...datos }), cx);
    }

    // --- Supuestos de cálculo ----------------------------------------------------------
    const parametros = [
      ['tarifa_electrica', 'Precio de la electricidad', 4.1, 'MXN/kWh', 'Supuesto: precio medio por kWh de la tarifa de pequeña demanda en baja tensión, con IVA. Sustituir por el que muestra el recibo de CFE del taller.'],
      ['tarifa_agua', 'Precio del agua', 45, 'MXN/m3', 'Supuesto: precio medio por metro cúbico de uso comercial. Sustituir por el que muestra el recibo de agua.'],
      ['precio_piel_kg', 'Precio de la piel', 280, 'MXN/kg', 'Supuesto: costo promedio por kilogramo de la piel comprada en el periodo, a partir de las facturas del proveedor.'],
      ['precio_suela_kg', 'Valor de la suela', 40, 'MXN/kg', 'Supuesto: costo promedio por kilogramo de suela y hule.'],
      ['costo_gestor_kg', 'Costo del gestor de manejo especial', 18, 'MXN/kg', 'Supuesto: tarifa por kilogramo cotizada a un gestor autorizado de residuos de manejo especial.'],
      ['factor_emision', 'Factor de emisión de la red eléctrica', 0.44, 'kg CO2e/kWh', 'Supuesto: valor cercano al factor de emisión del Sistema Eléctrico Nacional que publica SEMARNAT en años recientes. Actualizar con el valor vigente del Registro Nacional de Emisiones.'],
    ];
    const par = {};
    for (const [clave, nombre, valor, unidad, fuente] of parametros) {
      par[clave] = await repos.parametro.insertar(new Parametro({ pymeId: P, clave, nombre, valor, unidad, fuente }), cx);
    }

    // --- Indicadores -------------------------------------------------------------------
    const ind = {};
    const indicadores = [
      ['aprov', { clave: 'TASA_APROVECHAMIENTO', nombre: 'Residuo aprovechado', dimension: 'ambiental', unidad: '%', meta: 40, sentido: 'mayor', publico: true,
        formula: 'Σ kg aprovechados ÷ Σ kg de residuo generado × 100',
        descripcion: 'Qué parte de los residuos se reutiliza, dona o recicla en lugar de ir a disposición final.' }],
      ['residuoPar', { clave: 'RESIDUO_POR_PAR', nombre: 'Residuo por par', dimension: 'ambiental', unidad: 'kg/par', meta: 0.2, sentido: 'menor', publico: true,
        formula: 'Σ kg de residuo generado ÷ Σ pares producidos',
        descripcion: 'Cuánto residuo deja cada par terminado. Baja cuando se corta mejor o se compra con menos empaque.' }],
      ['energiaPar', { clave: 'ENERGIA_POR_PAR', nombre: 'Energía por par', dimension: 'ambiental', unidad: 'kWh/par', meta: 1.2, sentido: 'menor', publico: true, categoriaId: cat.electricidad.id,
        formula: 'Σ kWh de electricidad ÷ Σ pares producidos',
        descripcion: 'Electricidad que consume cada par. Permite comparar meses con distinta producción.' }],
      ['agua', { clave: 'AGUA_MENSUAL', nombre: 'Consumo de agua', dimension: 'ambiental', unidad: 'm3/mes', meta: 6, sentido: 'menor', publico: false, categoriaId: cat.agua.id,
        formula: 'Σ m3 de agua ÷ número de meses del periodo',
        descripcion: 'Promedio mensual de agua del taller.' }],
      ['costo', { clave: 'COSTO_DESPERDICIO', nombre: 'Costo del desperdicio', dimension: 'economica', unidad: 'MXN/mes', meta: 15000, sentido: 'menor', publico: false,
        formula: 'Σ (costo del residuo × fracción no aprovechada) ÷ meses',
        descripcion: 'Dinero que se pierde en material no aprovechado más lo que se paga por su disposición.' }],
      ['plan', { clave: 'AVANCE_PLAN', nombre: 'Avance del plan de mejora', dimension: 'social', unidad: '%', meta: 80, sentido: 'mayor', publico: true,
        formula: 'Σ avance de las acciones iniciadas ÷ número de acciones iniciadas',
        descripcion: 'Promedio de avance de las acciones del plan que ya empezaron.' }],
      ['capacitacion', { clave: 'CAPACITACION_COLABORADOR', nombre: 'Capacitación por colaborador', dimension: 'social', unidad: 'h/persona/mes', meta: 1.5, sentido: 'mayor', publico: true, categoriaId: cat.capacitacion.id,
        formula: 'Σ horas-persona de capacitación ÷ colaboradores ÷ meses',
        descripcion: 'Horas de capacitación que recibe en promedio cada persona del taller al mes.' }],
    ];
    for (const [k, datos] of indicadores) {
      ind[k] = await repos.indicador.insertar(new Indicador({ pymeId: P, ...datos }), cx);
    }

    // --- Registros semanales y mensuales ------------------------------------------------
    const nuevo = (categoria, datos, usuario) => repos.registro.insertar(
      RegistroFactory.crear({ origenDato: 'demostracion', ...datos }, categoria, { pymeId: P, usuarioId: usuario.id }), cx,
    );

    const semanas = sabados(inicio, hoy);
    let folio = 1;
    for (const fecha of semanas) {
      const despuesTendido = fecha >= '2026-09-14';    // optimización del tendido en marcha
      const despuesConvenio = fecha >= '2026-08-03';   // convenio de recortes con escuela
      const despuesCarton = fecha >= '2026-10-05';     // separación de cartón

      const pares = Math.round(variar(150, 0.1));
      await nuevo(cat.pares, { fecha, cantidad: pares, notas: 'Cierre semanal de producción.' }, pespunte);

      const kgPiel = r1(pares * variar(0.55, 0.05));
      await nuevo(cat.piel, { fecha, cantidad: kgPiel, costo: Math.round(kgPiel * par.precio_piel_kg.valor), notas: 'Compra semanal de piel.' }, corte);

      const kgRecorte = r1(pares * variar(despuesTendido ? 0.105 : 0.13, 0.08));
      const pctRecorte = despuesConvenio ? variar(0.42, 0.12) : variar(0.12, 0.3);
      const aprovRecorte = r1(kgRecorte * pctRecorte);
      await nuevo(cat.recortePiel, {
        fecha, cantidad: kgRecorte, cantidadAprovechada: aprovRecorte,
        destino: despuesConvenio ? 'donacion' : 'reutilizacion',
        costo: Math.round(kgRecorte * par.precio_piel_kg.valor),
        evidenciaDestino: despuesConvenio ? 'Entrega semanal al taller de marroquinería escolar (dato de demostración).' : null,
        notas: despuesConvenio ? 'Recortes medianos separados para el convenio escolar.' : 'Piezas grandes guardadas para llaveros.',
      }, corte);

      const kgSuela = r1(variar(4.2, 0.15));
      const aprovSuela = fecha >= '2026-09-01' ? r1(kgSuela * variar(0.5, 0.15)) : 0;
      await nuevo(cat.recorteSuela, {
        fecha, cantidad: kgSuela, cantidadAprovechada: aprovSuela,
        destino: aprovSuela > 0 ? 'reciclaje' : 'relleno_sanitario',
        costo: Math.round(kgSuela * par.precio_suela_kg.valor),
      }, pespunte);

      const kgCarton = r1(variar(6, 0.2));
      const aprovCarton = r1(kgCarton * (despuesCarton ? variar(0.85, 0.08) : variar(0.35, 0.2)));
      await nuevo(cat.carton, {
        fecha, cantidad: kgCarton, cantidadAprovechada: aprovCarton, destino: 'reciclaje',
        notas: despuesCarton ? 'Cartón compactado para el centro de acopio.' : '',
      }, pespunte);

      const kgGeneral = r1(variar(despuesCarton ? 4.2 : 5.5, 0.15));
      await nuevo(cat.general, { fecha, cantidad: kgGeneral, cantidadAprovechada: 0, destino: 'relleno_sanitario' }, pespunte);

      // Desde junio los envases con solvente se separan y el gestor los recoge cada dos semanas.
      if (fecha >= '2026-06-01' && semanas.indexOf(fecha) % 2 === 0) {
        const kgSolv = r1(variar(5, 0.15));
        await nuevo(cat.solvente, {
          fecha, cantidad: kgSolv, cantidadAprovechada: 0, destino: 'manejo_especial',
          costo: Math.round(kgSolv * par.costo_gestor_kg.valor),
          evidenciaDestino: `Manifiesto de entrega DEMO-${String(folio).padStart(3, '0')} (dato de demostración).`,
        }, admin);
        folio += 1;
      }
    }

    for (const fecha of cortesMensuales(inicio, hoy)) {
      const parcial = fecha === hoy && !fecha.endsWith('30') && !fecha.endsWith('31');
      const fraccion = parcial ? Number(fecha.slice(8, 10)) / 30 : 1;
      const despuesServo = fecha >= '2026-09-30';
      const kwh = Math.round(variar(despuesServo ? 650 : 960, 0.05) * fraccion);
      await nuevo(cat.electricidad, {
        fecha, cantidad: kwh, costo: Math.round(kwh * par.tarifa_electrica.valor),
        notas: parcial ? 'Lectura parcial del mes en curso.' : 'Lectura de cierre de mes.',
      }, admin);
      const m3 = r1(variar(7, 0.08) * fraccion);
      await nuevo(cat.agua, { fecha, cantidad: m3, costo: Math.round(m3 * par.tarifa_agua.valor) }, admin);

      const horas = fecha >= '2026-08-01' ? variar(14, 0.2) : variar(5, 0.3);
      await nuevo(cat.capacitacion, {
        fecha, cantidad: Math.round(horas * fraccion),
        notas: fecha >= '2026-08-01' ? 'Plática de separación de residuos y manejo seguro de solventes.' : 'Inducción de seguridad para personal nuevo.',
      }, admin);
    }

    // --- Plan de acciones ----------------------------------------------------------------
    const acciones = [
      { datos: { titulo: 'Cambiar motores de embrague por servomotores en las máquinas de pespunte', indicadorId: ind.energiaPar.id, responsableId: admin.id,
        meta: 'Bajar el consumo eléctrico por par a 1.2 kWh o menos', fechaInicio: '2026-07-15', fechaObjetivo: '2026-09-30',
        descripcion: 'Los motores de embrague giran todo el tiempo aunque la máquina no cosa. El servomotor solo consume mientras se pisa el pedal.' },
      estado: 'completada', evidencias: [
        { fecha: '2026-09-29', descripcion: 'Instalados 6 servomotores; lectura del medidor antes y después del cambio (dato de demostración).' },
      ] },
      { datos: { titulo: 'Convenio de entrega de recortes de piel con un taller escolar de marroquinería', indicadorId: ind.aprov.id, responsableId: corte.id,
        meta: 'Entregar cada semana los recortes medianos y aprovechar 40 % del recorte', fechaInicio: '2026-07-20', fechaObjetivo: '2026-08-15',
        descripcion: 'La escuela usa los recortes para prácticas de llaveros, monederos y correas.' },
      estado: 'completada', evidencias: [
        { fecha: '2026-08-03', descripcion: 'Primera entrega semanal con hoja de recepción firmada por la escuela (dato de demostración).' },
      ] },
      { datos: { titulo: 'Optimizar el tendido de moldes sobre la piel', indicadorId: ind.residuoPar.id, responsableId: corte.id,
        meta: 'Reducir el recorte de piel a 0.10 kg por par', fechaInicio: '2026-09-01', fechaObjetivo: '2026-12-15',
        descripcion: 'Reacomodar los moldes por talla para aprovechar mejor cada piel y registrar el peso del recorte por lote.' },
      avance: 60, evidencias: [
        { fecha: '2026-10-10', descripcion: 'Nuevo acomodo probado en el modelo de botín; se registra el recorte por lote (dato de demostración).' },
      ] },
      { datos: { titulo: 'Contenedor rotulado y gestor autorizado para envases con solvente', indicadorId: ind.aprov.id, responsableId: admin.id,
        meta: 'Entregar 100 % de los envases con solvente con manifiesto', fechaInicio: '2026-06-01', fechaObjetivo: '2026-07-01',
        descripcion: 'Separar envases y estopas en un tambo cerrado y contratar la recolección quincenal.' },
      estado: 'completada', evidencias: [
        { fecha: '2026-07-01', descripcion: 'Contrato de recolección quincenal y primer manifiesto archivado (dato de demostración).' },
      ] },
      { datos: { titulo: 'Separar el cartón y venderlo a un centro de acopio', indicadorId: ind.costo.id, responsableId: pespunte.id,
        meta: 'Aprovechar 85 % del cartón y bajar el residuo general', fechaInicio: '2026-09-20', fechaObjetivo: '2026-11-30',
        descripcion: 'Compactar las cajas de proveedores y llevarlas cada mes al centro de acopio.' },
      avance: 70, evidencias: [] },
      { datos: { titulo: 'Reparar fugas y colocar llaves ahorradoras en el área de limpieza', indicadorId: ind.agua.id, responsableId: pespunte.id,
        meta: 'Bajar el consumo de agua a 6 m3 al mes', fechaInicio: '2026-11-20', fechaObjetivo: '2027-01-31',
        descripcion: 'Revisar sanitarios y tarja; cambiar empaques y colocar aireadores.' },
      avance: 0, evidencias: [] },
      { datos: { titulo: 'Capacitación mensual en separación de residuos y uso seguro de solventes', indicadorId: ind.capacitacion.id, responsableId: admin.id,
        meta: 'Dar al menos 1.5 horas de capacitación por persona al mes', fechaInicio: '2026-08-01', fechaObjetivo: '2027-02-28',
        descripcion: 'Pláticas de 2 horas para todo el personal el primer sábado de cada mes.' },
      avance: 45, evidencias: [
        { fecha: '2026-11-07', descripcion: 'Lista de asistencia de la plática de noviembre (dato de demostración).' },
      ] },
    ];
    for (const a of acciones) {
      const accion = AccionSustentable.crear(a.datos, { pymeId: P, creadoPor: admin.id });
      if (a.estado) accion.cambiarEstado(a.estado);
      if (a.avance !== undefined) accion.actualizarAvance(a.avance);
      await repos.accion.insertar(accion, cx);
      for (const e of a.evidencias) {
        await repos.accion.insertarEvidencia(Evidencia.crear(e, { accionId: accion.id, usuarioId: admin.id }), cx);
      }
    }
  });

  return { passAdmin, passColab, generadas: !process.env.SEED_ADMIN_PASSWORD };
}

module.exports = { sembrar };

if (require.main === module) {
  sembrar({ force: process.argv.includes('--force') })
    .then((r) => {
      if (r) {
        console.log('Caso de demostración cargado: Contrafuerte, taller de calzado (León, Gto.).');
        console.log('Cuentas de prueba: admin.demo (administrador), colaborador.demo (colaborador).');
        if (r.generadas) {
          console.log('Contraseñas generadas para esta carga (guárdalas; no se vuelven a mostrar):');
          console.log(`  admin.demo        ${r.passAdmin}`);
          console.log(`  colaborador.demo  ${r.passColab}`);
        } else {
          console.log('Contraseñas tomadas de SEED_ADMIN_PASSWORD y SEED_COLABORADOR_PASSWORD.');
        }
      }
      return Database.getInstance().cerrar();
    })
    .catch(async (err) => {
      console.error('Error al cargar datos:', err.message);
      if (err.errores) console.error(err.errores);
      await Database.getInstance().cerrar();
      process.exit(1);
    });
}
