'use strict';

const BaseRepository = require('./BaseRepository');
const Categoria = require('../models/Categoria');
const RegistroFactory = require('../patterns/fabricas/RegistroFactory');

const SELECT_BASE = `
  SELECT r.*, c.nombre AS c_nombre, c.tipo AS c_tipo, c.unidad AS c_unidad, c.clasificacion AS c_clasificacion,
         c.descripcion AS c_descripcion, c.activa AS c_activa, u.nombre AS autor_nombre
  FROM registro r
  JOIN categoria c ON c.id = r.categoria_id
  LEFT JOIN usuario u ON u.id = r.usuario_id`;

// Lista blanca de columnas de orden: el valor del cliente nunca se concatena.
const ORDENES = Object.freeze({
  fecha_desc: 'r.fecha DESC, r.id DESC',
  fecha_asc: 'r.fecha ASC, r.id ASC',
  cantidad_desc: 'r.cantidad DESC, r.id DESC',
  costo_desc: 'r.costo DESC NULLS LAST, r.id DESC',
  categoria: 'c.nombre ASC, r.fecha DESC',
});

class RegistroRepository extends BaseRepository {
  constructor() {
    super('registro');
  }

  mapear(f) {
    const categoria = new Categoria({
      id: f.categoria_id,
      pymeId: f.pyme_id,
      nombre: f.c_nombre,
      tipo: f.c_tipo,
      unidad: f.c_unidad,
      clasificacion: f.c_clasificacion,
      descripcion: f.c_descripcion,
      activa: f.c_activa,
    });
    return RegistroFactory.desdePersistencia({
      id: f.id,
      pymeId: f.pyme_id,
      usuarioId: f.usuario_id,
      autorNombre: f.autor_nombre,
      fecha: f.fecha,
      cantidad: f.cantidad,
      costo: f.costo,
      origenDato: f.origen_dato,
      notas: f.notas,
      creadoEn: f.creado_en,
      cantidadAprovechada: f.cantidad_aprovechada,
      destino: f.destino,
      evidenciaDestino: f.evidencia_destino,
    }, categoria);
  }

  porId(id, pymeId) {
    return this.uno(`${SELECT_BASE} WHERE r.id = $1 AND r.pyme_id = $2`, [id, pymeId]);
  }

  /**
   * Búsqueda con filtros opcionales y paginación.
   * @returns {Promise<{ items: import('../models/Registro').Registro[], total: number }>}
   */
  async buscar(pymeId, { desde = null, hasta = null, categoriaId = null, tipo = null, usuarioId = null,
    origen = null, texto = null, orden = 'fecha_desc', pagina = 1, porPagina = 20 } = {}) {
    const limite = Math.min(Math.max(Number(porPagina) || 20, 1), 500);
    const desplazamiento = (Math.max(Number(pagina) || 1, 1) - 1) * limite;
    const { rows } = await this.consultar(
      `${SELECT_BASE.replace('SELECT r.*', 'SELECT COUNT(*) OVER() AS total_filas, r.*')}
       WHERE r.pyme_id = $1
         AND ($2::date IS NULL OR r.fecha >= $2)
         AND ($3::date IS NULL OR r.fecha <= $3)
         AND ($4::int IS NULL OR r.categoria_id = $4)
         AND ($5::text IS NULL OR c.tipo = $5)
         AND ($6::int IS NULL OR r.usuario_id = $6)
         AND ($7::text IS NULL OR r.origen_dato = $7)
         AND ($8::text IS NULL OR r.notas ILIKE '%' || $8 || '%' OR c.nombre ILIKE '%' || $8 || '%')
       ORDER BY ${ORDENES[orden] || ORDENES.fecha_desc}
       LIMIT $9 OFFSET $10`,
      [pymeId, desde, hasta, categoriaId, tipo, usuarioId, origen, texto, limite, desplazamiento],
    );
    return { items: rows.map((f) => this.mapear(f)), total: rows[0]?.total_filas ?? 0 };
  }

  /** Todos los registros de un periodo, para calcular indicadores. */
  enPeriodo(pymeId, desde, hasta) {
    return this.varios(
      `${SELECT_BASE} WHERE r.pyme_id = $1 AND r.fecha BETWEEN $2 AND $3 ORDER BY r.fecha`,
      [pymeId, desde, hasta],
    );
  }

  async insertar(r, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO registro (pyme_id, categoria_id, usuario_id, fecha, cantidad, unidad, costo, origen_dato,
                             cantidad_aprovechada, destino, evidencia_destino, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [r.pymeId, r.categoria.id, r.usuarioId, r.fecha, r.cantidad, r.unidad, r.costo, r.origenDato,
        r.cantidadAprovechada ?? null, r.destino ?? null, r.evidenciaDestino ?? null, r.notas],
      cliente,
    );
    r.asignarId(rows[0].id);
    return r;
  }

  async actualizar(r) {
    await this.consultar(
      `UPDATE registro SET categoria_id = $3, fecha = $4, cantidad = $5, unidad = $6, costo = $7, origen_dato = $8,
              cantidad_aprovechada = $9, destino = $10, evidencia_destino = $11, notas = $12, actualizado_en = now()
       WHERE id = $1 AND pyme_id = $2`,
      [r.id, r.pymeId, r.categoria.id, r.fecha, r.cantidad, r.unidad, r.costo, r.origenDato,
        r.cantidadAprovechada ?? null, r.destino ?? null, r.evidenciaDestino ?? null, r.notas],
    );
    return r;
  }

  async actualizarOrigen(r) {
    await this.consultar(
      'UPDATE registro SET origen_dato = $3, actualizado_en = now() WHERE id = $1 AND pyme_id = $2',
      [r.id, r.pymeId, r.origenDato],
    );
    return r;
  }

  /** Totales mensuales por categoría (para tablas y gráficas). */
  async totalesMensuales(pymeId, desde, hasta) {
    const { rows } = await this.consultar(
      `SELECT to_char(r.fecha, 'YYYY-MM') AS mes, c.id AS categoria_id, c.nombre AS categoria, c.tipo, c.unidad,
              SUM(r.cantidad)::float AS cantidad,
              COALESCE(SUM(r.cantidad_aprovechada), 0)::float AS aprovechada,
              COALESCE(SUM(r.costo), 0)::float AS costo,
              COUNT(*)::int AS registros
       FROM registro r JOIN categoria c ON c.id = r.categoria_id
       WHERE r.pyme_id = $1 AND r.fecha BETWEEN $2 AND $3
       GROUP BY 1, c.id, c.nombre, c.tipo, c.unidad
       ORDER BY 1, c.nombre`,
      [pymeId, desde, hasta],
    );
    return rows;
  }

  /** Resumen de residuos por categoría y destino. */
  async resumenResiduos(pymeId, desde, hasta) {
    const { rows } = await this.consultar(
      `SELECT c.id AS categoria_id, c.nombre AS categoria, c.clasificacion, c.unidad,
              SUM(r.cantidad)::float AS generado,
              COALESCE(SUM(r.cantidad_aprovechada), 0)::float AS aprovechado,
              COUNT(*)::int AS registros,
              COUNT(*) FILTER (WHERE r.evidencia_destino IS NOT NULL AND r.evidencia_destino <> '')::int AS con_evidencia
       FROM registro r JOIN categoria c ON c.id = r.categoria_id
       WHERE r.pyme_id = $1 AND c.tipo = 'residuo' AND r.fecha BETWEEN $2 AND $3
       GROUP BY c.id, c.nombre, c.clasificacion, c.unidad
       ORDER BY generado DESC`,
      [pymeId, desde, hasta],
    );
    return rows;
  }

  async resumenDestinos(pymeId, desde, hasta) {
    const { rows } = await this.consultar(
      `SELECT r.destino, SUM(r.cantidad_aprovechada)::float AS aprovechado, SUM(r.cantidad)::float AS generado,
              COUNT(*)::int AS registros
       FROM registro r JOIN categoria c ON c.id = r.categoria_id
       WHERE r.pyme_id = $1 AND c.tipo = 'residuo' AND r.fecha BETWEEN $2 AND $3 AND r.destino IS NOT NULL
       GROUP BY r.destino ORDER BY generado DESC`,
      [pymeId, desde, hasta],
    );
    return rows;
  }

  async rangoFechas(pymeId) {
    const { rows } = await this.consultar(
      'SELECT MIN(fecha) AS primera, MAX(fecha) AS ultima, COUNT(*)::int AS total FROM registro WHERE pyme_id = $1', [pymeId],
    );
    return rows[0];
  }
}

RegistroRepository.ORDENES = Object.keys(ORDENES);

module.exports = RegistroRepository;
