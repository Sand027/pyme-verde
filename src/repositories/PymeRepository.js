'use strict';

const BaseRepository = require('./BaseRepository');
const Pyme = require('../models/Pyme');

class PymeRepository extends BaseRepository {
  constructor() {
    super('pyme');
  }

  mapear(f) {
    return new Pyme({
      id: f.id,
      nombre: f.nombre,
      giro: f.giro,
      ubicacionGeneral: f.ubicacion_general,
      descripcion: f.descripcion,
      problematica: f.problematica,
      objetivo: f.objetivo,
      numColaboradores: f.num_colaboradores,
    });
  }

  porId(id) {
    return this.uno('SELECT * FROM pyme WHERE id = $1', [id]);
  }

  /** La empresa que se muestra en la sección pública. */
  publica() {
    return this.uno('SELECT * FROM pyme ORDER BY id LIMIT 1');
  }

  async insertar(pyme, cliente = null) {
    const { rows } = await this.consultar(
      `INSERT INTO pyme (nombre, giro, ubicacion_general, descripcion, problematica, objetivo, num_colaboradores)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [pyme.nombre, pyme.giro, pyme.ubicacionGeneral, pyme.descripcion, pyme.problematica, pyme.objetivo, pyme.numColaboradores],
      cliente,
    );
    pyme.asignarId(rows[0].id);
    return pyme;
  }

  async actualizar(pyme) {
    await this.consultar(
      `UPDATE pyme SET nombre = $2, giro = $3, ubicacion_general = $4, descripcion = $5, problematica = $6,
              objetivo = $7, num_colaboradores = $8, actualizado_en = now()
       WHERE id = $1`,
      [pyme.id, pyme.nombre, pyme.giro, pyme.ubicacionGeneral, pyme.descripcion, pyme.problematica, pyme.objetivo, pyme.numColaboradores],
    );
    return pyme;
  }
}

module.exports = PymeRepository;
