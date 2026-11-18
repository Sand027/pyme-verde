'use strict';

const { ValidacionError } = require('./errores');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Acumula errores de validación por campo con una interfaz encadenable.
 * Los modelos lo usan para validar en el servidor, independientemente de la
 * validación que haga el navegador.
 *
 *   new Validador(datos).requerido('fecha', 'La fecha').fecha('fecha').lanzarSiHayErrores();
 */
class Validador {
  #datos;
  #errores = {};

  constructor(datos = {}) {
    this.#datos = datos;
  }

  get errores() {
    return { ...this.#errores };
  }

  get valido() {
    return Object.keys(this.#errores).length === 0;
  }

  #vacio(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  agregar(campo, mensaje) {
    if (!this.#errores[campo]) this.#errores[campo] = mensaje;
    return this;
  }

  requerido(campo, etiqueta) {
    if (this.#vacio(this.#datos[campo])) this.agregar(campo, `${etiqueta} es obligatorio.`);
    return this;
  }

  texto(campo, etiqueta, { min = 0, max = 255 } = {}) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    const largo = String(v).trim().length;
    if (largo < min) this.agregar(campo, `${etiqueta} debe tener al menos ${min} caracteres.`);
    if (largo > max) this.agregar(campo, `${etiqueta} admite como máximo ${max} caracteres.`);
    return this;
  }

  numero(campo, etiqueta, { min = -Infinity, max = Infinity, entero = false } = {}) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    const n = Number(v);
    if (!Number.isFinite(n)) return this.agregar(campo, `${etiqueta} debe ser un número.`);
    if (entero && !Number.isInteger(n)) return this.agregar(campo, `${etiqueta} debe ser un número entero.`);
    if (n < min) return this.agregar(campo, `${etiqueta} no puede ser menor que ${min}.`);
    if (n > max) return this.agregar(campo, `${etiqueta} no puede ser mayor que ${max}.`);
    return this;
  }

  fecha(campo, etiqueta, { noFutura = false } = {}) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    if (!FECHA_RE.test(String(v)) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
      return this.agregar(campo, `${etiqueta} debe tener el formato AAAA-MM-DD.`);
    }
    if (noFutura) {
      const hoy = new Date().toISOString().slice(0, 10);
      if (String(v) > hoy) this.agregar(campo, `${etiqueta} no puede estar en el futuro.`);
    }
    return this;
  }

  enLista(campo, etiqueta, opciones) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    if (!opciones.includes(v)) this.agregar(campo, `${etiqueta} no es una opción válida.`);
    return this;
  }

  correo(campo, etiqueta) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    if (!CORREO_RE.test(String(v).trim())) this.agregar(campo, `${etiqueta} no tiene un formato válido.`);
    return this;
  }

  url(campo, etiqueta) {
    const v = this.#datos[campo];
    if (this.#vacio(v)) return this;
    try {
      const u = new URL(String(v));
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      this.agregar(campo, `${etiqueta} debe ser un enlace http o https.`);
    }
    return this;
  }

  /** Regla libre: si la condición es falsa se registra el mensaje. */
  regla(campo, condicion, mensaje) {
    if (!condicion) this.agregar(campo, mensaje);
    return this;
  }

  lanzarSiHayErrores(mensaje) {
    if (!this.valido) throw new ValidacionError(this.errores, mensaje);
    return this;
  }
}

module.exports = Validador;
