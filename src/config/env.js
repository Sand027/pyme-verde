'use strict';

/**
 * Configuración centralizada a partir de variables de entorno.
 * Ninguna otra parte de la aplicación lee process.env directamente.
 */
require('dotenv').config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
if (isProd && SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET debe tener al menos 32 caracteres en producción.');
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/pyme_verde';

module.exports = Object.freeze({
  NODE_ENV,
  isProd,
  isTest,
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL,
  // Neon y la mayoría de proveedores externos exigen SSL; la base local no.
  DB_SSL: /sslmode=require/.test(DATABASE_URL) || process.env.DB_SSL === 'true',
  SESSION_SECRET: SESSION_SECRET || 'secreto-solo-para-desarrollo-local-no-usar-en-produccion',
  SESSION_MAX_AGE_MS: 1000 * 60 * 60 * 2, // 2 horas de inactividad
  // true: al arrancar con la base vacía carga el caso de demostración (útil en Render sin consola).
  AUTO_SEED: process.env.AUTO_SEED === 'true',
  LOGIN_MAX_INTENTOS: 5,
  LOGIN_BLOQUEO_MIN: 15,
});
