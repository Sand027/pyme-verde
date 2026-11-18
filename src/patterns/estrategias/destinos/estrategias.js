'use strict';

const DestinoResiduoStrategy = require('./DestinoResiduoStrategy');

/** Recortes de piel, forro o textil: se pueden convertir en otros productos. */
class ReutilizableStrategy extends DestinoResiduoStrategy {
  get clasificacion() { return 'reutilizable'; }

  destinosAprovechamiento() {
    return ['reutilizacion', 'donacion', 'reciclaje'];
  }

  recomendaciones() {
    return [
      'Separar los recortes por tamaño al terminar cada corte: las piezas mayores a 10 x 10 cm sirven para llaveros, monederos o refuerzos.',
      'Acordar con escuelas de diseño o talleres de marroquinería la entrega mensual de recortes medianos.',
      'Revisar el acomodo de los moldes sobre la piel (tendido) para reducir el recorte desde el origen.',
    ];
  }
}

/** Cartón, papel, hule o suela: tienen mercado de reciclaje. */
class ReciclableStrategy extends DestinoResiduoStrategy {
  get clasificacion() { return 'reciclable'; }

  destinosAprovechamiento() {
    return ['reciclaje', 'reutilizacion'];
  }

  recomendaciones() {
    return [
      'Compactar el cartón de las cajas de proveedores y venderlo a un centro de acopio.',
      'Reutilizar las cajas en buen estado para enviar pedidos.',
      'Pedir a los proveedores de suela entregas a granel con menos empaque.',
    ];
  }
}

/**
 * Envases de pegamento, estopas con solvente, tintas: residuos de manejo
 * especial. No pueden ir al relleno sanitario y se exige evidencia.
 */
class ManejoEspecialStrategy extends DestinoResiduoStrategy {
  get clasificacion() { return 'peligroso'; }

  destinosAprovechamiento() {
    return ['coprocesamiento'];
  }

  destinoDisposicion() {
    return 'manejo_especial';
  }

  exigeEvidencia() {
    return true;
  }

  recomendaciones() {
    return [
      'Guardar envases y estopas con solvente en un contenedor cerrado y rotulado, lejos de fuentes de calor.',
      'Entregarlos solo a un gestor autorizado y conservar el folio del manifiesto de entrega.',
      'Evaluar pegamentos base agua para reducir la cantidad de solvente que se compra.',
    ];
  }
}

/** Basura general sin valor de recuperación. */
class NoAprovechableStrategy extends DestinoResiduoStrategy {
  get clasificacion() { return 'no_aprovechable'; }

  destinosAprovechamiento() {
    return [];
  }

  recomendaciones() {
    return [
      'Identificar qué parte de este residuo podría separarse en otra categoría aprovechable.',
      'Reducir desde la compra: menos productos de un solo uso en el área de trabajo.',
    ];
  }
}

module.exports = { ReutilizableStrategy, ReciclableStrategy, ManejoEspecialStrategy, NoAprovechableStrategy };
