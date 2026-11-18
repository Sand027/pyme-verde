/* Configuración: la clasificación solo se pide cuando el concepto nuevo es un residuo. */
const form = document.querySelector('[data-form-categoria]');
if (form) {
  const tipo = form.elements.tipo;
  const clas = form.elements.clasificacion;
  const campo = clas.closest('.field');
  const ajustar = () => {
    const esResiduo = tipo.value === 'residuo';
    campo.hidden = !esResiduo;
    clas.required = esResiduo;
    if (!esResiduo) clas.value = '';
  };
  tipo.addEventListener('change', ajustar);
  ajustar();
}
