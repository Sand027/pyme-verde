'use strict';

const { p, h1, h2, h3, vinetas, numerada, tabla, espacio, nota, figura, portada, indice, documento } = require('./comun');

module.exports = function reporte() {
  return documento('Reporte técnico de sustentabilidad', [
    portada('Reporte técnico de sustentabilidad', 'Cómo la aplicación contribuye a los objetivos de Desarrollo Sustentable en un taller de calzado de León'),
    indice(),

    h1('1. Problemática'),
    p('León concentra buena parte de la industria del calzado del país, y gran parte de ella son talleres pequeños y familiares. En un taller como **Contrafuerte** (ocho personas, corte, pespunte, montado y acabado) la problemática sustentable aparece en tres frentes:'),
    vinetas([
      '**Ambiental.** El corte deja recortes de piel y de suela que se tiran junto con la basura común. Los envases de pegamento y las estopas con solvente se mezclan con esos residuos, aunque por su inflamabilidad pueden ser residuos peligrosos. La electricidad de las máquinas de pespunte y el agua de limpieza no se miden por par producido.',
      '**Económica.** La piel es el insumo más caro del taller. Cada kilogramo que se queda en el recorte es dinero que se pierde, y nadie sabe cuánto suma al mes. El recibo de luz sube sin que se sepa por qué.',
      '**Social.** El personal trabaja con solventes sin una capacitación regular sobre su manejo seguro ni sobre la separación de residuos.',
    ]),
    p('El problema de fondo es la falta de registros: sin datos no se puede saber cuánto material se pierde, cuánto cuesta, ni si una mejora funcionó. Es la situación que describe la sección 2 de las indicaciones: registros dispersos, falta de indicadores, ausencia de seguimiento y desconocimiento del costo del desperdicio.'),

    h1('2. Objetivo y enfoque', false),
    p('El objetivo que se planteó para el taller es **medir cada semana los residuos, la energía y el agua por par producido, aprovechar al menos el 40 % de los residuos y dar seguimiento a un plan de mejora con responsables y fechas**.'),
    p('La aplicación no promete mejorar el desempeño ambiental por sí misma. Lo que hace es cerrar el ciclo de mejora continua que hoy está roto en el taller:'),
    ...numerada([
      '**Medir.** Cada consumo, residuo, lote producido y hora de capacitación se registra con su fecha, cantidad, costo y el origen del dato (medidor, recibo, báscula, inventario o estimación).',
      '**Calcular.** Con esos registros se calculan siete indicadores por periodo, con su fórmula a la vista y comparados contra una meta.',
      '**Actuar.** Cada indicador lejos de su meta puede tener acciones con responsable, fechas y meta propia.',
      '**Verificar.** El avance de cada acción se documenta con evidencias y el efecto se ve en el indicador de los meses siguientes; el reporte compara periodos.',
    ]),

    h1('3. Indicadores', false),
    p('Las indicaciones piden al menos tres indicadores; se definieron siete, que cubren las tres dimensiones. Todos se calculan a partir de los registros, nunca se capturan a mano, y cada resultado trae la explicación con su numerador y denominador para que se pueda verificar.'),
    tabla(['Indicador', 'Dimensión', 'Fórmula', 'Meta', 'Por qué importa'], [
      ['Residuo aprovechado', 'Ambiental', 'Σ kg aprovechados ÷ Σ kg de residuo generado × 100', '≥ 40 %', 'Mide la economía circular: cuánto residuo se reutiliza, dona o recicla en vez de ir a disposición final.'],
      ['Residuo por par', 'Ambiental', 'Σ kg de residuo generado ÷ Σ pares producidos', '≤ 0.2 kg/par', 'Normaliza por producción: separa "producimos más" de "desperdiciamos más".'],
      ['Energía por par', 'Ambiental', 'Σ kWh ÷ Σ pares producidos', '≤ 1.2 kWh/par', 'Eficiencia energética del proceso.'],
      ['Consumo de agua', 'Ambiental', 'Σ m3 ÷ meses del periodo', '≤ 6 m3/mes', 'Uso del agua en limpieza y acabado.'],
      ['Costo del desperdicio', 'Económica', 'Σ (costo del residuo × fracción no aprovechada) ÷ meses', '≤ $15,000 MXN/mes', 'Traduce el desperdicio a pesos, que es el argumento que mueve decisiones en una PyME.'],
      ['Avance del plan', 'Social', 'Σ avance de las acciones iniciadas ÷ acciones iniciadas', '≥ 80 %', 'Mide si el taller cumple lo que se propuso.'],
      ['Capacitación por colaborador', 'Social', 'Σ horas-persona ÷ colaboradores ÷ meses', '≥ 1.5 h/persona/mes', 'Seguridad en el uso de solventes y separación correcta de residuos.'],
    ], [2, 1.4, 3.2, 1.6, 3.6], { tam: 16 }),
    espacio(),
    p('Cada indicador tiene un **sentido**: en unos conviene subir (aprovechamiento, avance, capacitación) y en otros bajar (residuo, energía, agua, costo). El estado se asigna así: **cumple** si alcanza la meta, **cerca** si está a menos del 10 % de ella, **lejos** en otro caso y **sin datos** si el periodo no tiene registros suficientes.'),
    nota('Las metas son una propuesta inicial para el caso de demostración. La administración del taller puede cambiarlas en Configuración cuando tenga sus primeros meses de datos reales.'),

    h1('4. Resultados del caso de demostración', false),
    nota('**Todo este capítulo usa datos de demostración.** Se crearon para probar que los cálculos, las gráficas y los reportes funcionan con un caso realista y coherente. No son mediciones del taller y no deben citarse como resultados reales.'),
    p('El caso simula seis meses, de mayo a octubre de 2026, en los que el taller pone en marcha su plan de acciones. La tabla compara el primer mes con el último, tal como lo calcula la aplicación.'),
    tabla(['Indicador', 'Mayo 2026', 'Octubre 2026', 'Meta', 'Estado en octubre'], [
      ['Residuo aprovechado', '11.1 % (19 de 171 kg)', '39.8 % (69.6 de 174.9 kg)', '≥ 40 %', 'Cerca'],
      ['Residuo por par', '0.239 kg/par (171 kg ÷ 714 pares)', '0.232 kg/par (174.9 kg ÷ 755 pares)', '≤ 0.2', 'Lejos'],
      ['Energía por par', '1.375 kWh/par (982 kWh ÷ 714)', '0.87 kWh/par (657 kWh ÷ 755)', '≤ 1.2', 'Cumple'],
      ['Consumo de agua', '6.5 m3', '7.4 m3', '≤ 6', 'Lejos'],
      ['Costo del desperdicio', '$24,948', '$14,196', '≤ $15,000', 'Cumple'],
      ['Avance del plan', 'Sin acciones iniciadas', '79 % (3 de 6 completadas)', '≥ 80 %', 'Cerca'],
      ['Capacitación', '0.5 h (4 h ÷ 8 personas)', '1.63 h (13 h ÷ 8 personas)', '≥ 1.5', 'Cumple'],
    ], [2.2, 2.6, 2.8, 1.2, 1.6], { tam: 17 }),
    espacio(),
    h2('4.1 Lectura de los resultados'),
    vinetas([
      '**Energía por par** bajó 37 % después de la acción "Cambiar motores de embrague por servomotores en las máquinas de pespunte", que quedó completada. Es el indicador con la mejora más clara.',
      '**Residuo aprovechado** pasó de 11.1 % a 39.8 % en seis meses (serie mensual: 11.1, 11.7, 13.0, 23.7, 30.8 y 39.8 %). El salto de agosto coincide con el convenio de entrega de recortes a un taller escolar de marroquinería y el de septiembre con la separación y venta del cartón.',
      '**Costo del desperdicio** bajó de $24,948 a $14,196 al mes porque una parte de la piel que antes se tiraba ahora se aprovecha.',
      '**Residuo por par** casi no cambió: aprovechar más no es lo mismo que generar menos. La acción que ataca el origen, "Optimizar el tendido de moldes sobre la piel", sigue en proceso (60 %).',
      '**Consumo de agua** empeoró. La acción "Reparar fugas y colocar llaves ahorradoras en el área de limpieza" sigue pendiente. La aplicación muestra este resultado en rojo; no oculta lo que no mejoró.',
    ]),
    p('La lectura importante para Desarrollo Sustentable es que cada cambio en un indicador se puede rastrear hasta una acción concreta, con responsable, fechas y evidencias. Eso es lo que hace verificable la mejora.'),
    figura('capturas/06-tablero-grafica.png', 'Serie de seis meses de un indicador con su meta (datos de demostración).', { maxAlto: 300 }),

    h1('5. Economía circular y residuos', false),
    p('El módulo de residuos aplica la jerarquía de manejo: primero evitar que se genere, después reutilizar, después reciclar y, solo al final, la disposición. Cada categoría de residuo tiene una **clasificación** y la aplicación decide qué destinos admite según esa clasificación (patrón Strategy, descrito en la documentación técnica).'),
    tabla(['Clasificación', 'Residuos del taller', 'Destinos permitidos para lo aprovechado', 'Lo no aprovechado', 'Evidencia'], [
      ['Reutilizable', 'Recorte de piel', 'Reutilización, donación, reciclaje', 'Relleno sanitario', 'Recomendada'],
      ['Reciclable', 'Recorte de suela y hule; cartón y papel', 'Reciclaje, reutilización', 'Relleno sanitario', 'Recomendada'],
      ['Manejo especial (peligroso)', 'Envases de pegamento y estopas con solvente', 'Coprocesamiento', 'Gestor autorizado', 'Obligatoria'],
      ['No aprovechable', 'Residuo general', 'Ninguno', 'Relleno sanitario', 'Recomendada'],
    ], [2, 2.6, 2.6, 1.8, 1.4], { tam: 17 }),
    espacio(),
    h2('5.1 Resumen de mayo a octubre de 2026 (demostración)'),
    tabla(['Residuo', 'Generado', 'Aprovechado', '%', 'Registros con evidencia'], [
      ['Recorte de piel', '498.4 kg', '124.9 kg', '25.1 %', '13 de 27'],
      ['Cartón y papel', '163.0 kg', '69.9 kg', '42.9 %', '0 de 27'],
      ['Residuo general', '142.7 kg', '0 kg', '0 %', '0 de 27'],
      ['Recorte de suela y hule', '113.3 kg', '18.8 kg', '16.6 %', '0 de 27'],
      ['Envases y estopas con solvente', '56.7 kg', '0 kg', '0 %', '11 de 11'],
      ['**Total**', '**974.1 kg**', '**213.6 kg**', '**21.9 %**', ''],
    ], [3.4, 1.6, 1.8, 1.2, 2.4], { tam: 17 }),
    espacio(),
    p('El resumen también señala dónde falta trabajo: el cartón se aprovecha pero ningún registro tiene comprobante del centro de acopio, y la suela casi no se aprovecha. La aplicación ofrece recomendaciones concretas para cada clase, por ejemplo separar los recortes de piel mayores a 10 × 10 cm para llaveros o refuerzos, acordar entregas mensuales con escuelas de diseño, o pedir a los proveedores de suela entregas a granel con menos empaque.'),
    figura('capturas/10-residuos.png', 'Módulo de residuos con el periodo de septiembre a noviembre de 2026 (datos de demostración).', { maxAlto: 300 }),

    h1('6. Residuos con solvente y marco normativo', false),
    p('Los envases de pegamento y las estopas impregnadas con solvente merecen un trato aparte. Por su inflamabilidad pueden ser **residuos peligrosos** según los criterios de la **NOM-052-SEMARNAT-2005**, que establece las características (corrosividad, reactividad, explosividad, toxicidad, inflamabilidad y biológico-infecciosas) y los listados para identificarlos. La **Ley General para la Prevención y Gestión Integral de los Residuos (LGPGIR)** obliga a quien los genera a manejarlos por separado y entregarlos a empresas autorizadas.'),
    p('En el caso de demostración el taller genera 56.7 kg en seis meses, unos 113 kg al año. Bajo la LGPGIR, un establecimiento que genera hasta 400 kg de residuos peligrosos al año se considera **microgenerador**, y aun así debe registrarse y entregar sus residuos a un gestor autorizado.'),
    p('Por eso la aplicación:'),
    vinetas([
      'no permite registrar estos residuos con destino a relleno sanitario (lo prueba R05: el servidor responde 422);',
      'exige la evidencia del destino (por ejemplo, el folio del manifiesto de entrega al gestor);',
      'incluye en el plan la acción "Contenedor rotulado y gestor autorizado para envases con solvente" y la capacitación mensual en uso seguro de solventes.',
    ]),
    nota('La aplicación ayuda a llevar el registro; no sustituye la clasificación oficial del residuo ni la asesoría de un especialista. El taller debe confirmar la clasificación de sus residuos y los trámites que le corresponden ante SEMARNAT y la autoridad estatal de Guanajuato.'),

    h1('7. Calculadora de ahorro', false),
    p('La calculadora responde a la pregunta "¿cuánto ganaría si reduzco este consumo?" con supuestos visibles. Cada resultado lista los parámetros que usó y de dónde salen, para que nadie confunda una estimación con una medición.'),
    tabla(['Parámetro', 'Valor', 'Fuente o criterio'], [
      ['Precio de la electricidad', '$4.10 MXN/kWh', 'Supuesto: precio medio de la tarifa de pequeña demanda en baja tensión, con IVA. Sustituir por el del recibo de CFE.'],
      ['Precio del agua', '$45 MXN/m3', 'Supuesto: precio medio de uso comercial. Sustituir por el del recibo.'],
      ['Precio de la piel', '$280 MXN/kg', 'Supuesto a partir de facturas del proveedor.'],
      ['Valor de la suela', '$40 MXN/kg', 'Supuesto.'],
      ['Costo del gestor de manejo especial', '$18 MXN/kg', 'Supuesto: tarifa cotizada a un gestor autorizado.'],
      ['Factor de emisión de la red eléctrica', '0.44 kg CO2e/kWh', 'Valor cercano al factor del Sistema Eléctrico Nacional publicado en años recientes; actualizar con el vigente.'],
    ], [3, 2, 5.4], { tam: 17 }),
    espacio(),
    h2('7.1 Ejemplos calculados por la aplicación'),
    tabla(['Escenario', 'Resultado'], [
      ['Electricidad: 980 kWh al mes, reducción de 30 %, inversión de $18,000', 'Ahorro de 294 kWh y $1,205.40 al mes ($14,464.80 al año); la inversión se recupera en 14.9 meses; se evitan 129.4 kg de CO2e al mes.'],
      ['Agua: 10 m3 al mes, reducción de 20 %, sin inversión', 'Ahorro de 2 m3 y $90 al mes ($1,080 al año).'],
    ], [4.4, 6]),
    espacio(),
    p('Los ejemplos muestran por qué conviene priorizar: el ahorro en electricidad justifica una inversión, mientras que el ahorro en agua es pequeño en pesos aunque importante como recurso.'),

    h1('8. Alineación con los Objetivos de Desarrollo Sostenible', false),
    p('La relación con la Agenda 2030 se establece por lo que el taller mide y hace, no por declaraciones.'),
    tabla(['Meta ODS', 'Contenido de la meta (paráfrasis)', 'Qué aporta la aplicación'], [
      ['12.5', 'Reducir considerablemente la generación de desechos mediante prevención, reducción, reciclado y reutilización.', 'Indicadores de residuo aprovechado y residuo por par; destinos de reutilización, donación y reciclaje con evidencia.'],
      ['12.4', 'Gestionar de forma ecológicamente racional los productos químicos y sus desechos.', 'Clasificación de los residuos con solvente, bloqueo del destino a relleno, evidencia obligatoria y acción de gestor autorizado.'],
      ['7.3', 'Mejorar la eficiencia energética.', 'Indicador de energía por par y calculadora con emisiones evitadas.'],
      ['6.4', 'Aumentar el uso eficiente de los recursos hídricos.', 'Indicador de consumo de agua y acción de reparación de fugas.'],
      ['8.4', 'Mejorar la eficiencia en el uso de recursos y desvincular el crecimiento económico de la degradación ambiental.', 'Indicadores por par producido: el taller puede producir más sin aumentar el residuo o la energía por par; costo del desperdicio en pesos.'],
      ['8.8', 'Promover entornos de trabajo seguros.', 'Indicador de capacitación por colaborador y acción de capacitación en uso seguro de solventes.'],
    ], [1, 4, 5.4], { tam: 17 }),
    espacio(),

    h1('9. Responsabilidad y transparencia', false),
    vinetas([
      '**Datos honestos.** Cada registro guarda su origen y la aplicación marca los datos de demostración en la página de inicio, en las tablas y en el reporte imprimible. Las indicaciones piden no presentar datos simulados como reales; esta es la forma de cumplirlo.',
      '**Cálculos verificables.** Cada indicador muestra su fórmula y la explicación con números ("69.6 kg aprovechados de 174.9 kg generados"). Las pruebas automatizadas comprueban los cálculos.',
      '**Lo que no mejora también se muestra.** Los indicadores lejos de su meta se ven en el tablero y en los reportes; no hay forma de ocultarlos.',
      '**Privacidad.** Se guardan solo los datos personales necesarios para operar y la información pública se limita a los indicadores que la administración decide publicar.',
    ]),

    h1('10. Limitaciones', false),
    vinetas([
      'Los resultados del capítulo 4 son de demostración. Para conocer el desempeño real del taller hay que capturar al menos tres meses de datos medidos.',
      'Los parámetros de costo y el factor de emisión son supuestos de referencia.',
      'El indicador de residuo por par depende de que se pesen todos los residuos; si se omite una categoría, el indicador mejora artificialmente.',
      'La aplicación registra evidencias como descripción y enlace; no guarda archivos ni valida que un manifiesto sea auténtico.',
      'Las emisiones calculadas son solo las de la electricidad ahorrada; no es un inventario de gases de efecto invernadero.',
    ]),

    h1('11. Guion de la demostración (12 minutos)', false),
    p('La sección 14 de las indicaciones pide una demostración de 10 a 15 minutos en la que se registren datos, se actualice un estado, se consulte un reporte y se muestre la autenticación. Este guion cubre esos puntos en orden.'),
    tabla(['Minuto', 'Quién', 'Qué se hace', 'Qué se muestra'], [
      ['0:00 a 1:30', 'Oscar', 'Abrir el sitio publicado con HTTPS. Recorrer la página de inicio.', 'Empresa, problemática, indicadores públicos y aviso de datos de demostración. Candado HTTPS.'],
      ['1:30 a 3:00', 'Gonzalo', 'Iniciar sesión con una contraseña equivocada y luego con la correcta como colaborador.', 'Mensaje de error, inicio de sesión, menú del colaborador.'],
      ['3:00 a 5:00', 'Gonzalo', 'Registrar un residuo de recorte de piel con su destino; intentar guardar con una fecha futura.', 'Validación por campo, alta correcta, tabla actualizada sin recargar.'],
      ['5:00 a 6:30', 'Gonzalo', 'Intentar registrar envases con solvente con destino a relleno sanitario. Abrir Residuos.', 'El destino no se ofrece; resumen por clase con evidencias.'],
      ['6:30 a 7:30', 'Gonzalo', 'Actualizar el avance de una acción propia y agregar una evidencia. Abrir /admin/usuarios.', 'Cambio de estado; página Acceso restringido para el colaborador.'],
      ['7:30 a 9:30', 'Oscar', 'Cerrar sesión e iniciar como administrador. Revisar el tablero y la gráfica de residuo aprovechado.', 'Indicadores contra meta y su fórmula; serie de seis meses.'],
      ['9:30 a 11:00', 'Oscar', 'Comparar mayo contra octubre en Reportes; abrir la versión imprimible y exportar CSV.', 'Variación por indicador, plan de acciones, CSV.'],
      ['11:00 a 12:00', 'Oscar', 'Abrir la bitácora y /api/docs.', 'Los eventos de la demostración registrados; documentación de la API.'],
    ], [1.5, 1.2, 4, 4], { tam: 17 }),
    espacio(),
    p('Antes de la demostración conviene abrir el sitio dos minutos antes para que el servidor gratuito despierte, y tener a la mano el documento privado de credenciales.'),

    h1('12. Referencias', false),
    vinetas([
      'Naciones Unidas (2015). Transformar nuestro mundo: la Agenda 2030 para el Desarrollo Sostenible. Resolución A/RES/70/1 de la Asamblea General.',
      'Ley General para la Prevención y Gestión Integral de los Residuos. Diario Oficial de la Federación, 8 de octubre de 2003, con sus reformas.',
      'NOM-052-SEMARNAT-2005, que establece las características, el procedimiento de identificación, clasificación y los listados de los residuos peligrosos. Diario Oficial de la Federación, 23 de junio de 2006.',
      'NOM-161-SEMARNAT-2011, que establece los criterios para clasificar a los residuos de manejo especial y determinar cuáles están sujetos a plan de manejo. Diario Oficial de la Federación, 1 de febrero de 2013.',
      'Comisión Reguladora de Energía y SEMARNAT. Aviso del factor de emisión del Sistema Eléctrico Nacional (publicación anual).',
    ]),
  ]);
};
