'use strict';

const BaseRepository = require('./BaseRepository');
const Parametro = require('../models/Parametro');

class ParametroRepository extends BaseRepository {
  constructor() {
    super('parametro');
  }

  mapear(f) {
    return new Parametro({
      id: f.id, pymeId: f.pyme_id, clave: f.clave, nombre: f.nombre, valor: f.valor, unidad: f.unidad, fuente: f.fuente,
    });
  }

  listar(pymeId) {
    return this.varios('SELECT * FROM parametro WHERE pyme_id = $1 ORDER BY id', [pymeId]);
  }

  porId(id, pymeId) {
    return this.uno('SELECT * FROM parametro WHERE id = $1 AND pyme_id = $2', [id, pymeId]);
  }

  async mapa(pymeId) {
    const lista = await this.listar(pymeId);
    return new Map(lista.map((p) => [p.clave, p.valor]));
  }

  async insertar(p, cliente = null) {
    const { rows } = await this.consultar(
      'INSERT INTO parametro (pyme_id, clave, nombre, valor, unidad, fuente) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [p.pymeId, p.clave, p.nombre, p.valor, p.unidad, p.fuente],
      cliente,
    );
    p.asignarId(rows[0].id);
    return p;
  }

  async actualizar(p) {
    await this.consultar('UPDATE parametro SET valor = $3, fuente = $4 WHERE id = $1 AND pyme_id = $2',
      [p.id, p.pymeId, p.valor, p.fuente]);
    return p;
  }
}

module.exports = ParametroRepository;
