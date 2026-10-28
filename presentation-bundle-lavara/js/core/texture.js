// Brand textures rendered in WebGL2 at reduced internal resolution (invisible on soft shapes, keeps 60fps at 4K).
//   bubbles → Bundle: gooey metaballs with multi-color gradients + grain.
//   mist    → Lavara: slow domain-warped fog / foam with soft edges.
//   Lavara variants (brand.textureStyle), care-product materials instead of fog:
//     silk  → liquid soap: thick glossy folds with a moving sheen.
//     lather → the same liquid soap with a light, creamy lather drifting on its crests.
//     soap  → handmade soap bar: slow marbled swirls with fine flecks.
//     amber → light through perfume / oil: warm caustics in amber glass.
// One instance per canvas. Drive it with the tweenable fields: progress (coverage 0..1), alpha, speed, sweep.
import { hexToRgb } from './util.js';

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time, u_progress, u_alpha, u_grain, u_sweep;
uniform vec3 u_col[4];
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const BUBBLES = COMMON + `
uniform vec3 u_balls[14];
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float field = 0.0, wsum = 0.0; vec3 col = vec3(0.0);
  for (int i = 0; i < 14; i++) {
    vec3 b = u_balls[i];
    vec2 d = p - vec2(b.x * asp, b.y);
    float f = (b.z * b.z) / (dot(d, d) + 1e-4);
    field += f; wsum += f; col += u_col[i % 4] * f;
  }
  float flood = pow(u_progress, 3.0) * 3.0;
  field += flood;
  col = col / max(wsum, 1e-4);
  col = mix(col, u_col[0], clamp(flood * 0.35, 0.0, 0.85));
  float px = 1.5 / u_res.y;
  float a = smoothstep(1.0 - 0.02 - px * 8.0, 1.0 + 0.02 + px * 8.0, field);
  // soft inner light, like the brand's gradient spheres
  float light = clamp(1.0 - (field - 1.0) * 0.18, 0.0, 1.0);
  col = mix(col, col * 1.08 + 0.04, light * 0.5);
  col += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 91.0) - 0.5) * u_grain;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;

const MIST = COMMON + `
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 2.0;
  float t = u_time * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float d = fbm(p + 2.4 * r + vec2(-t * 3.0, 0.0));
  float cov = u_progress;
  float lo = 1.05 - cov * 1.7 + u_sweep * (uv.x - 0.5) * 0.7 * (1.0 - cov);
  float a = smoothstep(lo, lo + 0.32, d + 0.12 * length(q));
  a = max(a, smoothstep(0.86, 1.0, cov));
  vec3 col = mix(u_col[0], u_col[1], clamp(d * 1.25 - 0.1, 0.0, 1.0));
  col = mix(col, u_col[2], clamp(length(r) - 0.55, 0.0, 1.0) * 0.55);
  float foam = smoothstep(lo - 0.02, lo + 0.08, d) - smoothstep(lo + 0.08, lo + 0.26, d);
  col = mix(col, u_col[3], foam * 0.55 * (1.0 - smoothstep(0.85, 1.0, cov)));
  col += (hash(gl_FragCoord.xy + fract(u_time * 5.0) * 57.0) - 0.5) * u_grain;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;

const NOISE = `
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v; }
// Coverage like the fog: a liquid edge that floods in from the sweep side, crisp (a liquid, not a haze).
float reveal(float d, vec2 uv, float soft){
  float cov = u_progress;
  float lo = 1.0 - cov * 1.6 + u_sweep * (uv.x - 0.5) * 0.8 * (1.0 - cov);
  return max(smoothstep(lo, lo + soft, d), smoothstep(0.86, 1.0, cov));
}
float grain(){ return (hash(gl_FragCoord.xy + fract(u_time * 5.0) * 57.0) - 0.5) * u_grain; }
`;

// Liquid soap: a slow height field of broad poured folds, lit like a glossy, slightly translucent liquid.
const SILK_SRC = `
float H(vec2 p, float t){
  vec2 w = vec2(fbm(p * 0.45 + vec2(t, -t * 0.5)), fbm(p * 0.45 + vec2(4.3, 1.7) - t * 0.7));
  float f = sin((p.x * 0.45 + p.y * 1.3) * 3.4 + (w.x + w.y) * 3.0 - t * 1.6);
  return f * 0.5 + 0.5;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 2.0;
  float t = u_time * 0.05;
  float e = 0.004, h = H(p, t);
  vec2 g = vec2(H(p + vec2(e, 0.0), t) - h, H(p + vec2(0.0, e), t) - h) / e;
  vec3 n = normalize(vec3(-g * 0.55, 1.0));
  vec3 l = normalize(vec3(-0.5, 0.65, 0.6));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 48.0);
  float fres = pow(1.0 - n.z, 2.0);
  vec3 col = mix(u_col[0], u_col[1], smoothstep(0.05, 0.75, h));           // deep in the folds, warm on the crests
  col = mix(col, u_col[2], smoothstep(0.55, 1.0, h) * 0.6 * (0.4 + diff));  // light passing through the thin crests
  col *= 0.62 + 0.55 * diff;
  float glint = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 220.0);
  col += u_col[3] * (spec * 0.7 + glint * 0.6 + fres * 0.18);
#ifdef LATHER
  // a light lather: scattered round bubbles of mixed sizes in soft drifting patches, creamy and translucent
  float lp = smoothstep(0.58, 0.85, fbm(p * 1.1 + vec2(-t * 2.0, t)) + 0.3 * h);
  vec3 hi = u_col[0];                                                     // the palette's lightest colour, whatever order the caller passed
  for (int k = 1; k < 4; k++) if (dot(u_col[k], vec3(0.3, 0.59, 0.11)) > dot(hi, vec3(0.3, 0.59, 0.11))) hi = u_col[k];
  vec3 cream = mix(hi, u_col[2], 0.15);
  col = mix(col, cream, lp * 0.28);                                       // the thin film under the bubbles
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 7.0 : 15.0;
    vec2 bp = p * sc + vec2(-t * 3.0, t * 1.2) * (k == 0 ? 1.0 : 1.3) + float(k) * 11.0;
    vec2 bi = floor(bp), bf = fract(bp);
    float present = step(0.45, hash(bi + 5.0));
    vec2 c = 0.3 + 0.4 * vec2(hash(bi), hash(bi + 17.3));
    float rad = 0.12 + 0.2 * hash(bi + 9.0);
    float dd = length(bf - c);
    float body = 1.0 - smoothstep(rad - 0.03, rad, dd);
    float rim = body * smoothstep(rad - 0.07, rad - 0.01, dd);
    float glintB = 1.0 - smoothstep(0.0, rad * 0.28, length(bf - c - vec2(-0.35, 0.35) * rad));
    float m = present * lp * (k == 0 ? 0.85 : 0.65);
    col = mix(col, cream, body * m * 0.22);
    col = mix(col, hi, (rim * 0.55 + glintB * 0.8) * m);
  }
#endif
  float d = fbm(p * 0.8 + vec2(-t * 2.0, t)) + 0.25 * h;
  float a = reveal(d, uv, 0.05);
  col += grain() * 0.5;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;

const SILK = COMMON + NOISE + SILK_SRC;
const LATHER = COMMON + '#define LATHER\n' + NOISE + SILK_SRC;

// Handmade soap bar: soft marbled bands folded into each other, with sparse fine round flecks.
const SOAP = COMMON + NOISE + `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 1.4;
  float t = u_time * 0.03;
  vec2 q = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(3.1, 7.4) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float m = fbm(p + 2.2 * r + vec2(t * 0.7, -t));
  float band = 0.5 + 0.5 * sin(m * 16.0 + r.x * 4.0);
  vec3 col = mix(u_col[1], u_col[2], smoothstep(0.2, 0.8, m));            // the soap body
  col = mix(col, u_col[0], smoothstep(0.3, 0.0, band) * 0.45);             // darker folded swirls
  col = mix(col, u_col[3], smoothstep(0.86, 0.99, band) * 0.45);           // creamy marble streaks
  vec2 fp = gl_FragCoord.xy / (u_res.y * 0.012);                          // flecks sized to the screen, not the pixel
  vec2 fc = floor(fp), ff = fract(fp) - 0.5;
  float rf = hash(fc + 7.0);
  float fleck = step(0.965, rf) * (1.0 - smoothstep(0.12, 0.28, length(ff - (vec2(hash(fc), hash(fc + 3.0)) - 0.5) * 0.4)));
  col = mix(col, rf > 0.985 ? u_col[3] : u_col[0], fleck * 0.55);
  col *= 0.92 + 0.12 * smoothstep(0.2, 0.8, q.x);
  float a = reveal(m + 0.15 * length(q), uv, 0.05);
  col += grain() * 0.8;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;

// Light through perfume / oil in amber glass: a moving caustic network over a warm depth gradient.
const AMBER = COMMON + NOISE + `
vec2 h2(vec2 p){ return vec2(hash(p), hash(p + 17.3)); }
float caustic(vec2 p, float t){
  vec2 i = floor(p), f = fract(p); float f1 = 9.0, f2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y), c = h2(i + o);
    c = 0.5 + 0.42 * sin(t + 6.2831 * c);
    float d = length(o + c - f);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return 1.0 - smoothstep(0.0, 0.3, f2 - f1);
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = u_time * 0.18;
  vec2 w = p * vec2(1.6, 2.6) + 1.3 * vec2(fbm(p * 1.5 + t * 0.1), fbm(p * 1.5 - t * 0.1 + 5.0));
  float c = pow(caustic(w, t) * 0.6 + caustic(w * 1.5 + 3.0, t * 1.3) * 0.4, 1.6);
  float depth = smoothstep(0.0, 1.0, uv.y * 0.85 + 0.25 * fbm(p * 2.5 - t * 0.05));
  vec3 col = mix(u_col[0], u_col[1], depth);
  col = mix(col, u_col[2], c * (0.35 + 0.4 * depth));
  col += u_col[3] * pow(c, 3.0) * 0.3 * depth;
  float a = reveal(fbm(p * 2.0 + t * 0.03) + 0.35 * depth, uv, 0.1);
  col += grain() * 0.6;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;

const LAVARA_STYLES = ['silk', 'lather', 'soap', 'amber'];

const BALLS = 14;

export class BrandTexture {
  static moving = false;
  constructor(canvas, { resScale = 0.5 } = {}) {
    this.canvas = canvas; this.resScale = resScale;
    this.mode = null; this.colors = ['#000000', '#333333', '#666666', '#999999'];
    this.progress = 0; this.alpha = 1; this.speed = 1; this.sweep = 1; this.grain = 0.035;
    this.running = false; this.t = Math.random() * 100; this.last = 0;
    this.gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    this.ok = !!this.gl;
    this.programs = {};
    this.seedBalls();
    if (this.ok) this.initGL();
    this.loop = this.loop.bind(this);
  }
  seedBalls(seed = 1) {
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    this.balls = Array.from({ length: BALLS }, (_, i) => ({
      x: 0.06 + rnd() * 0.88, y: 0.08 + rnd() * 0.84,
      ox: 0.04 + rnd() * 0.08, oy: 0.04 + rnd() * 0.08,
      ph: rnd() * Math.PI * 2, sp: 0.15 + rnd() * 0.35, r: 0.05 + rnd() * 0.09 + (i < 3 ? 0.06 : 0),
    }));
    this.ballData = new Float32Array(BALLS * 3);
  }
  initGL() {
    const gl = this.gl;
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const [name, src] of [['bubbles', BUBBLES], ['mist', MIST], ['silk', SILK], ['lather', LATHER], ['soap', SOAP], ['amber', AMBER]]) {
      const prog = gl.createProgram();
      for (const [type, code] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, src]]) {
        const sh = gl.createShader(type); gl.shaderSource(sh, code); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(name, gl.getShaderInfoLog(sh)); this.ok = false; return; }
        gl.attachShader(prog, sh);
      }
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
      const u = n => gl.getUniformLocation(prog, n);
      this.programs[name] = { prog, u: { res: u('u_res'), time: u('u_time'), progress: u('u_progress'), alpha: u('u_alpha'), grain: u('u_grain'), sweep: u('u_sweep'), col: u('u_col'), balls: u('u_balls') } };
    }
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  set(opts = {}) {
    if (opts.mode) this.mode = opts.mode !== 'mist' ? 'bubbles' : LAVARA_STYLES.includes(opts.variant) ? opts.variant : 'mist';
    if (opts.colors) this.colors = [...opts.colors, ...this.colors].slice(0, 4);
    if (opts.seed != null) this.seedBalls(opts.seed);
    for (const k of ['progress', 'alpha', 'speed', 'sweep', 'grain', 'resScale']) if (opts[k] != null) this[k] = opts[k];
    if (!this.running) this.draw();
    return this;
  }
  resize() {
    // layout size, NOT getBoundingClientRect(): a parent layer scaled by a camera move must not inflate the pixel count
    const r = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
    const w = Math.max(2, Math.round(r.width * this.resScale)), h = Math.max(2, Math.round(r.height * this.resScale));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }
  start() { if (!this.ok || this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
  stop() { this.running = false; this.draw(); }
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.t += dt * this.speed;
    // While the camera moves, slow-drifting textures redraw every other frame: invisible on soft shapes,
    // and it leaves the GPU free so the camera move itself keeps the screen's full frame rate.
    this.frame = (this.frame || 0) + 1;
    if (!BrandTexture.moving || this.frame % 2 === 0) this.draw();
    requestAnimationFrame(this.loop);
  }
  draw() {
    if (!this.ok || !this.mode) return;
    const gl = this.gl; this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.alpha <= 0.001 || this.progress <= 0.001) return;
    const P = this.programs[this.mode]; if (!P) return;
    gl.useProgram(P.prog);
    gl.uniform2f(P.u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(P.u.time, this.t); gl.uniform1f(P.u.progress, this.progress);
    gl.uniform1f(P.u.alpha, this.alpha); gl.uniform1f(P.u.grain, this.grain); gl.uniform1f(P.u.sweep, this.sweep);
    gl.uniform3fv(P.u.col, new Float32Array(this.colors.flatMap(c => hexToRgb(c).map(v => v / 255))));
    if (this.mode === 'bubbles') {
      const p = this.progress, t = this.t;
      this.balls.forEach((b, i) => {
        const enter = (1 - Math.min(1, p * 1.6)) * this.sweep * 0.35; // drift in from the sweep side
        this.ballData[i * 3] = b.x + Math.sin(t * b.sp + b.ph) * b.ox - enter;
        this.ballData[i * 3 + 1] = b.y + Math.cos(t * b.sp * 0.8 + b.ph) * b.oy;
        this.ballData[i * 3 + 2] = b.r * (0.35 + p * 1.4);
      });
      gl.uniform3fv(P.u.balls, this.ballData);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
