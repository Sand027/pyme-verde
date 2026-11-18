'use strict';

const BaseRepository = require('./BaseRepository');
const AccionSustentable = require('../models/AccionSustentable');
const Evidencia = require('../models/Evidencia');

const SELECT_BASE = `
  SELECT a.*, i.nombre AS indicador_nombre, u.nombre AS responsable_nombre
  FROM accion a
  LEFT JOIN indicador i ON i.id = a.indicador_id
  LEFT JOIN usuario u ON u.id = a.responsable_id`;

class AccionRepository extends BaseRepository {
  constructor() {
    super('accion');
  }

  mapear(f, evidencias = []) {
    return new AccionSustentable({
      id: f.id,
      pymeId: f.pyme_id,
      indicadorId: f.indicador_id,
      indicadorNombre: f.indicador_nombre,
      responsableId: f.responsable_id,
      responsableNombre: f.responsable_nombre,
      creadoPor: f.creado_por,
      titulo: f.titulo,
      descripcion: f.descripcion,
      meta: f.meta,
      fechaInicio: f.fecha_inicio,
      fechaObjetivo: f.fecha_objetivo,
      estado: f.estado,
      avance: f.avance,
      evidencias,
    });
  }

  async #conEvidencias(filas) {
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.id);
    const { rows } = await this.consultar(
      `SELECT e.*, u.nombre AS autor_nombre FROM evidencia e LEFT JOIN usuario u ON u.id = e.usuario_id
       WHERE e.accion_id = ANY($1::int[]) ORDER BY e.fecha DESC, e.id DESC`,
      [ids],
    );
    const porAccion = new Map();
    for (const e of rows) {
      const ev = new Evidencia({
        id: e.id, accionId: e.accion_id, usuarioId: e.usuario_id, autorNombre: e.autor_nombre,
        fecha: e.fecha, descripcion: e.descripcion, enlace: e.enlace,
      });
      if (!porAccion.has(e.accion_id)) porAccion.set(e.accion_id, []);
      porAccion.get(e.accion_id).push(ev);
    }
    return filas.map((f) => this.mapear(f, porAccion.get(f.id) || []));
  }

  async porId(id, pymeId) {
    const { rows } = await this.consultar(`${SELECT_BASE} WHERE a.id = $1 AND a.pyme_id = $2`, [id, pymeId]);
    const [accion] = await this.#conEvidencias(rows);
    return accion || null;
  }

  async listar(pymeId, { estado = null, responsableId = null, indicadorId = null } = {}) {
    const { rows } = await this.consultar(
      `${SELECT_BASE}
       WHERE a.pyme_id = $1 AND ($2::text IS NULL OR a.estado = $2)
         AND ($3::int IS NULL OR a.responsable_id = $3) AND ($4::int IS NULL OR a.indicador_id = $4)
       ORDER BY CASE a.estado WHEN 'en_proceso' THEN 1 WHEN 'pendiente' THEN 2 ELSE 3 END, a.fecha_objetivo`,
      [pymeId, estado, responsableId, indicadorId],
    );
    return this.#conEvidencias(rows);
  }

  async insertar(a, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO accion (pyme_id, indicador_id, responsable_id, creado_por, titulo, descripcion, meta,
                           fecha_inicio, fecha_objetivo, estado, avance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [a.pymeId, a.indicadorId, a.responsableId, a.creadoPor, a.titulo, a.descripcion, a.meta,
        a.fechaInicio, a.fechaObjetivo, a.estado, a.avance],
      cliente,
    );
    a.asignarId(rows[0].id);
    return a;
  }

  async actualizar(a) {
    await this.consultar(
      `UPDATE accion SET indicador_id = $3, responsable_id = $4, titulo = $5, descripcion = $6, meta = $7,
              fecha_inicio = $8, fecha_objetivo = $9, estado = $10, avance = $11, actualizado_en = now()
       WHERE id = $1 AND pyme_id = $2`,
      [a.id, a.pymeId, a.indicadorId, a.responsableId, a.titulo, a.descripcion, a.meta,
        a.fechaInicio, a.fechaObjetivo, a.estado, a.avance],
    );
    return a;
  }

  async insertarEvidencia(e, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO evidencia (accion_id, usuario_id, fecha, descripcion, enlace)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [e.accionId, e.usuarioId, e.fecha, e.descripcion, e.enlace],
      cliente,
    );
    e.asignarId(rows[0].id);
    return e;
  }

  async conteoPorEstado(pymeId) {
    const { rows } = await this.consultar(
      'SELECT estado, COUNT(*)::int AS n FROM accion WHERE pyme_id = $1 GROUP BY estado', [pymeId],
    );
    return Object.fromEntries(rows.map((r) => [r.estado, r.n]));
  }
}

module.exports = AccionRepository;
