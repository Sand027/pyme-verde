'use strict';

const IndicadorStrategy = require('./IndicadorStrategy');

const { redondear, sumar, filtrar, dividir } = IndicadorStrategy;
const fmt = (n, d = 2) => (n === null ? 'sin dato' : Number(n).toLocaleString('es-MX', { maximumFractionDigits: d }));

/** % de residuo aprovechado = Σ aprovechado / Σ generado × 100 */
class TasaAprovechamientoStrategy extends IndicadorStrategy {
  calcular({ registros, indicador }) {
    const residuos = filtrar(registros, { tipo: 'residuo', categoriaId: indicador.categoriaId });
    const generado = sumar(residuos);
    const aprovechado = sumar(residuos, 'cantidadAprovechada');
    const valor = dividir(aprovechado, generado);
    return {
      valor: redondear(valor === null ? null : valor * 100, 1),
      numerador: redondear(aprovechado, 3),
      denominador: redondear(generado, 3),
      explicacion: `${fmt(aprovechado)} kg aprovechados de ${fmt(generado)} kg generados.`,
    };
  }
}

/**
 * Intensidad por unidad producida = Σ cantidad de la categoría (o de todos los
 * residuos) / Σ pares producidos. Sirve para residuo por par y energía por par.
 */
class IntensidadPorParStrategy extends IndicadorStrategy {
  calcular({ registros, indicador }) {
    const base = indicador.categoriaId
      ? filtrar(registros, { categoriaId: indicador.categoriaId })
      : filtrar(registros, { tipo: 'residuo' });
    const numerador = sumar(base);
    const pares = sumar(filtrar(registros, { tipo: 'produccion' }));
    const unidadBase = base[0]?.unidad ?? indicador.unidad.split('/')[0];
    return {
      valor: redondear(dividir(numerador, pares), 3),
      numerador: redondear(numerador, 3),
      denominador: pares,
      explicacion: `${fmt(numerador)} ${unidadBase} entre ${fmt(pares, 0)} pares producidos.`,
    };
  }
}

/** Promedio mensual = Σ cantidad de la categoría / número de meses del periodo */
class PromedioMensualStrategy extends IndicadorStrategy {
  calcular({ registros, indicador, periodo }) {
    const base = filtrar(registros, { categoriaId: indicador.categoriaId });
    const total = sumar(base);
    const meses = periodo.meses.length;
    return {
      valor: base.length ? redondear(dividir(total, meses), 2) : null,
      numerador: redondear(total, 3),
      denominador: meses,
      explicacion: `${fmt(total)} ${base[0]?.unidad ?? ''} en ${meses} ${meses === 1 ? 'mes' : 'meses'}.`,
    };
  }
}

/**
 * Costo del desperdicio por mes = Σ (costo del registro × fracción no
 * aprovechada) / meses. El costo de un residuo es el valor del material perdido
 * o lo que se paga por su disposición.
 */
class CostoDesperdicioStrategy extends IndicadorStrategy {
  calcular({ registros, periodo }) {
    const residuos = filtrar(registros, { tipo: 'residuo' }).filter((r) => r.costo !== null);
    const total = residuos.reduce((suma, r) => {
      const fraccion = r.cantidad > 0 ? r.cantidadNoAprovechada() / r.cantidad : 0;
      return suma + r.costo * fraccion;
    }, 0);
    const meses = periodo.meses.length;
    return {
      valor: residuos.length ? redondear(dividir(total, meses), 0) : null,
      numerador: redondear(total, 2),
      denominador: meses,
      explicacion: `$${fmt(total, 0)} MXN de material no aprovechado o pagado por disposición en ${meses} ${meses === 1 ? 'mes' : 'meses'}.`,
    };
  }
}

/** Avance del plan = promedio del avance (%) de las acciones iniciadas antes del cierre del periodo */
class AvancePlanStrategy extends IndicadorStrategy {
  calcular({ acciones, periodo }) {
    const vigentes = acciones.filter((a) => a.fechaInicio <= periodo.hasta);
    const suma = vigentes.reduce((t, a) => t + a.avance, 0);
    const completadas = vigentes.filter((a) => a.estado === 'completada').length;
    return {
      valor: redondear(dividir(suma, vigentes.length), 0),
      numerador: suma,
      denominador: vigentes.length,
      explicacion: `${completadas} de ${vigentes.length} acciones iniciadas están completadas (avance actual registrado en el plan).`,
    };
  }
}

/** Horas de capacitación por colaborador al mes = Σ horas / colaboradores / meses */
class CapacitacionPorColaboradorStrategy extends IndicadorStrategy {
  calcular({ registros, indicador, pyme, periodo }) {
    const base = indicador.categoriaId
      ? filtrar(registros, { categoriaId: indicador.categoriaId })
      : filtrar(registros, { tipo: 'social' });
    const horas = sumar(base);
    const personas = pyme.numColaboradores;
    const meses = periodo.meses.length;
    return {
      valor: redondear(dividir(horas, personas * meses), 2),
      numerador: redondear(horas, 2),
      denominador: personas * meses,
      explicacion: `${fmt(horas)} h entre ${personas} colaboradores y ${meses} ${meses === 1 ? 'mes' : 'meses'}.`,
    };
  }
}

module.exports = {
  TasaAprovechamientoStrategy,
  IntensidadPorParStrategy,
  PromedioMensualStrategy,
  CostoDesperdicioStrategy,
  AvancePlanStrategy,
  CapacitacionPorColaboradorStrategy,
};
