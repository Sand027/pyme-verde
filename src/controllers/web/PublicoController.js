'use strict';

const WebController = require('./WebController');
const ResiduoService = require('../../services/ResiduoService');
const DestinoResiduoStrategy = require('../../patterns/estrategias/destinos/DestinoResiduoStrategy');
const fs = require('fs');
const path = require('path');
const { limitesDelMes, sumarMeses, hoyISO } = require('../../utils/periodo');

// Créditos de las fotografías de stock (licencias CC), leídos una vez al arrancar.
const CREDITOS = (() => {
  try {
    const archivo = path.join(__dirname, '../../../public/assets/img/credits.json');
    return JSON.parse(fs.readFileSync(archivo, 'utf8')).photos;
  } catch {
    return [];
  }
})();

/** Sección pública: presentación de la empresa e indicadores públicos. */
class PublicoController extends WebController {
  #catalogo;
  #indicadores;
  #registros;

  constructor(catalogoService, indicadorService, registroService) {
    super();
    this.#catalogo = catalogoService;
    this.#indicadores = indicadorService;
    this.#registros = registroService;
  }

  static CLAVES_CON_SERIE = ['TASA_APROVECHAMIENTO', 'RESIDUO_POR_PAR', 'ENERGIA_POR_PAR', 'AVANCE_PLAN', 'CAPACITACION_COLABORADOR'];

  /** El último mes cerrado: los visitantes ven meses completos, no el mes en curso. */
  static ultimoMesCerrado() {
    const anterior = sumarMeses(`${hoyISO().slice(0, 7)}-01`, -1);
    return limitesDelMes(anterior);
  }

  async inicio(req, res) {
    const pyme = await this.#catalogo.pymePublica();
    if (!pyme) return res.render('publico/sin-datos', { titulo: 'PyME Verde' });

    const mes = PublicoController.ultimoMesCerrado();
    const [{ periodo, indicadores }, recientes] = await Promise.all([
      this.#indicadores.publicos(pyme.id, mes),
      this.#registros.residuosRecientesPublicos(pyme.id, 12),
    ]);
    // Serie de seis meses de cada indicador público (la tarjeta ancha y las cuatro pequeñas).
    const conSerie = indicadores.filter((i) => PublicoController.CLAVES_CON_SERIE.includes(i.clave));
    const listas = await Promise.all(conSerie.map((i) => this.#indicadores.seriePublica(pyme.id, i.id, { meses: 6, hasta: mes.hasta })));
    const series = Object.fromEntries(conSerie.map((i, n) => [i.clave, listas[n]]));
    const serie = series.TASA_APROVECHAMIENTO || null;
    const hayDemostracion = recientes.some((r) => r.origenDato === 'demostracion');

    return res.render('publico/inicio', {
      titulo: `PyME Verde: indicadores de sustentabilidad de ${pyme.nombre}`,
      pyme: pyme.toJSON(),
      periodo,
      indicadores,
      serie,
      series,
      recientes,
      hayDemostracion,
      guia: ResiduoService.guia(),
      etiquetasDestino: DestinoResiduoStrategy.ETIQUETAS,
    });
  }

  creditos(req, res) {
    return res.render('publico/creditos', { titulo: 'Créditos de las fotografías', fotos: CREDITOS });
  }

  privacidad(req, res) {
    return res.render('publico/privacidad', { titulo: 'Aviso de privacidad' });
  }
}

module.exports = PublicoController;
