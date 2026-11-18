'use strict';

/**
 * Genera los documentos Word de la entrega.
 * Uso: node docs/generador/generar.js <ruta a node_modules/docx>
 *   docs/PyME-Verde_Documentacion-tecnica.docx
 *   docs/PyME-Verde_Manual-de-usuario.docx
 *   docs/PyME-Verde_Reporte-tecnico.docx
 *   entrega-privada/Credenciales_de_prueba.docx   (no se versiona)
 */
if (process.argv[2]) process.env.DOCX_PATH = process.argv[2];

const path = require('path');
const { RAIZ, DOCS, guardar, reiniciarFiguras } = require('./comun');

async function main() {
  const piezas = [
    [require('./tecnica'), path.join(DOCS, 'PyME-Verde_Documentacion-tecnica.docx')],
    [require('./manual'), path.join(DOCS, 'PyME-Verde_Manual-de-usuario.docx')],
    [require('./reporte'), path.join(DOCS, 'PyME-Verde_Reporte-tecnico.docx')],
    [require('./credenciales'), path.join(RAIZ, 'entrega-privada', 'Credenciales_de_prueba.docx')],
  ];
  for (const [crear, destino] of piezas) {
    reiniciarFiguras();
    await guardar(crear(), destino);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
