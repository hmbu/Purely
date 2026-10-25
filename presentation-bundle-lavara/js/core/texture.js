// Brand textures rendered in WebGL2 at reduced internal resolution (invisible on soft shapes, keeps 60fps at 4K).
//   bubbles → Bundle: gooey metaballs with multi-color gradients + grain.
//   mist    → Lavara: slow domain-warped fog / foam with soft edges.
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

const BALLS = 14;

export class BrandTexture {
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
    for (const [name, src] of [['bubbles', BUBBLES], ['mist', MIST]]) {
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
    if (opts.mode) this.mode = opts.mode === 'mist' ? 'mist' : 'bubbles';
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
    this.draw();
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
