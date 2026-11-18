'use strict';

const BaseRepository = require('./BaseRepository');

/** Bitácora de auditoría. Sus filas son registros simples, no entidades con reglas. */
class BitacoraRepository extends BaseRepository {
  constructor() {
    super('bitacora');
  }

  mapear(f) {
    return {
      id: f.id,
      evento: f.evento,
      entidad: f.entidad,
      entidadId: f.entidad_id,
      detalle: f.detalle,
      ip: f.ip,
      usuario: f.usuario_nombre,
      fecha: f.creado_en,
    };
  }

  async registrar({ usuarioId = null, evento, entidad = null, entidadId = null, detalle = {}, ip = null }) {
    await this.consultar(
      'INSERT INTO bitacora (usuario_id, evento, entidad, entidad_id, detalle, ip) VALUES ($1, $2, $3, $4, $5, $6)',
      [usuarioId, evento, entidad, entidadId, JSON.stringify(detalle), ip],
    );
  }

  /** Últimos eventos de los usuarios de una empresa (y los anónimos, como intentos fallidos). */
  async listar(pymeId, { pagina = 1, porPagina = 50, evento = null } = {}) {
    const limite = Math.min(Number(porPagina) || 50, 200);
    const desplazamiento = (Math.max(Number(pagina) || 1, 1) - 1) * limite;
    const { rows } = await this.consultar(
      `SELECT COUNT(*) OVER() AS total_filas, b.*, u.nombre AS usuario_nombre
       FROM bitacora b LEFT JOIN usuario u ON u.id = b.usuario_id
       WHERE (u.pyme_id = $1 OR b.usuario_id IS NULL) AND ($2::text IS NULL OR b.evento = $2)
       ORDER BY b.creado_en DESC, b.id DESC
       LIMIT $3 OFFSET $4`,
      [pymeId, evento, limite, desplazamiento],
    );
    return { items: rows.map((f) => this.mapear(f)), total: rows[0]?.total_filas ?? 0 };
  }
}

module.exports = BitacoraRepository;
