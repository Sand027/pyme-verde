/* Comportamiento del armazón del panel: menú lateral en pantallas angostas y avisos que se retiran. */
const menu = document.getElementById('ap-menu');
const velo = document.querySelector('.ap-velo');
const abrir = document.querySelector('[data-menu-abrir]');

function cambiar(abierto) {
  if (!menu) return;
  menu.classList.toggle('is-open', abierto);
  if (velo) velo.hidden = !abierto;
  abrir?.setAttribute('aria-expanded', String(abierto));
  if (abierto) menu.querySelector('a, button')?.focus();
  else abrir?.focus();
}

abrir?.addEventListener('click', () => cambiar(true));
document.querySelectorAll('[data-menu-cerrar]').forEach((b) => b.addEventListener('click', () => cambiar(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.classList.contains('is-open')) cambiar(false); });

// Los avisos de éxito se retiran solos; los de error se quedan hasta que se atienden.
document.querySelectorAll('.ap-aviso--exito').forEach((a) => setTimeout(() => a.remove(), 6000));
