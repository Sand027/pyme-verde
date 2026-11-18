'use strict';

const ETIQUETAS_DESTINO = Object.freeze({
  reutilizacion: 'Reutilización',
  reciclaje: 'Reciclaje',
  donacion: 'Donación',
  coprocesamiento: 'Coprocesamiento',
  manejo_especial: 'Gestor de manejo especial',
  relleno_sanitario: 'Relleno sanitario',
});

/**
 * Patrón Strategy (estrategia abstracta).
 *
 * Problema que resuelve: cada clase de residuo admite destinos distintos y
 * reglas distintas (un envase con solvente no puede ir al relleno sanitario;
 * un recorte de piel sí puede reutilizarse). En lugar de un switch repetido en
 * servicios y vistas, cada clasificación encapsula sus reglas en una clase.
 */
class DestinoResiduoStrategy {
  constructor() {
    if (new.target === DestinoResiduoStrategy) {
      throw new TypeError('DestinoResiduoStrategy es abstracta.');
    }
  }

  /** @returns {string} clasificación de la categoría que atiende */
  get clasificacion() {
    throw new Error('Implementar clasificacion');
  }

  /** Destinos válidos para la parte que sí se aprovecha. */
  destinosAprovechamiento() {
    return [];
  }

  /** Destino obligado para la parte que no se aprovecha. */
  destinoDisposicion() {
    return 'relleno_sanitario';
  }

  /** ¿Se exige evidencia documental del destino (manifiesto, recibo)? */
  exigeEvidencia() {
    return false;
  }

  /** Opciones concretas de reducción, reutilización o reciclaje. */
  recomendaciones() {
    return [];
  }

  destinosPermitidos() {
    return [...this.destinosAprovechamiento(), this.destinoDisposicion()];
  }

  /**
   * Valida la combinación cantidad aprovechada / destino / evidencia.
   * @returns {Record<string,string>} errores por campo (vacío si es válido)
   */
  validar({ cantidad, cantidadAprovechada, destino, evidenciaDestino }) {
    const errores = {};
    const aprovechada = Number(cantidadAprovechada) || 0;

    if (aprovechada > Number(cantidad)) {
      errores.cantidadAprovechada = 'La cantidad aprovechada no puede superar la cantidad generada.';
    }
    if (aprovechada > 0 && this.destinosAprovechamiento().length === 0) {
      errores.cantidadAprovechada = 'Esta clase de residuo no admite aprovechamiento; registra 0.';
    }
    if (destino) {
      const validos = aprovechada > 0 ? this.destinosAprovechamiento() : [this.destinoDisposicion()];
      if (!validos.includes(destino)) {
        const nombres = validos.map((d) => ETIQUETAS_DESTINO[d]).join(', ');
        errores.destino = aprovechada > 0
          ? `Para la parte aprovechada usa: ${nombres}.`
          : `Sin aprovechamiento, el destino debe ser: ${nombres}.`;
      }
    } else {
      errores.destino = 'Indica el destino del residuo.';
    }
    if (this.exigeEvidencia() && !(evidenciaDestino && String(evidenciaDestino).trim().length >= 5)) {
      errores.evidenciaDestino = 'Este residuo requiere evidencia del destino (folio de manifiesto o recibo del gestor).';
    }
    return errores;
  }

  describir() {
    return {
      clasificacion: this.clasificacion,
      destinosAprovechamiento: this.destinosAprovechamiento().map((d) => ({ valor: d, etiqueta: ETIQUETAS_DESTINO[d] })),
      destinoDisposicion: { valor: this.destinoDisposicion(), etiqueta: ETIQUETAS_DESTINO[this.destinoDisposicion()] },
      exigeEvidencia: this.exigeEvidencia(),
      recomendaciones: this.recomendaciones(),
    };
  }
}

DestinoResiduoStrategy.ETIQUETAS = ETIQUETAS_DESTINO;

module.exports = DestinoResiduoStrategy;
