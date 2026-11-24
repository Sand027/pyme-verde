# PyME Verde

Aplicación web para que una pequeña empresa registre sus consumos, residuos, producción y actividades sociales, calcule indicadores contra metas y dé seguimiento a un plan de mejora con responsables, fechas y evidencias.

Proyecto final de Programación Web y Desarrollo Sustentable, Ingeniería en Sistemas Computacionales, TecNM campus León, AGO-DIC 2026. Equipo: Oscar y Gonzalo Josue.

**Sitio publicado:** https://pyme-verde.onrender.com

El caso de estudio es **Contrafuerte**, un taller de calzado de piel en León, Guanajuato. **Todos los datos que trae la aplicación son de demostración**; no son mediciones reales del taller.

## Qué incluye

- Sección pública con la empresa, la problemática, los indicadores públicos y la documentación de la API.
- Panel con tablero de siete indicadores, registros, residuos y economía circular, calculadora de ahorro, plan de acciones y reportes.
- Administración de usuarios, empresa, categorías, parámetros, metas y bitácora.
- Roles visitante, colaborador y administrador, verificados en el servidor.
- API REST con seis servicios y especificación OpenAPI 3 en `/api/docs`.
- Consumo del servicio web público Open-Meteo (radiación solar de León), con NASA POWER como respaldo, en la calculadora, expuesto en `/api/publico/clima`.

## Tecnologías

Node.js 22, Express 4, EJS, PostgreSQL 14+ (`pg`), express-session con almacén en PostgreSQL, helmet, bcryptjs. Pruebas con `node:test` y supertest. Despliegue en Render con la base de datos en Neon.

## Instalación local

Requisitos: Node.js 20 o superior y Git. PostgreSQL es opcional, porque `npm run db:local` levanta uno embebido.

```bash
git clone <url del repositorio>
cd pyme-verde
npm install
cp .env.example .env
```

En `.env`, escribe contraseñas para las cuentas de prueba en `SEED_ADMIN_PASSWORD` y `SEED_COLABORADOR_PASSWORD` (al menos 10 caracteres, con letras y números). Si las dejas vacías, la semilla genera unas aleatorias y las muestra una sola vez en la consola.

En una terminal aparte, inicia la base local (puerto 5433):

```bash
npm run db:local
```

Crea las tablas, carga el caso de demostración e inicia el servidor:

```bash
npm run db:seed
npm run dev
```

Abre `http://localhost:3000`.

| Script | Qué hace |
|---|---|
| `npm start` | Inicia el servidor. |
| `npm run dev` | Inicia el servidor y lo reinicia al guardar cambios. |
| `npm run db:local` | Levanta PostgreSQL embebido en el puerto 5433. |
| `npm run db:migrate` | Aplica `src/db/schema.sql`. |
| `npm run db:seed` | Carga el caso de demostración si la base está vacía. |
| `npm run db:reset` | Borra los datos y vuelve a cargar el caso de demostración. |
| `npm run db:export` | Exporta estructura y datos a `base-de-datos/pyme_verde.sql`. |
| `npm run entrega` | Arma la carpeta de entrega y su ZIP en `entrega-privada/` (incluye credenciales; no se versiona). |
| `npm test` | Corre las 54 pruebas automatizadas. |

## Pruebas

```bash
npm test
```

Las pruebas de la API usan una base separada: `TEST_DATABASE_URL`, o `pyme_verde_test` en el PostgreSQL local. Su nombre debe contener "test"; si no, las pruebas se niegan a correr para no borrar datos. La última ejecución está en `docs/evidencias/pruebas-npm-test.txt` (54 de 54 pasan).

## Publicación en Render y Neon

1. Sube el código a GitHub. `.env` y `entrega-privada/` están en `.gitignore`.
2. En [neon.tech](https://neon.tech) crea un proyecto y copia la cadena de conexión (termina en `?sslmode=require`).
3. En [render.com](https://render.com) elige **New → Blueprint** y selecciona el repositorio. Render lee `render.yaml`.
4. Captura las variables secretas: `DATABASE_URL` (la de Neon), `SEED_ADMIN_PASSWORD` y `SEED_COLABORADOR_PASSWORD`. Usa los mismos valores que en tu `.env` para que coincidan con el documento de credenciales. `SESSION_SECRET` la genera Render.
5. En el primer arranque la aplicación crea las tablas y, con `AUTO_SEED=true`, carga el caso de demostración. Nunca borra datos existentes.
6. Abre la dirección del servicio (la de este proyecto es https://pyme-verde.onrender.com) y prueba ambos roles.

El plan gratuito de Render suspende el servicio cuando nadie lo usa; la primera visita después tarda cerca de un minuto.

## Credenciales de prueba

Las cuentas son `admin.demo` (administrador) y `colaborador.demo` (colaborador). Sus contraseñas no están en el repositorio: se entregan a la docente en `entrega-privada/Credenciales_de_prueba.docx`, que se genera a partir de `.env` y no se versiona. Si en Render se usaron contraseñas distintas a las de `.env`, o la base ya tenía las cuentas creadas, hay que cambiarlas desde **Usuarios** con la cuenta de administrador antes de entregar.

## Documentación

| Archivo | Contenido |
|---|---|
| `docs/PyME-Verde_Documentacion-tecnica.pdf` | Documentación según la guía del proyecto: I Antecedentes, II Análisis del sistema, III Diseño del sitio, IV Desarrollo e implementación. |
| `docs/PyME-Verde_Rubrica-con-evidencias.pdf` | Cada criterio de la rúbrica con el nivel alcanzado y su evidencia en el código, el sitio y las pruebas. |
| `docs/Guion-del-video.txt` | Guion del video de funcionamiento. |
| `docs/PyME-Verde_Manual-de-usuario.pdf` | Uso por rol con capturas. |
| `docs/PyME-Verde_Reporte-tecnico.pdf` | Contribución a Desarrollo Sustentable, indicadores, resultados del caso de demostración y guion de la demostración. |
| `docs/diagramas/` | Arquitectura, despliegue, casos de uso, clases, patrones, secuencia, modelo entidad-relación, mapa de navegación, componentes y diagrama de flujo (SVG y PNG). |
| `docs/capturas/` | Capturas de pantalla usadas en el manual. |
| `docs/evidencias/` | Salida de las pruebas. |
| `/api/docs` | Documentación de la API en la aplicación. |

Los documentos se regeneran con:

```bash
node docs/diagramas/generar.js <ruta a puppeteer-core>
node docs/capturas/capturar.js <ruta a puppeteer-core>
node docs/generador/generar.js <ruta a docx>
```

`puppeteer-core` y `docx` no son dependencias de la aplicación; se instalan aparte solo para regenerar la documentación.

## Estructura

```
src/
  server.js, app.js, container.js
  config/        variables de entorno y conexión (Singleton)
  db/            esquema, migración y datos de demostración
  models/        clases del dominio
  patterns/      Strategy, Factory y Observer
  repositories/  acceso a datos (Repository)
  services/      reglas de negocio
  controllers/   controladores web y API
  middleware/    sesión, autorización, CSRF, seguridad y errores
  routes/        rutas web y API
  views/         plantillas EJS
public/          CSS, JavaScript del navegador e imágenes
tests/           pruebas automatizadas
docs/            documentación de la entrega
```

## Licencia

MIT. Las fotografías de la sección pública tienen su propia licencia, indicada en `/creditos`.
