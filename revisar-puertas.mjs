/**
 * Revisar que ninguna página quede sin puerta.
 *
 * Se corre así, desde esta carpeta:
 *
 *     node revisar-puertas.mjs
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE
 *
 * Carlos lo encontró usando su propio sitio: *«no tengo forma de llegar al
 * panel, a menos que lo teclee directo»*. Tenía razón, y era peor de lo que
 * parecía: el sitio **le promete el panel al nutriólogo** —lo dice en la
 * descripción, lo dice en los planes, lo dice en el paso tres de «cómo
 * empieza»— y no le daba ninguna puerta. Cada nutriólogo dependía de que Carlos
 * le mandara la dirección a mano, y de que no la perdiera.
 *
 * Esconder el enlace tampoco protegía nada: la página tiene su propio inicio de
 * sesión. Lo único que hacía era estorbarle a quien sí tenía permiso.
 *
 * Es la misma familia de todo lo que salió hoy —el sitio con 338 productos
 * cuando ya eran 556, el `TODO-JUNTO.sql` parado en la 012, el README con «las
 * cuatro partes»—: cosas que fueron ciertas el día que se escribieron y
 * dejaron de serlo sin que nada avisara.
 *
 * ---------------------------------------------------------------------------
 * LAS QUE SÍ VIVEN SIN PUERTA, Y POR QUÉ
 *
 * No toda página huérfana es un error. Hay tres a las que **se llega desde
 * afuera**, y enlazarlas desde el menú sería el error contrario:
 *
 *   empieza.html            se llega desde la biografía de las redes y de los
 *                           videos. Es la página de campaña.
 *   kalale-confirmado.html  se llega desde el correo de confirmación de la
 *                           cuenta. Nadie la busca; le cae encima.
 *   guia-inicio.html        se comparte a mano, en consulta y por mensaje.
 *
 * Están escritas aquí a propósito: la lista obliga a decir en voz alta por qué
 * cada una se queda fuera, en vez de que el olvido y la decisión se vean igual.
 *
 * ---------------------------------------------------------------------------
 * LA SEGUNDA REVISIÓN: QUE EL ENLACE LLEVE A DONDE DICE
 *
 * Esta revisión pasaba, y Carlos seguía sin encontrar el panel. **Las dos cosas
 * eran ciertas al mismo tiempo**, y ahí estaba el hueco: preguntaba «¿alguien
 * enlaza esta página?» y la respuesta era sí —desde el pie y desde una pregunta
 * frecuente—, mientras que todo lo que se veía y decía «panel» llevaba a otro
 * lado. El botón grande «Quiero mi panel» iba a WhatsApp; el renglón «Mira el
 * panel» iba a la página de ventas.
 *
 * Para quien busca la puerta, un enlace escondido y ninguna puerta son lo
 * mismo. Y un enlace cuyas palabras prometen el panel y va a otra parte es peor
 * que no tenerlo: gasta el único clic que esa persona iba a dar.
 *
 * Así que ahora también se revisa al revés: **si el texto del enlace promete
 * entrar al panel, tiene que ir al panel.** «Ver cómo se ve» y «quiero mi
 * panel» no prometen entrar — piden ver o pedir— y por eso no cuentan.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

/** Páginas a las que se llega desde afuera, no desde el sitio. */
const CON_PUERTA_DE_AFUERA = {
  'empieza.html': 'desde la biografía de las redes y los videos',
  'kalale-confirmado.html': 'desde el correo de confirmación de la cuenta',
  'guia-inicio.html': 'se comparte a mano, en consulta y por mensaje',
};

const paginas = fs.readdirSync(aqui).filter((f) => f.endsWith('.html'));
const textos = new Map(
  paginas.map((f) => [f, fs.readFileSync(path.join(aqui, f), 'utf8')]),
);

const huerfanas = paginas.filter((f) => {
  for (const [otra, texto] of textos) {
    if (otra === f) continue;
    if (texto.includes(`href="${f}"`)) return false;
  }
  return true;
});

const sinExplicar = huerfanas.filter((f) => !(f in CON_PUERTA_DE_AFUERA));

console.log(`Revisadas ${paginas.length} páginas.\n`);

for (const [f, porque] of Object.entries(CON_PUERTA_DE_AFUERA)) {
  if (!paginas.includes(f)) {
    console.log(`  aviso: «${f}» está en la lista de excepciones y ya no existe.`);
  } else if (!huerfanas.includes(f)) {
    console.log(`  «${f}» ya se enlaza desde el sitio; se puede quitar de la lista.`);
  } else {
    console.log(`  ok  ${f} — sin puerta a propósito: ${porque}`);
  }
}

/**
 * Enlaces cuyas palabras prometen **entrar** al panel.
 *
 * Se buscan verbos de entrar, no de mirar: «ver cómo se ve» y «quiero mi panel»
 * son promesas distintas y legítimas, y llevan a la demostración y al contacto.
 */
const PROMETE_ENTRAR = /(entra|entrar|inicia|ingresa|acced|abre el panel|abrir el panel)/i;

const mentirosos = [];
for (const [pagina, texto] of textos) {
  for (const m of texto.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const destino = m[1];
    const palabras = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/panel/i.test(palabras) || !PROMETE_ENTRAR.test(palabras)) continue;
    if (destino === 'panel.html' || destino.endsWith('/panel')) continue;
    mentirosos.push({ pagina, palabras, destino });
  }
}

if (mentirosos.length > 0) {
  console.log('\nDICEN «ENTRAR AL PANEL» Y LLEVAN A OTRO LADO:');
  for (const x of mentirosos) {
    console.log(`  ${x.pagina} — «${x.palabras}» va a ${x.destino}`);
  }
  console.log(
    '\nUn enlace que promete el panel y va a otra parte gasta el único clic que\n' +
      'esa persona iba a dar. O cambia el destino, o cambia las palabras.',
  );
  process.exit(1);
}

if (sinExplicar.length === 0) {
  console.log('\nNinguna página quedó sin puerta, sin explicación, ni con el destino cambiado.');
  process.exit(0);
}

console.log('\nSIN PUERTA Y SIN EXPLICACIÓN:');
for (const f of sinExplicar) {
  console.log(`  ${f} — nadie la enlaza. O se enlaza, o se anota por qué no.`);
}
process.exit(1);
