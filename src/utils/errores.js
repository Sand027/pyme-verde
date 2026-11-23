'use strict';

/**
 * Jerarquía de errores de la aplicación. El manejador central traduce cada
 * tipo a un código HTTP sin exponer detalles internos.
 */
class AppError extends Error {
  constructor(mensaje, status = 500, codigo = 'ERROR_INTERNO') {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
    this.codigo = codigo;
  }
}

class ValidacionError extends AppError {
  /** @param {Record<string,string>} errores campo -> mensaje */
  constructor(errores, mensaje = 'Revisa los campos marcados.') {
    super(mensaje, 422, 'VALIDACION');
    this.errores = errores;
  }
}

class NoAutenticadoError extends AppError {
  constructor(mensaje = 'Inicia sesión para continuar.') {
    super(mensaje, 401, 'NO_AUTENTICADO');
  }
}

class ProhibidoError extends AppError {
  constructor(mensaje = 'Tu rol no tiene permiso para esta operación.') {
    super(mensaje, 403, 'PROHIBIDO');
  }
}

class NoEncontradoError extends AppError {
  constructor(recurso = 'El recurso') {
    super(`${recurso} no existe o no pertenece a tu empresa.`, 404, 'NO_ENCONTRADO');
  }
}

class ConflictoError extends AppError {
  constructor(mensaje) {
    super(mensaje, 409, 'CONFLICTO');
  }
}

/** Un servicio web externo no respondió o respondió algo inválido. */
class ServicioExternoError extends AppError {
  constructor(servicio, detalle = '') {
    super(`El servicio ${servicio} no está disponible en este momento. Inténtalo más tarde.`, 502, 'SERVICIO_EXTERNO');
    this.detalle = detalle;
  }
}

module.exports = { AppError, ValidacionError, NoAutenticadoError, ProhibidoError, NoEncontradoError, ConflictoError, ServicioExternoError };
