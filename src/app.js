'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');
const env = require('./config/env');
const { nonce, cabeceras, forzarHttps } = require('./middleware/seguridad');
const { crearSesion, flash } = require('./middleware/sesion');
const { verificarToken } = require('./middleware/csrf');
const { cargarUsuario } = require('./middleware/auth');
const { noEncontrado, manejarErrores } = require('./middleware/errores');
const vistas = require('./utils/vistas');

/**
 * Crea la aplicación Express. Capas:
 *   rutas -> controladores (web/API) -> servicios (negocio) -> repositorios -> PostgreSQL
 * Las vistas EJS solo reciben datos ya preparados por los controladores.
 */
function crearApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(forzarHttps);
  app.use(nonce);
  app.use(cabeceras);
  app.use(compression());
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: env.isProd ? '7d' : 0,
    index: false,
  }));

  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(express.json({ limit: '50kb' }));
  app.use(crearSesion());
  app.use(flash);
  app.use(cargarUsuario);
  app.use(vistas.locales);
  app.use(verificarToken);

  app.get('/salud', require('./controllers/web/SaludController').verificar);
  app.use('/api', require('./routes/api'));
  app.use('/', require('./routes/web'));

  app.use(noEncontrado);
  app.use(manejarErrores);
  return app;
}

module.exports = { crearApp };
