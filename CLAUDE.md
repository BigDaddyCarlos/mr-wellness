# mr-wellness.com

Sitio estático de Mr. Wellness — Salud Integral. Se publica solo: lo que se
sube a `main` queda en línea en un par de minutos. **No hay ensayo**: revisa
antes de subir.

---

## Lo que NUNCA se escribe aquí

### Carlos no es nutriólogo

**Carlos Zamora es fisioterapeuta deportivo y especialista en entrenamiento
personal. No es nutriólogo titulado y no prescribe planes de alimentación.**

En México ese título está regulado y necesita cédula. Él no la tiene, y
atribuírsela lo expone legalmente. Su conocimiento de nutrición es real, pero
viene de otro lado: instrucción básica por ser entrenador, lectura, educación
continua, y comparar dietas y resultados con sus pacientes.

Esto ya pasó una vez. En septiembre de 2026 se publicó la página de Kálale
diciendo «platillos calculados por un nutriólogo» y `jobTitle: Nutriólogo`, y
él lo pidió corregir: *«soy muchísimas cosas, pero nutriólogo no, y no me
quiero meter en problemas legales»*.

**Cómo decirlo bien.** Para el recetario, decir **cómo** se calculó —platillo
por platillo, desde los ingredientes, con tablas públicas, y se puede
revisar— en vez de desde qué credencial. A un colega eso le sirve más: un
título ajeno no le ayuda a defender una recomendación, un método auditable sí.

**La palabra sí sirve para terceros:** «tu nutriólogo», «panel para
nutriólogos», «código de nutriólogo». Ahí habla de los profesionales titulados que
usan la herramienta, y es correcta.

Si hace falta una credencial nueva, **se le pregunta a Carlos qué puede
sostener**. No se deduce ni se asume.

### «Colega» tampoco

«Lo que me preguntan los colegas» dice que Carlos es uno de ellos: es el mismo
problema del título por otra puerta. Se dice **profesional**, o se nombra el
momento —«lo que preguntan antes de recomendarla»—.

Y para vender es mejor: no compite con ellos, les construye una herramienta.


### Texto sin género

La app y el sitio le hablan a cualquiera. Nada de «tú sola», «bienvenido»,
«¿estás segura?». Cuando haga falta, se reescribe la frase: «por tu cuenta»
en vez de «tú sola».

El sexo biológico sí entra en los cálculos de la app —gasto energético,
composición corporal— y ahí se queda, porque es fisiología. Lo que no lleva
género es **el texto que le habla a la persona**.

---

## Cómo está hecho

- HTML estático, sin compilar nada. Se edita el archivo y se sube.
- `assets/styles.css` es el sistema de diseño completo: colores, tipografía,
  tarjetas, planes, preguntas, pie. **Úsalo.** Antes de escribir CSS nuevo,
  busca si ya existe la clase.
- `assets/app.js` es el comportamiento compartido, sin dependencias.
- Páginas nuevas: copia la cabecera y el pie de una existente para no
  desalinear el menú, y **agrégala a `sitemap.xml`**.
- Algunos archivos tienen finales de línea de Windows (`index.html`,
  `sitemap.xml`) y otros de Unix. Respeta el que ya tenga cada uno, o el
  historial se llena de archivos «modificados» enteros.

## Páginas de Kálale

- `kalale.html` — la pública, dirigida a nutriólogos.
- `panel.html` — el tablero para seguir pacientes. Entra con la cuenta de la
  app. Trae recuadros de diagnóstico que **solo salen cuando algo falla**
  (correo, identificador, qué contestó la base, qué dice el pase). Se quedan:
  cuando alguien reporte «no me deja entrar», esa foto responde en un vistazo.
- `kalale-privacy.html`, `kalale-confirmado.html` — aviso de privacidad y la
  pantalla a la que llega la liga del correo.

**La biblioteca de Supabase se trae de `esm.sh`, nunca del `/+esm` de
jsDelivr.** Esa conversión automática trae rota la parte que guarda la sesión:
se entra bien y la siguiente consulta va sin credencial, así que la base
contesta cero renglones. Costó tres horas encontrarlo.

La llave que aparece en `panel.html` es la pública de Supabase, hecha para
andar a la vista. Lo que decide qué ve cada quien son las políticas de la base.
