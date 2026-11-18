-- PyME Verde: esquema relacional (PostgreSQL 14+)
-- Nueve tablas de dominio relacionadas y la tabla de sesiones.
-- Las restricciones CHECK, UNIQUE y FOREIGN KEY garantizan la integridad
-- aunque un cliente omita la validación de la aplicación.

CREATE TABLE IF NOT EXISTS pyme (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(120) NOT NULL,
  giro              VARCHAR(120) NOT NULL,
  ubicacion_general VARCHAR(160) NOT NULL,
  descripcion       TEXT NOT NULL DEFAULT '',
  problematica      TEXT NOT NULL DEFAULT '',
  objetivo          TEXT NOT NULL DEFAULT '',
  num_colaboradores INTEGER NOT NULL DEFAULT 1 CHECK (num_colaboradores > 0),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario (
  id                SERIAL PRIMARY KEY,
  pyme_id           INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  nombre            VARCHAR(120) NOT NULL,
  username          VARCHAR(40)  NOT NULL UNIQUE,
  correo            VARCHAR(160) NOT NULL UNIQUE,
  password_hash     VARCHAR(100) NOT NULL,
  rol               VARCHAR(20)  NOT NULL CHECK (rol IN ('administrador', 'colaborador')),
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta   TIMESTAMPTZ,
  ultimo_acceso     TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categoria (
  id            SERIAL PRIMARY KEY,
  pyme_id       INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  nombre        VARCHAR(80) NOT NULL,
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('consumo', 'materia', 'residuo', 'produccion', 'social')),
  unidad        VARCHAR(20) NOT NULL,
  clasificacion VARCHAR(20) CHECK (clasificacion IN ('reutilizable', 'reciclable', 'peligroso', 'no_aprovechable')),
  descripcion   TEXT NOT NULL DEFAULT '',
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (pyme_id, nombre),
  -- Solo los residuos se clasifican, y todo residuo debe estar clasificado.
  CONSTRAINT categoria_clasificacion_residuo CHECK ((tipo = 'residuo') = (clasificacion IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS registro (
  id                   SERIAL PRIMARY KEY,
  pyme_id              INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  categoria_id         INTEGER NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
  usuario_id           INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  fecha                DATE NOT NULL,
  cantidad             NUMERIC(12, 3) NOT NULL CHECK (cantidad >= 0),
  unidad               VARCHAR(20) NOT NULL,
  costo                NUMERIC(12, 2) CHECK (costo IS NULL OR costo >= 0),
  origen_dato          VARCHAR(20) NOT NULL
                       CHECK (origen_dato IN ('medidor', 'recibo', 'bascula', 'inventario', 'estimacion', 'demostracion')),
  cantidad_aprovechada NUMERIC(12, 3)
                       CHECK (cantidad_aprovechada IS NULL OR (cantidad_aprovechada >= 0 AND cantidad_aprovechada <= cantidad)),
  destino              VARCHAR(30)
                       CHECK (destino IN ('reutilizacion', 'reciclaje', 'donacion', 'coprocesamiento', 'manejo_especial', 'relleno_sanitario')),
  evidencia_destino    TEXT,
  notas                TEXT NOT NULL DEFAULT '',
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registro_pyme_fecha ON registro (pyme_id, fecha);
CREATE INDEX IF NOT EXISTS idx_registro_categoria ON registro (categoria_id);

CREATE TABLE IF NOT EXISTS indicador (
  id           SERIAL PRIMARY KEY,
  pyme_id      INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categoria(id) ON DELETE SET NULL,
  clave        VARCHAR(40) NOT NULL,
  nombre       VARCHAR(120) NOT NULL,
  dimension    VARCHAR(20) NOT NULL CHECK (dimension IN ('ambiental', 'social', 'economica')),
  formula      TEXT NOT NULL,
  unidad       VARCHAR(30) NOT NULL,
  meta         NUMERIC(12, 3) NOT NULL CHECK (meta >= 0),
  sentido      VARCHAR(10) NOT NULL CHECK (sentido IN ('menor', 'mayor')),
  publico      BOOLEAN NOT NULL DEFAULT FALSE,
  descripcion  TEXT NOT NULL DEFAULT '',
  UNIQUE (pyme_id, clave)
);

CREATE TABLE IF NOT EXISTS accion (
  id             SERIAL PRIMARY KEY,
  pyme_id        INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  indicador_id   INTEGER REFERENCES indicador(id) ON DELETE SET NULL,
  responsable_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  creado_por     INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  titulo         VARCHAR(140) NOT NULL,
  descripcion    TEXT NOT NULL DEFAULT '',
  meta           VARCHAR(200) NOT NULL,
  fecha_inicio   DATE NOT NULL,
  fecha_objetivo DATE NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada')),
  avance         SMALLINT NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT accion_fechas CHECK (fecha_objetivo >= fecha_inicio),
  CONSTRAINT accion_completada CHECK (estado <> 'completada' OR avance = 100)
);
CREATE INDEX IF NOT EXISTS idx_accion_pyme_estado ON accion (pyme_id, estado);

CREATE TABLE IF NOT EXISTS evidencia (
  id          SERIAL PRIMARY KEY,
  accion_id   INTEGER NOT NULL REFERENCES accion(id) ON DELETE CASCADE,
  usuario_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  fecha       DATE NOT NULL,
  descripcion TEXT NOT NULL,
  enlace      VARCHAR(300),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parametro (
  id      SERIAL PRIMARY KEY,
  pyme_id INTEGER NOT NULL REFERENCES pyme(id) ON DELETE CASCADE,
  clave   VARCHAR(40) NOT NULL,
  nombre  VARCHAR(120) NOT NULL,
  valor   NUMERIC(14, 4) NOT NULL CHECK (valor >= 0),
  unidad  VARCHAR(30) NOT NULL,
  fuente  TEXT NOT NULL DEFAULT '',
  UNIQUE (pyme_id, clave)
);

CREATE TABLE IF NOT EXISTS bitacora (
  id         BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  evento     VARCHAR(60) NOT NULL,
  entidad    VARCHAR(40),
  entidad_id INTEGER,
  detalle    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip         VARCHAR(64),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora (creado_en DESC);

-- Sesiones del servidor (connect-pg-simple).
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
