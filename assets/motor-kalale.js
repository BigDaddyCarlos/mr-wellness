// GENERADO: no se edita a mano.
// Sale de eatwell/src/motor/para-el-panel.ts con «node armar-motor-del-panel.mjs».
// Es el mismo motor de la app, para que el nutriólogo vea la misma tendencia
// que su paciente. huella: 8e8d02aaa434
// src/motor/tendencia.ts
var ALFA = 0.15;
var BETA = 0.05;
var UMBRAL_SIGMA = 3;
var SIGMA_MINIMA = 0.4;
var MINIMO_PARA_DESCARTAR = 7;
var DIAS_ARRANQUE = 14;
var MINIMO_PARA_ARRANQUE = 4;
var MAXIMO_DESCARTES_SEGUIDOS = 2;
var AMORTIGUACION = 0.85;
function desviacionRobusta(residuos) {
  if (residuos.length === 0) return SIGMA_MINIMA;
  const mediana = medianaDe(residuos);
  const desviaciones = residuos.map((r) => Math.abs(r - mediana));
  const mad = medianaDe(desviaciones);
  return Math.max(SIGMA_MINIMA, mad * 1.4826);
}
function medianaDe(valores) {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 === 0 ? (orden[mitad - 1] + orden[mitad]) / 2 : orden[mitad];
}
function diasProyectados(dias, phi = AMORTIGUACION) {
  if (dias <= 0) return 0;
  return phi === 1 ? dias : (1 - phi ** dias) / (1 - phi);
}
function ajustarRecta(muestras) {
  const n = muestras.length;
  const mediaX = muestras.reduce((s, m) => s + m.x, 0) / n;
  const mediaY = muestras.reduce((s, m) => s + m.y, 0) / n;
  let numerador = 0;
  let denominador = 0;
  for (const m of muestras) {
    numerador += (m.x - mediaX) * (m.y - mediaY);
    denominador += (m.x - mediaX) ** 2;
  }
  const pendiente = denominador === 0 ? 0 : numerador / denominador;
  const ordenada = mediaY - pendiente * mediaX;
  const residuos = muestras.map((m) => m.y - (ordenada + pendiente * m.x));
  return { ordenada, pendiente, residuos };
}
function calcularTendencia(dias, alfa = ALFA, beta = BETA) {
  const puntos = [];
  let nivel = null;
  let pendiente = 0;
  let diasDesdeUltimaPesada = 0;
  const residuos = [];
  let descartesSeguidos = 0;
  const primeraPesada = dias.findIndex((d) => d.pesoKg != null);
  let desde = 0;
  if (primeraPesada !== -1) {
    const finArranque = primeraPesada + DIAS_ARRANQUE - 1;
    const muestras = [];
    for (let i = primeraPesada; i <= Math.min(finArranque, dias.length - 1); i += 1) {
      if (dias[i].pesoKg != null) muestras.push({ x: i, y: dias[i].pesoKg });
    }
    if (muestras.length >= MINIMO_PARA_ARRANQUE) {
      const recta = ajustarRecta(muestras);
      const ultimoDiaArranque = Math.min(finArranque, dias.length - 1);
      for (let i = 0; i < primeraPesada; i += 1) {
        puntos.push({
          fecha: dias[i].fecha,
          pesoKg: null,
          tendenciaKg: null,
          pendienteKgDia: null,
          descartada: false
        });
      }
      for (let i = primeraPesada; i <= ultimoDiaArranque; i += 1) {
        puntos.push({
          fecha: dias[i].fecha,
          pesoKg: dias[i].pesoKg ?? null,
          tendenciaKg: recta.ordenada + recta.pendiente * i,
          pendienteKgDia: recta.pendiente,
          descartada: false
        });
      }
      nivel = recta.ordenada + recta.pendiente * ultimoDiaArranque;
      pendiente = recta.pendiente;
      diasDesdeUltimaPesada = 0;
      residuos.push(...recta.residuos);
      desde = ultimoDiaArranque + 1;
    }
  }
  for (const dia of dias.slice(desde)) {
    if (dia.pesoKg == null) {
      diasDesdeUltimaPesada += 1;
      puntos.push({
        fecha: dia.fecha,
        pesoKg: null,
        tendenciaKg: nivel == null ? null : nivel + pendiente * diasProyectados(diasDesdeUltimaPesada),
        pendienteKgDia: nivel == null ? null : pendiente,
        descartada: false
      });
      continue;
    }
    if (nivel == null) {
      nivel = dia.pesoKg;
      pendiente = 0;
      diasDesdeUltimaPesada = 0;
      puntos.push({
        fecha: dia.fecha,
        pesoKg: dia.pesoKg,
        tendenciaKg: nivel,
        pendienteKgDia: 0,
        descartada: false
      });
      continue;
    }
    const salto = diasDesdeUltimaPesada + 1;
    const pronostico = nivel + pendiente * diasProyectados(salto);
    const residuo = dia.pesoKg - pronostico;
    const puedeDescartar = residuos.length >= MINIMO_PARA_DESCARTAR;
    const sigma = desviacionRobusta(residuos);
    const pareceRara = puedeDescartar && Math.abs(residuo) > UMBRAL_SIGMA * sigma;
    const descartada = pareceRara && descartesSeguidos < MAXIMO_DESCARTES_SEGUIDOS;
    if (descartada) {
      descartesSeguidos += 1;
      diasDesdeUltimaPesada += 1;
      puntos.push({
        fecha: dia.fecha,
        pesoKg: dia.pesoKg,
        tendenciaKg: nivel + pendiente * diasProyectados(diasDesdeUltimaPesada),
        pendienteKgDia: pendiente,
        descartada: true
      });
      continue;
    }
    if (pareceRara) {
      nivel = dia.pesoKg;
      pendiente = 0;
      descartesSeguidos = 0;
      diasDesdeUltimaPesada = 0;
      residuos.length = 0;
      puntos.push({
        fecha: dia.fecha,
        pesoKg: dia.pesoKg,
        tendenciaKg: nivel,
        pendienteKgDia: 0,
        descartada: false
      });
      continue;
    }
    descartesSeguidos = 0;
    const nivelPrevio = nivel;
    nivel = pronostico + alfa * residuo;
    pendiente = beta * ((nivel - nivelPrevio) / salto) + (1 - beta) * pendiente;
    residuos.push(residuo);
    diasDesdeUltimaPesada = 0;
    puntos.push({
      fecha: dia.fecha,
      pesoKg: dia.pesoKg,
      tendenciaKg: nivel,
      pendienteKgDia: pendiente,
      descartada: false
    });
  }
  return puntos;
}

// src/motor/metas.ts
function leerProgreso(objetivo, cambioKgPorSemana) {
  const quieto = Math.abs(cambioKgPorSemana) < 0.15;
  const sube = cambioKgPorSemana > 0;
  switch (objetivo) {
    case "recomposicion":
      return quieto ? "Tu peso est\xE1 quieto, y eso es justo lo que buscas. Lo que cambia en una recomposici\xF3n no se ve en la b\xE1scula: para saber si est\xE1 funcionando hay que medir tu grasa corporal cada tres o cuatro semanas." : sube ? "Est\xE1s subiendo de peso. En una recomposici\xF3n eso puede ser m\xFAsculo, pero tambi\xE9n puede ser que est\xE9s comiendo de m\xE1s \u2014 la b\xE1scula sola no lo distingue." : "Est\xE1s bajando de peso. No es malo, pero no es lo que pediste: en una recomposici\xF3n el peso se queda y lo que cambia es de qu\xE9 est\xE1 hecho.";
    case "bajar_grasa":
      return quieto ? "Tu peso lleva varios d\xEDas sin moverse. Puede ser una meseta pasajera, o que est\xE9s comiendo un poco m\xE1s de lo que crees. Si sigue as\xED otra semana, revisamos el plan." : sube ? "Vas subiendo, y tu objetivo es bajar grasa. Antes de cambiar nada: \xBFte has pesado a la misma hora y en las mismas condiciones?" : "Vas bajando. Cu\xE1nto de eso fue grasa y cu\xE1nto m\xFAsculo no lo s\xE9 por la b\xE1scula \u2014 si te mides la grasa corporal cada tres o cuatro semanas, te lo puedo decir.";
    case "subir_musculo":
      return quieto ? "Tu peso est\xE1 quieto y tu objetivo es ganar. Para construir m\xFAsculo hace falta comer un poco por encima de tu gasto; si llevas dos semanas as\xED, probablemente falta comida." : sube ? "Vas subiendo, que es lo que buscas. Ganar despacio es lo que hace que sea m\xFAsculo y no grasa \u2014 por eso el ritmo est\xE1 topado." : "Est\xE1s bajando de peso y tu objetivo es ganar m\xFAsculo. Con el cuerpo en d\xE9ficit, construir es muy dif\xEDcil.";
    case "mantener":
      return quieto ? "Tu peso est\xE1 estable, que es exactamente lo que buscas." : `Te est\xE1s ${sube ? "moviendo hacia arriba" : "moviendo hacia abajo"} y tu objetivo es mantenerte. Si no fue a prop\xF3sito, un ajuste chico de calor\xEDas lo corrige.`;
  }
}

// src/motor/objetivos.ts
var OBJETIVOS = [
  {
    valor: "bajar_grasa",
    titulo: "Bajar grasa",
    detalle: "Perder grasa cuidando el m\xFAsculo",
    ritmo: -0.5
  },
  {
    valor: "recomposicion",
    titulo: "Cambiar mi composici\xF3n",
    detalle: "Mismo peso, menos grasa y m\xE1s m\xFAsculo",
    ritmo: 0
  },
  {
    valor: "subir_musculo",
    titulo: "Subir m\xFAsculo",
    detalle: "Ganar lo m\xE1s limpio posible",
    ritmo: 0.25
  },
  {
    valor: "mantener",
    titulo: "Mantenerme",
    detalle: "Quedarme donde estoy",
    ritmo: 0
  }
];
function nombreDeObjetivo(objetivo) {
  return OBJETIVOS.find((o) => o.valor === objetivo)?.titulo ?? "Sin definir";
}
export {
  calcularTendencia,
  leerProgreso,
  nombreDeObjetivo
};
