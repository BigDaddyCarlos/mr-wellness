/* Mr. Wellness — el logotipo en 3D
   La mano, la columna y el cerebro del logotipo, hechos de miles de puntos con sus
   colores reales. De frente se lee exactamente el logotipo; al girar, cada parte
   (mano, columna, cerebro) flota a una profundidad distinta y la figura se
   deshace en una escultura; al volver de frente, se recompone.

   Cámara ortográfica: de frente el dibujo es idéntico al logo sin importar la
   profundidad. Ligera a propósito: una sola nube de puntos, resolución limitada y
   pausa cuando no se ve. Con movimiento reducido se queda el logotipo, de frente. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const LOGO_URL = new URL('./logo-es-640.png', import.meta.url).href;
// Zona del emblema dentro de logo-es-640.png (sin el «Mr. Wellness» de abajo)
const CROP = { x0: 205, x1: 450, y0: 36, y1: 256 };

const VERT = /* glsl */`
attribute vec3 aColor;
attribute float aZ;
attribute float aPhase;
attribute float aSize;
uniform float uTime;
uniform float uSize;
uniform float uSpread;
varying vec3 vColor;
varying float vA;
void main(){
  vColor = aColor;
  float breathe = .88 + .12 * sin(uTime * .7 + aPhase);
  vec3 p = position;
  p.z = (aZ * breathe + .10 * sin(position.x * 3.1 + uTime * .8)) * uSpread;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float rel = mv.z + 10.;                       // la cámara está a 10: >0 = más cerca
  vA = .5 + .5 * smoothstep(-1.3, 1.3, rel);    // lo lejano se aclara y da profundidad
  gl_PointSize = uSize * aSize;
}`;

const FRAG = /* glsl */`
precision mediump float;
varying vec3 vColor;
varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  gl_FragColor = vec4(vColor, smoothstep(.5, .32, d) * vA);
}`;

/* Convierte el logotipo en puntos: un punto por píxel visible, con su color */
async function logoPoints() {
  const img = new Image();
  img.decoding = 'async';
  img.src = LOGO_URL;
  await img.decode();
  // Se muestrea al doble de resolución (media celda por punto): los bordes salen suaves, no escalonados
  const K = 2;
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth * K; cv.height = img.naturalHeight * K;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const x0 = CROP.x0 * K, x1 = CROP.x1 * K, y0 = CROP.y0 * K, y1 = CROP.y1 * K;
  const w = x1 - x0, h = y1 - y0;
  const data = ctx.getImageData(x0, y0, w, h).data;
  const s = 2 / h;                               // el emblema mide 2 unidades de alto

  const pos = [], col = [], z = [], ph = [], sz = [];
  const layer = { sage: -0.6, blue: 0, orange: 0.6 };  // mano atrás, columna al centro, cerebro adelante
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      const a = data[k + 3];
      if (a < 110) continue;
      const r = data[k], g = data[k + 1], b = data[k + 2];
      const x = (i - w / 2) * s;
      const y = -(j - h / 2) * s;
      const kind = b > r && b > g - 8 ? 'blue' : (g > r ? 'sage' : 'orange');
      // Superficie suave que ondula + el nivel de cada parte + un poco de grano
      const field = Math.sin(x * 1.7 + 0.7) * Math.cos(y * 1.3 - 0.4) * 0.45 + Math.sin(x * 3.2 - y * 2.1) * 0.18;
      const zz = layer[kind] + field + (Math.random() - 0.5) * 0.14;
      pos.push(x, y, 0);
      col.push(r / 255, g / 255, b / 255);
      z.push(zz);
      ph.push(Math.random() * Math.PI * 2);
      sz.push(0.9 + Math.random() * 0.25);
    }
  }
  return { n: z.length, pos: new Float32Array(pos), col: new Float32Array(col), z: new Float32Array(z), ph: new Float32Array(ph), sz: new Float32Array(sz), step: s };
}

export async function mountFlow(host, { reduceMotion = false } = {}) {
  const small = window.innerWidth < 860;
  const pts = await logoPoints();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const dpr = () => Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
  renderer.setPixelRatio(dpr());
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  camera.position.set(0, 0, 10);

  const group = new THREE.Group();
  scene.add(group);

  /* El logotipo */
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts.pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(pts.col, 3));
  geo.setAttribute('aZ', new THREE.BufferAttribute(pts.z, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(pts.ph, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(pts.sz, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  const uniforms = { uTime: { value: 0 }, uSize: { value: 3 }, uSpread: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false });
  const logo = new THREE.Points(geo, mat);
  group.add(logo);

  /* Polvo de colores de la marca alrededor (muy tenue) */
  const N = small ? 60 : 110;
  const dp = new Float32Array(N * 3), dc = new Float32Array(N * 3), dz = new Float32Array(N), dph = new Float32Array(N), dsz = new Float32Array(N);
  const brand = [[0.949, 0.529, 0.122], [0.639, 0.737, 0.235], [0.498, 0.698, 0.8]];
  for (let i = 0; i < N; i++) {
    const r = 1.5 + Math.random() * 1.2, th = Math.random() * Math.PI * 2;
    dp[i * 3] = Math.cos(th) * r; dp[i * 3 + 1] = Math.sin(th) * r * 0.85; dp[i * 3 + 2] = 0;
    dz[i] = (Math.random() - 0.5) * 3; dph[i] = Math.random() * 6.28; dsz[i] = 0.7 + Math.random() * 0.8;
    const c = brand[i % 3]; dc[i * 3] = c[0]; dc[i * 3 + 1] = c[1]; dc[i * 3 + 2] = c[2];
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dg.setAttribute('aColor', new THREE.BufferAttribute(dc, 3));
  dg.setAttribute('aZ', new THREE.BufferAttribute(dz, 1));
  dg.setAttribute('aPhase', new THREE.BufferAttribute(dph, 1));
  dg.setAttribute('aSize', new THREE.BufferAttribute(dsz, 1));
  dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
  const dust = new THREE.Points(dg, mat);
  group.add(dust);

  /* Tamaño y encuadre */
  const VIEW_H = 3.1;
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setPixelRatio(dpr());
    renderer.setSize(w, h, false);
    const vw = VIEW_H * (w / h);
    camera.left = -vw / 2; camera.right = vw / 2; camera.top = VIEW_H / 2; camera.bottom = -VIEW_H / 2;
    camera.updateProjectionMatrix();
    const wide = window.innerWidth > 860;
    const full = window.innerWidth > 1180;
    if (wide && full) { group.position.set(vw * 0.29, 0, 0); group.scale.setScalar(Math.min(0.95, (vw * 0.42) / 2.2)); }
    else if (wide) { group.position.set(0, 0, 0); group.scale.setScalar(Math.min(1.0, (vw * 0.86) / 2.2)); }
    else { group.position.set(0, 0.02, 0); group.scale.setScalar(Math.min(1.0, (vw * 0.9) / 2.2)); }
    // diámetro del punto ≈ 1.7 píxeles del logotipo original, para que de frente se vea sólido
    const pxPerUnit = (h * dpr()) / VIEW_H * group.scale.x;
    uniforms.uSize.value = Math.max(2.2, pts.step * 1.9 * pxPerUnit);
  }
  resize();
  const ro = new ResizeObserver(() => { resize(); if (reduceMotion) frame(); });
  ro.observe(host);

  /* Cursor (o toque) sobre toda la portada */
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const hero = host.parentElement || host;
  if (!reduceMotion) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });
  }

  /* Bucle: se detiene si no se ve o la pestaña está oculta */
  let visible = true, raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    raf = 0;
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;

    uniforms.uTime.value = t;
    // Primero se ve el logotipo de frente; a los 1.2 s la figura se abre en profundidad
    const open = reduceMotion ? 0 : THREE.MathUtils.smoothstep(t, 1.2, 3.6);
    uniforms.uSpread.value = open;

    // Gira de un lado a otro y se detiene más tiempo de frente, donde se lee el logotipo
    const sway = Math.sin(t * 0.5);
    const idle = Math.sign(sway) * Math.pow(Math.abs(sway), 1.8) * 0.95 * open;
    group.rotation.y = idle + cur.x * 0.7 * open;
    group.rotation.x = (-cur.y * 0.22 + Math.sin(t * 0.3) * 0.05) * open;

    renderer.render(scene, camera);
    if (visible && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && visible && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame); }

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) play(); }, { threshold: 0 });
  io.observe(host);
  document.addEventListener('visibilitychange', play);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); host.classList.remove('is-live'); cancelAnimationFrame(raf); });

  frame();
  return true;
}
