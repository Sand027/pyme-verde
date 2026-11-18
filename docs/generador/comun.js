'use strict';

/**
 * Piezas comunes para generar los documentos Word de la entrega con la librería docx.
 * Uso: node docs/generador/generar.js <ruta a node_modules/docx>
 */
const fs = require('fs');
const path = require('path');

const D = require(process.env.DOCX_PATH || 'docx');

const RAIZ = path.join(__dirname, '..', '..');
const DOCS = path.join(RAIZ, 'docs');

const COLOR = { tinta: '1F2A24', verde: '2E5E3E', suave: '5B6660', linea: 'C9D3CC', cabecera: 'E6EEE8', nota: 'F3F6F4' };
const FUENTE = 'Calibri';
const MONO = 'Consolas';
const ANCHO = 9360; // carta con márgenes de 1 pulgada, en DXA
const ANCHO_PX = 624; // el mismo ancho en píxeles a 96 ppp

/** Texto con **negritas** y `código` en línea. */
function runs(texto, base = {}) {
  if (Array.isArray(texto)) return texto;
  return String(texto).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((t) => {
    if (t.startsWith('**')) return new D.TextRun({ ...base, text: t.slice(2, -2), bold: true });
    if (t.startsWith('`')) return new D.TextRun({ ...base, text: t.slice(1, -1), font: MONO, size: (base.size || 21) - 2 });
    return new D.TextRun({ ...base, text: t });
  });
}

const p = (texto, opciones = {}) => new D.Paragraph({ children: runs(texto, opciones.run), spacing: { after: 120, line: 276 }, ...opciones.parrafo });
const h1 = (texto, salto = true) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, pageBreakBefore: salto, spacing: salto ? undefined : { before: 360, after: 200 }, children: [new D.TextRun(texto)] });
const h2 = (texto) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun(texto)] });
const h3 = (texto) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_3, children: [new D.TextRun(texto)] });

let instanciaLista = 0;
const vinetas = (items) => items.map((t) => new D.Paragraph({ children: runs(t), numbering: { reference: 'vinetas', level: 0 }, spacing: { after: 60, line: 264 } }));
function numerada(items) {
  instanciaLista += 1;
  const instancia = instanciaLista;
  return items.map((t) => new D.Paragraph({ children: runs(t), numbering: { reference: 'numeros', level: 0, instance: instancia }, spacing: { after: 60, line: 264 } }));
}

/** Tabla con encabezado sombreado. anchos en proporción; se ajustan a ANCHO. */
function tabla(encabezados, filas, anchos, { tam = 18 } = {}) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const cols = anchos.map((a) => Math.floor((a / total) * ANCHO));
  cols[cols.length - 1] += ANCHO - cols.reduce((a, b) => a + b, 0);
  const borde = { style: D.BorderStyle.SINGLE, size: 4, color: COLOR.linea };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const celda = (contenido, i, cabecera) => new D.TableCell({
    width: { size: cols[i], type: D.WidthType.DXA },
    borders: bordes,
    shading: cabecera ? { type: D.ShadingType.CLEAR, color: 'auto', fill: COLOR.cabecera } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: String(contenido ?? '').split('\n').map((linea) => new D.Paragraph({ children: runs(linea, { size: tam, bold: cabecera || undefined }), spacing: { after: 0, line: 252 } })),
  });
  return new D.Table({
    width: { size: ANCHO, type: D.WidthType.DXA },
    columnWidths: cols,
    rows: [
      new D.TableRow({ tableHeader: true, cantSplit: true, children: encabezados.map((e, i) => celda(e, i, true)) }),
      ...filas.map((f) => new D.TableRow({ cantSplit: true, children: f.map((c, i) => celda(c, i, false)) })),
    ],
  });
}

/** Espacio después de una tabla. */
const espacio = () => new D.Paragraph({ children: [], spacing: { after: 120 } });

/** Bloque de código o de salida de consola. */
function codigo(texto) {
  const lineas = texto.replace(/\s+$/, '').split('\n');
  return lineas.map((l, i) => new D.Paragraph({
    children: [new D.TextRun({ text: l || ' ', font: MONO, size: 17 })],
    shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: COLOR.nota },
    spacing: { after: i === lineas.length - 1 ? 160 : 0, line: 240 },
    keepNext: i < lineas.length - 1,
    keepLines: true,
    indent: { left: 120, right: 120 },
  }));
}

/** Nota destacada con borde a la izquierda. */
const nota = (texto) => new D.Paragraph({
  children: runs(texto),
  border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: COLOR.verde, space: 8 } },
  shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: COLOR.nota },
  indent: { left: 180 },
  spacing: { before: 60, after: 160, line: 276 },
});

/** Ancho y alto de un PNG leyendo su encabezado IHDR. */
function medidas(archivo) {
  const b = fs.readFileSync(archivo);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), datos: b };
}

let numFigura = 0;
const reiniciarFiguras = () => { numFigura = 0; instanciaLista = 0; };

/** Imagen centrada con su pie "Figura N.". maxAlto en píxeles a 96 ppp. */
function figura(relativa, pie, { maxAncho = ANCHO_PX, maxAlto = 640 } = {}) {
  const archivo = path.join(DOCS, relativa);
  const { w, h, datos } = medidas(archivo);
  const escala = Math.min(maxAncho / w, maxAlto / h);
  numFigura += 1;
  return [
    new D.Paragraph({
      alignment: D.AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [new D.ImageRun({ type: 'png', data: datos, transformation: { width: Math.round(w * escala), height: Math.round(h * escala) }, altText: { title: pie, description: pie, name: path.basename(archivo) } })],
    }),
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 200 }, children: [new D.TextRun({ text: `Figura ${numFigura}. `, bold: true, size: 18, color: COLOR.suave }), new D.TextRun({ text: pie, size: 18, color: COLOR.suave })] }),
  ];
}

/** Dos capturas de teléfono lado a lado. */
function figuraPar(a, b, pie) {
  const img = (rel) => {
    const { w, h, datos } = medidas(path.join(DOCS, rel));
    const escala = 300 / h * 1.5;
    return new D.ImageRun({ type: 'png', data: datos, transformation: { width: Math.round(w * escala), height: Math.round(h * escala) }, altText: { title: pie, description: pie, name: path.basename(rel) } });
  };
  numFigura += 1;
  return [
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 }, children: [img(a), new D.TextRun('      '), img(b)] }),
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 200 }, children: [new D.TextRun({ text: `Figura ${numFigura}. `, bold: true, size: 18, color: COLOR.suave }), new D.TextRun({ text: pie, size: 18, color: COLOR.suave })] }),
  ];
}

/** Portada con los datos de la entrega; los campos en blanco los llena el equipo. */
function portada(titulo, subtitulo) {
  const linea = (etiqueta, valor) => new D.Paragraph({
    spacing: { after: 140 },
    indent: etiqueta ? undefined : { left: 1250 },
    children: [...(etiqueta ? [new D.TextRun({ text: `${etiqueta}: `, bold: true, size: 22 })] : []), new D.TextRun({ text: valor, size: 22 })],
  });
  return [
    new D.Paragraph({ spacing: { before: 600, after: 60 }, children: [new D.TextRun({ text: 'Tecnológico Nacional de México, campus León', size: 24, color: COLOR.suave })] }),
    new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: 'Ingeniería en Sistemas Computacionales', size: 22, color: COLOR.suave })] }),
    new D.Paragraph({ spacing: { after: 900 }, children: [new D.TextRun({ text: 'Programación Web · Desarrollo Sustentable · AGO-DIC 2026', size: 22, color: COLOR.suave })] }),
    new D.Paragraph({ spacing: { after: 120 }, children: [new D.TextRun({ text: 'PyME Verde', size: 64, bold: true, color: COLOR.verde })] }),
    new D.Paragraph({ spacing: { after: 120 }, children: [new D.TextRun({ text: titulo, size: 40, bold: true, color: COLOR.tinta })] }),
    new D.Paragraph({
      spacing: { after: 900 },
      border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: COLOR.verde, space: 12 } },
      children: [new D.TextRun({ text: subtitulo, size: 24, color: COLOR.suave })],
    }),
    linea('Caso de estudio', 'Contrafuerte, taller de calzado de piel en León, Guanajuato (datos de demostración)'),
    linea('Integrantes', 'Oscar ______________________   No. de control ____________'),
    linea('', 'Gonzalo Josue ______________________   No. de control ____________'),
    linea('Grupo', '__________'),
    linea('Docente', 'Angélica María Ortiz Gaucín'),
    linea('Sitio publicado', 'https://pyme-verde.onrender.com'),
    linea('Código fuente', 'https://github.com/Sand027/pyme-verde'),
    linea('Fecha de entrega', '____ de diciembre de 2026'),
  ];
}

/** Índice automático; Word lo llena al abrir o al actualizar campos. */
const indice = () => [
  new D.Paragraph({ pageBreakBefore: true, spacing: { after: 200 }, children: [new D.TextRun({ text: 'Contenido', bold: true, size: 32, color: COLOR.verde })] }),
  new D.TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
];

/** Documento completo con estilos, numeración, encabezado y pie con número de página. */
function documento(nombreCorto, hijos) {
  return new D.Document({
    creator: 'Oscar y Gonzalo Josue',
    title: `PyME Verde: ${nombreCorto}`,
    description: 'Proyecto final de Programación Web y Desarrollo Sustentable, TecNM campus León.',
    styles: {
      default: { document: { run: { font: FUENTE, size: 21, color: COLOR.tinta } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FUENTE, size: 32, bold: true, color: COLOR.verde }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FUENTE, size: 26, bold: true, color: COLOR.tinta }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FUENTE, size: 22, bold: true, color: COLOR.verde }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'vinetas', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
        { reference: 'numeros', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 } }, titlePage: true },
      headers: {
        default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: `PyME Verde · ${nombreCorto}`, size: 16, color: COLOR.suave })] })] }),
        first: new D.Header({ children: [new D.Paragraph({ children: [] })] }),
      },
      footers: {
        default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ children: ['Página ', D.PageNumber.CURRENT, ' de ', D.PageNumber.TOTAL_PAGES], size: 16, color: COLOR.suave })] })] }),
        first: new D.Footer({ children: [new D.Paragraph({ children: [] })] }),
      },
      children: hijos.flat(Infinity),
    }],
  });
}

async function guardar(doc, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, await D.Packer.toBuffer(doc));
  console.log(path.relative(RAIZ, destino));
}

module.exports = { D, RAIZ, DOCS, COLOR, p, h1, h2, h3, vinetas, numerada, tabla, espacio, codigo, nota, figura, figuraPar, portada, indice, documento, guardar, reiniciarFiguras };
