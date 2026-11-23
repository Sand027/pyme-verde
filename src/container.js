'use strict';

/**
 * Raíz de composición: crea una vez los repositorios y servicios y les inyecta
 * sus dependencias por constructor. Los controladores reciben servicios desde
 * aquí; ninguno instancia repositorios por su cuenta.
 */
const { eventBus } = require('./patterns/eventos/EventBus');
const BitacoraObserver = require('./patterns/eventos/BitacoraObserver');

const PymeRepository = require('./repositories/PymeRepository');
const UsuarioRepository = require('./repositories/UsuarioRepository');
const CategoriaRepository = require('./repositories/CategoriaRepository');
const RegistroRepository = require('./repositories/RegistroRepository');
const IndicadorRepository = require('./repositories/IndicadorRepository');
const AccionRepository = require('./repositories/AccionRepository');
const ParametroRepository = require('./repositories/ParametroRepository');
const BitacoraRepository = require('./repositories/BitacoraRepository');

const AuthService = require('./services/AuthService');
const UsuarioService = require('./services/UsuarioService');
const RegistroService = require('./services/RegistroService');
const IndicadorService = require('./services/IndicadorService');
const ResiduoService = require('./services/ResiduoService');
const AccionService = require('./services/AccionService');
const CalculadoraService = require('./services/CalculadoraService');
const ReporteService = require('./services/ReporteService');
const CatalogoService = require('./services/CatalogoService');
const ClimaService = require('./services/ClimaService');

const repos = {
  pymeRepository: new PymeRepository(),
  usuarioRepository: new UsuarioRepository(),
  categoriaRepository: new CategoriaRepository(),
  registroRepository: new RegistroRepository(),
  indicadorRepository: new IndicadorRepository(),
  accionRepository: new AccionRepository(),
  parametroRepository: new ParametroRepository(),
  bitacoraRepository: new BitacoraRepository(),
};

new BitacoraObserver(repos.bitacoraRepository).conectar(eventBus);

const deps = { ...repos, eventBus };
const indicadorService = new IndicadorService(deps);
const residuoService = new ResiduoService(deps);

module.exports = Object.freeze({
  eventBus,
  ...repos,
  authService: new AuthService(deps),
  usuarioService: new UsuarioService(deps),
  registroService: new RegistroService(deps),
  indicadorService,
  residuoService,
  accionService: new AccionService(deps),
  calculadoraService: new CalculadoraService(deps),
  reporteService: new ReporteService({ ...deps, indicadorService, residuoService }),
  catalogoService: new CatalogoService(deps),
  // Cliente del servicio web público Open-Meteo (no usa la base de datos).
  climaService: new ClimaService(),
});
