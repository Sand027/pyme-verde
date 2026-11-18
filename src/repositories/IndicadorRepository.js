'use strict';

const BaseRepository = require('./BaseRepository');
const Indicador = require('../models/Indicador');

class IndicadorRepository extends BaseRepository {
  constructor() {
    super('indicador');
  }

  mapear(f) {
    return new Indicador({
      id: f.id,
      pymeId: f.pyme_id,
      categoriaId: f.categoria_id,
      clave: f.clave,
      nombre: f.nombre,
      dimension: f.dimension,
      formula: f.formula,
      unidad: f.unidad,
      meta: f.meta,
      sentido: f.sentido,
      publico: f.publico,
      descripcion: f.descripcion,
    });
  }

  porId(id, pymeId) {
    return this.uno('SELECT * FROM indicador WHERE id = $1 AND pyme_id = $2', [id, pymeId]);
  }

  listar(pymeId, { soloPublicos = false } = {}) {
    return this.varios(
      `SELECT * FROM indicador WHERE pyme_id = $1 AND ($2::boolean = FALSE OR publico)
       ORDER BY CASE dimension WHEN 'ambiental' THEN 1 WHEN 'economica' THEN 2 ELSE 3 END, id`,
      [pymeId, soloPublicos],
    );
  }

  async insertar(i, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO indicador (pyme_id, categoria_id, clave, nombre, dimension, formula, unidad, meta, sentido, publico, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [i.pymeId, i.categoriaId, i.clave, i.nombre, i.dimension, i.formula, i.unidad, i.meta, i.sentido, i.publico, i.descripcion],
      cliente,
    );
    i.asignarId(rows[0].id);
    return i;
  }

  async actualizarMeta(i) {
    await this.consultar(
      'UPDATE indicador SET meta = $3, publico = $4 WHERE id = $1 AND pyme_id = $2',
      [i.id, i.pymeId, i.meta, i.publico],
    );
    return i;
  }
}

module.exports = IndicadorRepository;
