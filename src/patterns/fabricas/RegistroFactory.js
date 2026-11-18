'use strict';

const {
  Registro, RegistroConsumo, RegistroProduccion, RegistroSocial, RegistroResiduo,
} = require('../../models/Registro');
const { ValidacionError } = require('../../utils/errores');

/**
 * Patrón Factory.
 *
 * Problema que resuelve: el servicio recibe datos genéricos de un formulario o
 * de la API y no debe saber qué subclase de Registro corresponde a cada tipo
 * de categoría ni qué reglas aplicar. La fábrica decide la clase concreta,
 * normaliza la unidad y ejecuta la validación común y la específica.
 */
class RegistroFactory {
  static #clases = [RegistroConsumo, RegistroProduccion, RegistroSocial, RegistroResiduo];

  static claseParaTipo(tipo) {
    const clase = RegistroFactory.#clases.find((c) => c.tipos.includes(tipo));
    if (!clase) throw new Error(`No hay clase de registro para el tipo "${tipo}".`);
    return clase;
  }

  /** Reconstruye un registro leído de la base de datos (sin validar). */
  static desdePersistencia(datos, categoria) {
    const Clase = RegistroFactory.claseParaTipo(categoria.tipo);
    return new Clase({ ...datos, categoria });
  }

  /**
   * Crea un registro nuevo (o la versión editada de uno existente) a partir de
   * datos de entrada, validando todo en el servidor.
   */
  static crear(datos, categoria, { id = null, pymeId, usuarioId, autorNombre = null, creadoEn = null } = {}) {
    if (!categoria) {
      throw new ValidacionError({ categoriaId: 'Selecciona una categoría válida.' });
    }
    if (!categoria.activa) {
      throw new ValidacionError({ categoriaId: 'La categoría está desactivada.' });
    }
    const { validador, cantidad } = Registro.validarBase(datos, categoria);
    validador.lanzarSiHayErrores();

    const Clase = RegistroFactory.claseParaTipo(categoria.tipo);
    const registro = new Clase({
      id,
      pymeId,
      categoria,
      usuarioId,
      autorNombre,
      creadoEn,
      fecha: datos.fecha,
      cantidad,
      costo: datos.costo,
      origenDato: datos.origenDato,
      notas: typeof datos.notas === 'string' ? datos.notas.trim() : '',
      cantidadAprovechada: datos.cantidadAprovechada,
      destino: datos.destino,
      evidenciaDestino: datos.evidenciaDestino,
    });

    const errores = registro.validarEspecifico();
    if (Object.keys(errores).length > 0) throw new ValidacionError(errores);
    return registro;
  }
}

module.exports = RegistroFactory;
