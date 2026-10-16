// GENERADO: no se edita a mano.
// Sale de eatwell/src/motor/para-el-panel.ts con «node armar-motor-del-panel.mjs».
// Es el mismo motor de la app, para que el nutriólogo vea la misma tendencia
// que su paciente. huella: 611ed72cc5ce
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

// src/nutricion/equivalentes/smae.ts
var APORTE = {
  verduras: { kcal: 25, proteinaG: 2, grasaG: 0, carbohidratosG: 4 },
  frutas: { kcal: 60, proteinaG: 0, grasaG: 0, carbohidratosG: 15 },
  "cereales:sin_grasa": { kcal: 70, proteinaG: 2, grasaG: 0, carbohidratosG: 15 },
  "cereales:con_grasa": { kcal: 115, proteinaG: 2, grasaG: 5, carbohidratosG: 15 },
  leguminosas: { kcal: 120, proteinaG: 8, grasaG: 1, carbohidratosG: 20 },
  "origen_animal:muy_bajo": { kcal: 40, proteinaG: 7, grasaG: 1, carbohidratosG: 0 },
  "origen_animal:bajo": { kcal: 55, proteinaG: 7, grasaG: 3, carbohidratosG: 0 },
  "origen_animal:moderado": { kcal: 75, proteinaG: 7, grasaG: 5, carbohidratosG: 0 },
  "origen_animal:alto": { kcal: 100, proteinaG: 7, grasaG: 8, carbohidratosG: 0 },
  "leche:descremada": { kcal: 95, proteinaG: 9, grasaG: 2, carbohidratosG: 12 },
  "leche:semidescremada": { kcal: 110, proteinaG: 9, grasaG: 4, carbohidratosG: 12 },
  "leche:entera": { kcal: 150, proteinaG: 9, grasaG: 8, carbohidratosG: 12 },
  "leche:con_azucar": { kcal: 200, proteinaG: 8, grasaG: 5, carbohidratosG: 30 },
  "grasas:sin_proteina": { kcal: 45, proteinaG: 0, grasaG: 5, carbohidratosG: 0 },
  "grasas:con_proteina": { kcal: 70, proteinaG: 3, grasaG: 5, carbohidratosG: 3 },
  "azucares:sin_grasa": { kcal: 40, proteinaG: 0, grasaG: 0, carbohidratosG: 10 },
  "azucares:con_grasa": { kcal: 85, proteinaG: 0, grasaG: 5, carbohidratosG: 10 },
  libres: { kcal: 0, proteinaG: 0, grasaG: 0, carbohidratosG: 0 },
  // «140 kcal, 20 g de alcohol». El alcohol no es ningún macro de los otros.
  alcohol: { kcal: 140, proteinaG: 0, grasaG: 0, carbohidratosG: 0 }
};
var NOMBRE = {
  verduras: "Verduras",
  frutas: "Frutas",
  "cereales:sin_grasa": "Cereales sin grasa",
  "cereales:con_grasa": "Cereales con grasa",
  leguminosas: "Leguminosas",
  "origen_animal:muy_bajo": "Origen animal, muy bajo en grasa",
  "origen_animal:bajo": "Origen animal, bajo en grasa",
  "origen_animal:moderado": "Origen animal, moderado en grasa",
  "origen_animal:alto": "Origen animal, alto en grasa",
  "leche:descremada": "Leche descremada",
  "leche:semidescremada": "Leche semidescremada",
  "leche:entera": "Leche entera",
  "leche:con_azucar": "Leche con az\xFAcar",
  "grasas:sin_proteina": "Grasas sin prote\xEDna",
  "grasas:con_proteina": "Grasas con prote\xEDna",
  "azucares:sin_grasa": "Az\xFAcares sin grasa",
  "azucares:con_grasa": "Az\xFAcares con grasa",
  alcohol: "Bebidas alcoh\xF3licas"
};
var ORDEN_SMAE = Object.keys(NOMBRE);
function subgrupoPorGrasa(grasaPorEquivalente, cortes, ultimo) {
  for (const [hasta, sub] of cortes) if (grasaPorEquivalente <= hasta) return sub;
  return ultimo;
}
var redondear = (n) => Math.round(n * 100) / 100;
function equivalentesPorMacros(macros) {
  const r = {};
  const sumar = (e) => {
    for (const [k, v] of Object.entries(e)) r[k] = redondear((r[k] ?? 0) + v);
  };
  let hc = Math.max(macros.carbohidratosG, 0);
  let p = Math.max(macros.proteinaG, 0);
  let l = Math.max(macros.grasaG, 0);
  const azucar = Math.min(Math.max(macros.azucaresG ?? 0, 0), hc);
  if (azucar >= 2.5 && azucar >= hc * 0.2) {
    sumar({ "azucares:sin_grasa": azucar / 10 });
    hc -= azucar;
  }
  const cereales = hc / 15;
  if (cereales > 0.1) {
    sumar({ "cereales:sin_grasa": cereales });
    p = Math.max(p - cereales * 2, 0);
  }
  const animal = p / 7;
  if (animal > 0.1) {
    const grasaPorEq = Math.min(l / animal, 8);
    const sub = subgrupoPorGrasa(grasaPorEq, [[2, "muy_bajo"], [4, "bajo"], [6.5, "moderado"]], "alto");
    sumar({ [`origen_animal:${sub}`]: animal });
    l = Math.max(l - animal * APORTE[`origen_animal:${sub}`].grasaG, 0);
  }
  const grasas = l / 5;
  if (grasas > 0.1) sumar({ "grasas:sin_proteina": grasas });
  return r;
}
function sumarEquivalentes(...partes) {
  const r = {};
  for (const e of partes) {
    for (const [k, v] of Object.entries(e)) r[k] = (r[k] ?? 0) + v;
  }
  for (const k of Object.keys(r)) r[k] = redondear(r[k]);
  return r;
}
function escalarEquivalentes(e, factor) {
  const r = {};
  for (const [k, v] of Object.entries(e)) {
    const n = redondear(v * factor);
    if (n > 0) r[k] = n;
  }
  return r;
}

// src/nutricion/equivalentes/registros.ts
function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
var numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
var TOLERANCIA = 0.15;
function equivalentesDeRegistro(r, tabla) {
  const gramos = numero(r.cantidad_g);
  const kcal = numero(r.kcal);
  const id = r.alimento_id ?? "";
  const directo = id && tabla.porId[id] ? id : void 0;
  const porNombre = directo ? void 0 : tabla.idPorNombre[normalizar(r.nombre)];
  const entrada = tabla.porId[directo ?? porNombre ?? ""];
  if (entrada && gramos > 0) {
    const segunReceta = entrada.k * gramos / 100;
    const base = escalarEquivalentes(entrada.e, gramos / 100);
    if (segunReceta <= 0 || kcal <= 0) return { equivalentes: base, aproximado: false };
    const razon = kcal / segunReceta;
    if (Math.abs(razon - 1) <= TOLERANCIA) return { equivalentes: base, aproximado: false };
    return { equivalentes: escalarEquivalentes(base, razon), aproximado: true };
  }
  return {
    equivalentes: equivalentesPorMacros({
      kcal,
      proteinaG: numero(r.proteina_g),
      carbohidratosG: numero(r.carbohidratos_g),
      grasaG: numero(r.grasa_g)
    }),
    aproximado: true
  };
}
function resumenDeEquivalentes(registros, tabla) {
  const porDia = {};
  let aproximados = 0;
  for (const r of registros) {
    const { equivalentes, aproximado } = equivalentesDeRegistro(r, tabla);
    if (aproximado) aproximados++;
    porDia[r.fecha] = sumarEquivalentes(porDia[r.fecha] ?? {}, equivalentes);
  }
  const dias = Object.keys(porDia).length;
  const promedio = dias > 0 ? escalarEquivalentes(sumarEquivalentes(...Object.values(porDia)), 1 / dias) : {};
  return { porDia, promedio, dias, registros: registros.length, aproximados };
}

// src/panel/consulta.ts
function moverDias(iso, n) {
  const d = /* @__PURE__ */ new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diasEntre(desde, hasta) {
  const r = [];
  for (let d = desde; d <= hasta; d = moverDias(d, 1)) r.push(d);
  return r;
}
function cuantosDias(desde, hasta) {
  return Math.round((Date.parse(hasta + "T12:00:00Z") - Date.parse(desde + "T12:00:00Z")) / 864e5);
}
var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function corta(iso) {
  return `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]}`;
}
var miles = (n) => Math.round(n).toLocaleString("es-MX");
var kg = (n) => `${n > 0.05 ? "+" : n < -0.05 ? "\u2212" : ""}${Math.abs(n).toFixed(1)} kg`;
var plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
var GRUPOS = [
  ["verduras", "verduras"],
  ["frutas", "frutas"],
  ["cereales", "cereales"],
  ["leguminosas", "leguminosas"],
  ["origen_animal", "origen animal"],
  ["leche", "leche"],
  ["grasas", "grasas"],
  ["azucares", "az\xFAcares"],
  ["alcohol", "alcohol"]
];
function resumenParaLaConsulta(e) {
  const { desde, hasta } = e;
  const dias = cuantosDias(desde, hasta) + 1;
  const enPeriodo = (xs) => xs.filter((x) => x.fecha >= desde && x.fecha <= hasta);
  const renglones = [];
  const pesadas = enPeriodo(e.pesadas);
  const linea = enPeriodo(e.tendencia).filter((t) => t.tendenciaKg != null);
  if (pesadas.length === 0) {
    renglones.push({ titulo: "Peso", texto: "No se pes\xF3 en este periodo." });
  } else {
    const diasPesado = new Set(pesadas.map((p) => p.fecha)).size;
    let texto = `Se pes\xF3 ${diasPesado} de ${dias} d\xEDas.`;
    if (linea.length >= 2) {
      const a = linea[0], b = linea[linea.length - 1];
      const cambio = b.tendenciaKg - a.tendenciaKg;
      const semanas2 = Math.max(cuantosDias(a.fecha, b.fecha) / 7, 1);
      texto = `Su tendencia pas\xF3 de ${a.tendenciaKg.toFixed(1)} a ${b.tendenciaKg.toFixed(1)} kg (${kg(cambio)}, ${kg(cambio / semanas2)} por semana). ` + texto;
    }
    renglones.push({ titulo: "Peso", texto });
  }
  const comidas = enPeriodo(e.comidas);
  const porDia = /* @__PURE__ */ new Map();
  for (const c of comidas) {
    const d = porDia.get(c.fecha) ?? { kcal: 0, proteina: 0 };
    d.kcal += Number(c.kcal) || 0;
    d.proteina += Number(c.proteina_g) || 0;
    porDia.set(c.fecha, d);
  }
  if (porDia.size === 0) {
    renglones.push({ titulo: "Lo que registr\xF3", texto: "No registr\xF3 comida en este periodo." });
  } else {
    const vals = [...porDia.values()];
    const kcal = vals.reduce((s, v) => s + v.kcal, 0) / vals.length;
    const proteina = vals.reduce((s, v) => s + v.proteina, 0) / vals.length;
    let texto = `Registr\xF3 ${porDia.size} de ${dias} d\xEDas. En esos d\xEDas, ${miles(kcal)} kcal y ${Math.round(proteina)} g de prote\xEDna en promedio.`;
    const metasDelPeriodo = e.metas.filter((m) => m.semana_inicio <= hasta && moverDias(m.semana_inicio, 6) >= desde && m.kcal != null).map((m) => Number(m.kcal));
    if (metasDelPeriodo.length > 0) {
      texto += ` Su meta promedio fue de ${miles(metasDelPeriodo.reduce((s, v) => s + v, 0) / metasDelPeriodo.length)} kcal.`;
    }
    let racha = 0, mejor = 0, inicioMejor = "", inicio = "";
    for (const d of diasEntre(desde, hasta)) {
      if (porDia.has(d)) {
        racha = 0;
        continue;
      }
      if (racha === 0) inicio = d;
      racha++;
      if (racha > mejor) {
        mejor = racha;
        inicioMejor = inicio;
      }
    }
    if (mejor >= 3) {
      texto += ` Su racha m\xE1s larga sin registrar fue de ${mejor} d\xEDas, desde el ${corta(inicioMejor)}.`;
    }
    renglones.push({ titulo: "Lo que registr\xF3", texto });
  }
  if (e.tablaDeEquivalentes && comidas.length > 0) {
    const r = resumenDeEquivalentes(comidas, e.tablaDeEquivalentes);
    const partes = GRUPOS.map(([clave, nombre]) => {
      const n = Object.entries(r.promedio).filter(([k]) => k === clave || k.startsWith(clave + ":")).reduce((s, [, v]) => s + v, 0);
      return n >= 0.1 ? `${nombre} ${n.toFixed(1)}` : null;
    }).filter(Boolean);
    let texto = `Al d\xEDa, en promedio: ${partes.join(" \xB7 ")}.`;
    if (r.aproximados > 0) texto += ` ${plural(r.aproximados, "registro es aproximado", "registros son aproximados")}.`;
    renglones.push({ titulo: "En equivalentes", texto });
  }
  const semanas = e.metas.filter((m) => m.semana_inicio <= hasta && m.gasto_estimado_kcal != null);
  const ultima = semanas[semanas.length - 1];
  if (ultima) {
    const antes = semanas.filter((m) => m.semana_inicio <= desde).pop() ?? semanas[0];
    const conf = Math.round(Math.max(0, Math.min(1, Number(ultima.confianza) || 0)) * 100);
    let texto = `La app estima que gasta ${miles(Number(ultima.gasto_estimado_kcal))} kcal al d\xEDa; el ${conf}% de ese c\xE1lculo sale de sus propios datos.`;
    if (antes !== ultima) {
      const dif = Number(ultima.gasto_estimado_kcal) - Number(antes.gasto_estimado_kcal);
      if (Math.abs(dif) >= 50) texto += ` Al inicio del periodo estimaba ${miles(Number(antes.gasto_estimado_kcal))}.`;
    }
    renglones.push({ titulo: "Su gasto", texto });
  }
  const comp = enPeriodo(e.composiciones);
  const ultimaComp = comp[comp.length - 1];
  if (ultimaComp) {
    const mismas = comp.filter((c) => c.metodo === ultimaComp.metodo);
    const primera = mismas[0];
    if (mismas.length >= 2 && primera !== ultimaComp) {
      const partes = [];
      if (primera.porcentaje_grasa != null && ultimaComp.porcentaje_grasa != null) {
        partes.push(`grasa ${Number(primera.porcentaje_grasa).toFixed(1)}% \u2192 ${Number(ultimaComp.porcentaje_grasa).toFixed(1)}%`);
      }
      if (primera.musculo_kg != null && ultimaComp.musculo_kg != null) {
        partes.push(`m\xFAsculo ${Number(primera.musculo_kg).toFixed(1)} \u2192 ${Number(ultimaComp.musculo_kg).toFixed(1)} kg`);
      }
      if (partes.length > 0) {
        renglones.push({ titulo: "Su composici\xF3n", texto: `Del ${corta(primera.fecha)} al ${corta(ultimaComp.fecha)}, con el mismo m\xE9todo: ${partes.join("; ")}.` });
      }
    }
  }
  return { periodo: `Del ${corta(desde)} al ${corta(hasta)} \xB7 ${plural(dias, "d\xEDa", "d\xEDas")}`, renglones };
}
var SIN_REGISTRAR = 3;
var SIN_PESARSE = 10;
var CAIDA = 3;
function aQuienHablarleHoy(pacientes, hoy) {
  const avisos = [];
  for (const p of pacientes) {
    if (p.firmo_acuerdo === false) continue;
    const motivos = [];
    let peso = 0;
    if (!p.ultima_captura) {
      motivos.push("Todav\xEDa no registra nada.");
      peso += 3;
    } else {
      const sin = cuantosDias(p.ultima_captura, hoy);
      if (sin >= SIN_REGISTRAR) {
        motivos.push(`No registra desde hace ${sin} d\xEDas.`);
        peso += sin;
      }
      const estaSemana = p.fechasDeRegistro.filter((f) => f > moverDias(hoy, -7) && f <= hoy).length;
      const anterior = p.fechasDeRegistro.filter((f) => f > moverDias(hoy, -14) && f <= moverDias(hoy, -7)).length;
      if (anterior - estaSemana >= CAIDA && sin < SIN_REGISTRAR) {
        motivos.push(`Registr\xF3 ${estaSemana} de los \xFAltimos 7 d\xEDas; la semana anterior, ${anterior}.`);
        peso += anterior - estaSemana;
      }
    }
    if (p.ultima_pesada) {
      const sin = cuantosDias(p.ultima_pesada, hoy);
      if (sin >= SIN_PESARSE) {
        motivos.push(`No se pesa desde hace ${sin} d\xEDas.`);
        peso += 1;
      }
    }
    if (motivos.length > 0) {
      avisos.push({ paciente_id: p.paciente_id, nombre: p.nombre_paciente || "Sin nombre", motivos, peso });
    }
  }
  return avisos.sort((a, b) => b.peso - a.peso).map(({ peso: _, ...a }) => a);
}
export {
  NOMBRE as NOMBRE_SMAE,
  ORDEN_SMAE,
  aQuienHablarleHoy,
  calcularTendencia,
  leerProgreso,
  nombreDeObjetivo,
  resumenDeEquivalentes,
  resumenParaLaConsulta
};
