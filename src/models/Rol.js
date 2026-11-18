'use strict';

/**
 * Permisos del sistema. Se verifican en el servidor (middleware y servicios),
 * no solo ocultando botones en la interfaz.
 */
const PERMISOS = Object.freeze({
  PANEL_VER: 'panel:ver',
  REGISTROS_LEER: 'registros:leer',
  REGISTROS_CREAR: 'registros:crear',
  REGISTROS_EDITAR_PROPIOS: 'registros:editar_propios',
  REGISTROS_EDITAR_TODOS: 'registros:editar_todos',
  REGISTROS_ELIMINAR: 'registros:eliminar',
  INDICADORES_LEER: 'indicadores:leer',
  INDICADORES_ADMINISTRAR: 'indicadores:administrar',
  ACCIONES_LEER: 'acciones:leer',
  ACCIONES_SEGUIR_PROPIAS: 'acciones:seguir_propias',
  ACCIONES_ADMINISTRAR: 'acciones:administrar',
  REPORTES_GENERAR: 'reportes:generar',
  CATALOGOS_ADMINISTRAR: 'catalogos:administrar',
  USUARIOS_ADMINISTRAR: 'usuarios:administrar',
  BITACORA_LEER: 'bitacora:leer',
  CONFIGURACION_ADMINISTRAR: 'configuracion:administrar',
});

/**
 * Un rol agrupa permisos. Las instancias son inmutables y se comparten
 * (ADMINISTRADOR y COLABORADOR).
 */
class Rol {
  #nombre;
  #etiqueta;
  #permisos;

  constructor(nombre, etiqueta, permisos) {
    this.#nombre = nombre;
    this.#etiqueta = etiqueta;
    this.#permisos = new Set(permisos);
    Object.freeze(this);
  }

  get nombre() {
    return this.#nombre;
  }

  get etiqueta() {
    return this.#etiqueta;
  }

  get permisos() {
    return [...this.#permisos];
  }

  puede(permiso) {
    return this.#permisos.has(permiso);
  }

  static desdeNombre(nombre) {
    const rol = Rol.TODOS.find((r) => r.nombre === nombre);
    if (!rol) throw new Error(`Rol desconocido: ${nombre}`);
    return rol;
  }

  toJSON() {
    return this.#nombre;
  }
}

Rol.COLABORADOR = new Rol('colaborador', 'Colaborador', [
  PERMISOS.PANEL_VER,
  PERMISOS.REGISTROS_LEER,
  PERMISOS.REGISTROS_CREAR,
  PERMISOS.REGISTROS_EDITAR_PROPIOS,
  PERMISOS.INDICADORES_LEER,
  PERMISOS.ACCIONES_LEER,
  PERMISOS.ACCIONES_SEGUIR_PROPIAS,
]);

Rol.ADMINISTRADOR = new Rol('administrador', 'Administrador', Object.values(PERMISOS));

Rol.TODOS = Object.freeze([Rol.ADMINISTRADOR, Rol.COLABORADOR]);
Rol.NOMBRES = Object.freeze(Rol.TODOS.map((r) => r.nombre));

module.exports = { Rol, PERMISOS };
