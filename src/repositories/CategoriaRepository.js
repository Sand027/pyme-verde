'use strict';

const BaseRepository = require('./BaseRepository');
const Categoria = require('../models/Categoria');

class CategoriaRepository extends BaseRepository {
  constructor() {
    super('categoria');
  }

  mapear(f) {
    return new Categoria({
      id: f.id,
      pymeId: f.pyme_id,
      nombre: f.nombre,
      tipo: f.tipo,
      unidad: f.unidad,
      clasificacion: f.clasificacion,
      descripcion: f.descripcion,
      activa: f.activa,
    });
  }

  porId(id, pymeId) {
    return this.uno('SELECT * FROM categoria WHERE id = $1 AND pyme_id = $2', [id, pymeId]);
  }

  listar(pymeId, { soloActivas = false, tipo = null } = {}) {
    return this.varios(
      `SELECT * FROM categoria
       WHERE pyme_id = $1 AND ($2::boolean = FALSE OR activa) AND ($3::text IS NULL OR tipo = $3)
       ORDER BY CASE tipo WHEN 'residuo' THEN 1 WHEN 'consumo' THEN 2 WHEN 'materia' THEN 3
                          WHEN 'produccion' THEN 4 ELSE 5 END, nombre`,
      [pymeId, soloActivas, tipo],
    );
  }

  async insertar(c, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO categoria (pyme_id, nombre, tipo, unidad, clasificacion, descripcion, activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [c.pymeId, c.nombre, c.tipo, c.unidad, c.clasificacion, c.descripcion, c.activa],
      cliente,
    );
    c.asignarId(rows[0].id);
    return c;
  }

  async actualizar(c) {
    await this.consultar(
      'UPDATE categoria SET nombre = $3, descripcion = $4, activa = $5 WHERE id = $1 AND pyme_id = $2',
      [c.id, c.pymeId, c.nombre, c.descripcion, c.activa],
    );
    return c;
  }

  async contarRegistros(id) {
    const { rows } = await this.consultar('SELECT COUNT(*)::int AS n FROM registro WHERE categoria_id = $1', [id]);
    return rows[0].n;
  }
}

module.exports = CategoriaRepository;
