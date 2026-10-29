// Brand textures rendered in WebGL2 at reduced internal resolution (invisible on soft shapes, keeps 60fps at 4K).
//   bubbles → Bundle: gooey metaballs with multi-color gradients + grain.
//   Bundle variants (brand.textureStyle), drawn from bundle-brand.pdf:
//     orbs   → separate grainy gradient spheres (the brand's icons) drifting and bouncing off each other, never merging.
//     strips → vertical colour strips with circles, half circles and rounded columns sliding (its Purpose page).
//     stacks → columns of touching grainy circles moving up and down (its website page).
//   mist    → Lavara: slow domain-warped fog / foam with soft edges.
//   Lavara variants (brand.textureStyle), care-product materials instead of fog:
//     silk  → liquid soap: thick glossy folds with a moving sheen.
//     lather → the same liquid soap with a light, creamy lather drifting on its crests.
//     pour  → thick folds sliding down, as over glass.
//     drop  → a heavy gel surface with slow, damped rings from drops.
//     swirl → dark liquid soap and a cream ribbon folded together by a slow stir.
//     soap  → handmade soap bar: slow marbled swirls with fine flecks.
//     amber → light through perfume / oil: warm caustics in amber glass.
// One instance per canvas. Drive it with the tweenable fields: progress (coverage 0..1), alpha, speed, sweep.
import { hexToRgb } from './util.js';
import { LAVARA_SCENES, LAVARA_SCENE_SRC } from './lavara-scenes.js';

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

// Heavy liquid soap. Every liquid style is a slow height field H() lit the way thick glossy liquids read on camera:
// sharp studio-softbox reflections that slide over the folds (fog has none), a dark body and light passing through
// the thin crests. Each style only supplies H() and, optionally, the body colour; LIQUID_MAIN does the rest.
const LIQUID_MAIN = `
vec3 lo, hi;                                       // the palette's darkest and lightest colours, whatever order the caller passed
void sortPalette(){
  lo = u_col[0]; hi = u_col[0];
  for (int k = 1; k < 4; k++) { float y = dot(u_col[k], vec3(0.3, 0.59, 0.11));
    if (y < dot(lo, vec3(0.3, 0.59, 0.11))) lo = u_col[k]; if (y > dot(hi, vec3(0.3, 0.59, 0.11))) hi = u_col[k]; }
}
float box(vec2 r, vec2 c, vec2 s){ vec2 d = abs(r - c) - s; return 1.0 - smoothstep(0.0, 0.1, length(max(d, 0.0)) + min(max(d.x, d.y), 0.0)); }
void main(){
  sortPalette();
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 2.0;
  float t = u_time * SPEED;
  float e = 0.003, h = H(p, t);
  vec2 g = vec2(H(p + vec2(e, 0.0), t) - h, H(p + vec2(0.0, e), t) - h) / e;
  vec3 n = normalize(vec3(-g * RELIEF, 1.0));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float env = box(r.xy, vec2(-0.32, 0.36), vec2(0.07, 0.2)) + 0.6 * box(r.xy, vec2(0.42, 0.28), vec2(0.18, 0.05))
            + 0.25 * (1.0 - smoothstep(0.0, 0.7, length(r.xy - vec2(0.0, -0.55))));
  float fres = pow(1.0 - n.z, 2.0);
  float diff = clamp(dot(n, normalize(vec3(-0.4, 0.55, 0.75))), 0.0, 1.0);
  vec3 col = BODY;
  col *= 0.6 + 0.5 * diff;
  col += hi * (env * 0.6 + fres * 0.12);
#ifdef LATHER
  // a light lather: scattered round bubbles of mixed sizes in soft patches riding the liquid
  float lp = smoothstep(0.58, 0.85, fbm(p * 1.1 + vec2(-t * 1.5, t)) + 0.3 * h);
  vec3 cream = mix(hi, u_col[2], 0.15);
  col = mix(col, cream, lp * 0.28);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 7.0 : 15.0;
    vec2 bp = p * sc + vec2(-t * 2.0, t * 0.8) * (k == 0 ? 1.0 : 1.3) + float(k) * 11.0;
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
  float a = reveal(fbm(p * 0.7 + vec2(-t, t * 0.5)) + 0.3 * h, uv, 0.04);
  col += grain() * 0.4;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;
// dark in the troughs, warm where the liquid is thin on the crests
const BODY_SOAP = 'mix(mix(lo, u_col[1], smoothstep(0.0, 0.8, h)), u_col[2], smoothstep(0.6, 1.0, h) * 0.55)';
const liquid = (src, { speed, relief, body = BODY_SOAP, defs = '' }) =>
  COMMON + defs + `#define SPEED ${speed}\n#define RELIEF ${relief}\n#define BODY (${body})\n` + NOISE + src + LIQUID_MAIN;

// silk: broad satin folds that roll slowly across the screen
const H_SILK = `
float H(vec2 p, float t){
  float w = fbm(p * 0.35 + vec2(t * 0.6, -t * 0.3));
  return 0.5 + 0.5 * sin((p.x * 0.45 + p.y * 1.25) * 3.0 + w * 3.2 - t * 1.4);
}`;
// pour: thick vertical folds sliding down as if over glass, each fold wobbling as it goes
const H_POUR = `
float H(vec2 p, float t){
  float y = p.y + t * 0.9;
  float w = fbm(vec2(p.x * 0.9, y * 0.35));
  return 0.5 + 0.5 * sin(p.x * 3.4 + 1.3 * sin(y * 1.1 + p.x * 0.7) + w * 3.0);
}`;
// drop: a heavy gel surface where slow, strongly damped rings spread from drops that land one after another
const H_DROP = `
float H(vec2 p, float t){
  float h = 0.5 + 0.12 * fbm(p * 0.6 + t * 0.2);
  for (int k = 0; k < 3; k++) {
    float ph = t * 0.55 + float(k) / 3.0, cyc = floor(ph), age = fract(ph);
    vec2 c = vec2(0.6 + 2.4 * hash(vec2(cyc, float(k))), 0.3 + 1.4 * hash(vec2(float(k), cyc + 7.0)));
    float d = length(p - c);
    float ring = sin(d * 7.0 - age * 9.0) * exp(-d * 1.4) * smoothstep(age * 3.2 + 0.4, age * 3.2 - 0.6, d) * smoothstep(0.05, 0.45, d);
    h += ring * 0.45 * (1.0 - age) * smoothstep(0.0, 0.08, age);
  }
  return h;
}`;
// swirl: dark liquid soap and a cream ribbon folded together by a slow stir
const H_SWIRL = `
float H(vec2 p, float t){
  vec2 c = p - vec2(1.75, 1.0); float r = length(c);
  float a = t * 0.35 + 1.6 / (r + 0.6);
  c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;
  return 0.5 + 0.5 * sin(c.x * 3.2 + fbm(c * 0.8 + t * 0.1) * 2.4);
}`;
const BODY_SWIRL = 'mix(mix(lo, u_col[2], smoothstep(0.2, 0.55, h) * 0.6), mix(hi, u_col[2], 0.2), smoothstep(0.62, 0.8, h))';

const SILK = liquid(H_SILK, { speed: 0.06, relief: 1.1 });
const LATHER = liquid(H_SILK, { speed: 0.06, relief: 1.1, defs: '#define LATHER\n' });
const POUR = liquid(H_POUR, { speed: 0.05, relief: 0.45 });
const DROP = liquid(H_DROP, { speed: 0.12, relief: 0.6 });
const SWIRL = liquid(H_SWIRL, { speed: 0.07, relief: 0.4, body: BODY_SWIRL });

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

// Lavara scenes (opening screen, hub, transitions): their own ground and ink, full coverage, a calm middle.
// Kept in their own module so the background gallery page runs the very same shaders.
export { LAVARA_SCENES };
const LAVARA_STYLES = ['silk', 'lather', 'pour', 'drop', 'swirl', 'soap', 'amber', ...Object.keys(LAVARA_SCENES)];

// Bundle: separate spheres, painted one over another (never blended into each other); positions come from a
// small collision simulation in JS so they also never overlap while they drift.
const ORB_N = 9;
const SPHERE = `
// The brand's gradient circles are flat, vivid two-colour gradients with heavy grain, not shaded balls.
// Bundle-only modes, so the pairs are bundle-brand.pdf's own: pink→coral, lime→green, sky→deep blue, peach→orange.
vec3 sphereCol(vec3 base, vec2 o){
  float k = 0.0; float best = 9.0;
  vec3 keys[4] = vec3[4](vec3(0.949,0.663,0.761), vec3(0.682,0.902,0.498), vec3(0.8,0.886,0.949), vec3(0.141,0.345,0.271));
  for (int i = 0; i < 4; i++) { float dd = distance(base, keys[i]); if (dd < best) { best = dd; k = float(i); } }
  vec3 a1, a2;
  if (k < 0.5)      { a1 = vec3(0.929,0.776,0.969); a2 = vec3(0.91,0.45,0.373); }   // lilac → pink → coral
  else if (k < 1.5) { a1 = vec3(0.875,0.89,0.573);  a2 = vec3(0.235,0.541,0.369); } // lime → green
  else if (k < 2.5) { a1 = vec3(0.8,0.886,0.949);   a2 = vec3(0.231,0.482,0.878); } // sky → deep blue
  else              { a1 = vec3(0.925,0.765,0.624); a2 = vec3(0.839,0.325,0.122); } // peach → orange
  float t = clamp(dot(o, normalize(vec2(0.55, -0.83))) * 0.5 + 0.5, 0.0, 1.0);
  return mix(a1, a2, smoothstep(0.05, 0.95, t));
}
float coarseGrain(){ return hash(floor(gl_FragCoord.xy / 1.4) + fract(u_time * 3.0) * 37.0) - 0.5; }`;
const ORBS = COMMON + SPHERE + `
uniform vec3 u_balls[${ORB_N}];
uniform float u_tone[${ORB_N}];
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec3 col = vec3(0.0); float a = 0.0; float px = 1.5 / u_res.y;
  for (int i = 0; i < ${ORB_N}; i++) {
    vec3 b = u_balls[i]; if (b.z <= 0.0) continue;
    vec2 d = (p - vec2(b.x * asp, b.y)) / b.z;
    float r = length(d);
    float m = 1.0 - smoothstep(1.0 - px / b.z * 1.5, 1.0, r);
    if (m <= 0.0) continue;
    vec3 base = u_col[int(mod(u_tone[i], 4.0))];
    col = mix(col, sphereCol(base, d), m); a = max(a, m);
  }
  // the middle stays clear for the wordmark and the stations (never during a cover, where the flood fills it)
  float calm = 1.0 - smoothstep(0.55, 1.0, length((p - vec2(asp * 0.5, 0.58)) / vec2(asp * 0.36, 0.3)));
  a *= 1.0 - calm * 0.8;
  float flood = smoothstep(0.82, 1.0, u_progress);
  col = mix(col, u_col[0], flood * (1.0 - a * 0.0)); a = max(a, flood);
  col += coarseGrain() * 0.08 * a;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;
// Bundle: the Purpose page — vertical strips, each sliding a column of circles, half circles and rounded columns.
const STRIP_SRC = `
float shapeD(vec2 q, float k){               // q in the cell 0..1; k picks the shape
  if (k < 0.5) return length(q - 0.5) - 0.44;                                   // circle
  if (k < 1.5) { vec2 c = vec2(0.5, 0.06); return max(length(q - c) - 0.44, c.y - q.y); } // half circle
  vec2 c = vec2(0.5, 0.5); float d = q.y < 0.5 ? length(q - c) - 0.44 : abs(q.x - 0.5) - 0.44; // column with a rounded end
  return d;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float n = STRIPS_N; float si = floor(uv.x * n);
  float cellH = (u_res.x / n) / u_res.y;                 // one cell is as tall as a strip is wide
  float dir = mod(si, 2.0) < 0.5 ? 1.0 : -1.0;
  float yy = uv.y / cellH + u_time * (0.05 + 0.04 * hash(vec2(si, 3.0))) * dir + hash(vec2(si, 9.0)) * 4.0;
  float ci = floor(yy); vec2 q = vec2(fract(uv.x * n), fract(yy));
  float k = mod(ci + si * 2.0, 3.0);
  float present = step(STRIPS_EMPTY, hash(vec2(si, ci)));
  vec3 bg = STRIPS_BG;
  vec3 base = u_col[int(mod(si + ci, 4.0))];
  float d = shapeD(q, k); float px = 1.5 / (u_res.x / n);
  float m = (1.0 - smoothstep(-px, px, d)) * present;
  vec3 sc = sphereCol(base, (q - 0.5) * 2.2);
  vec3 col = mix(bg, sc, m);
  float sa = STRIPS_ALPHA_BG;
  // reveal: strips rise in turn from the sweep side
  float order = u_sweep >= 0.0 ? si / n : 1.0 - (si + 1.0) / n;
  float rv = clamp(u_progress * 1.6 - order * 0.6, 0.0, 1.0);
  float a = (uv.y < rv * 1.02 ? 1.0 : 0.0) * max(sa, m);
  col += coarseGrain() * 0.16;
  o = vec4(col * a * u_alpha, a * u_alpha);
}`;
const STRIPS = COMMON + SPHERE + '\n#define STRIPS_N 6.0\n#define STRIPS_EMPTY 0.18\n#define STRIPS_BG (u_col[int(mod(si, 4.0))] * 0.82)\n#define STRIPS_ALPHA_BG 1.0\n' + STRIP_SRC;
// Bundle: the website page — columns of touching circles on the background, moving up and down.
const STACKS = COMMON + SPHERE + '\n#define STRIPS_N 7.0\n#define STRIPS_EMPTY -1.0\n#define STRIPS_BG vec3(0.0)\n#define STRIPS_ALPHA_BG 0.0\n' + STRIP_SRC.replace('float k = mod(ci + si * 2.0, 3.0);', 'float k = 0.0; if (hash(vec2(si, 1.0)) < 0.42) { o = vec4(0.0); return; }');
// Bundle scenes for the main screen: each brings its own ground from the brand palette and a motion made only of the
// brand file's shapes (grainy gradient circles, half circles, rounded-end columns). The middle stays calm for the words.
//   meadow  → cream ground: separate shapes floating and slowly turning
//   sunrise → sky ground: half circles rising and setting along the floor, columns hanging from the top
//   bloom   → pink ground: a field of circles and half circles breathing in a slow diagonal wave
//   rhythm  → lime ground: rounded columns rising and falling like a slow equaliser, a sphere riding each
//   orbit   → deep-green ground: spheres travelling on wide elliptical orbits at three depths
//   skybubbles → sky ground: bubbles of the brand's vivid gradients rising slowly with a gentle sway, never merging
export const BUNDLE_SCENES = {
  meadow: { ground: '#F4EFE6', ink: '#245845' }, sunrise: { ground: '#CCE2F2', ink: '#0A1215' },
  bloom: { ground: '#F2A9C2', ink: '#0A1215' }, rhythm: { ground: '#AEE67F', ink: '#245845' }, orbit: { ground: '#245845', ink: '#F9FAFC' },
  skybubbles: { ground: '#CCE2F2', ink: '#0A1215' },
};
const SCENE_SRC = `
#define PI 3.14159265
vec3 pairCol(float k, vec2 o){ vec3 a1, a2;
  if (k < 0.5)      { a1 = vec3(0.929,0.776,0.969); a2 = vec3(0.91,0.45,0.373); }    // lilac → pink → coral
  else if (k < 1.5) { a1 = vec3(0.875,0.89,0.573);  a2 = vec3(0.235,0.541,0.369); }  // lime → green
  else if (k < 2.5) { a1 = vec3(0.8,0.886,0.949);   a2 = vec3(0.231,0.482,0.878); }  // sky → deep blue
  else if (k < 3.5) { a1 = vec3(0.925,0.765,0.624); a2 = vec3(0.839,0.325,0.122); }  // peach → orange
  else              { a1 = vec3(0.235,0.541,0.369); a2 = vec3(0.141,0.345,0.271); }  // green → deep green
  float t = clamp(dot(o, normalize(vec2(0.55, -0.83))) * 0.5 + 0.5, 0.0, 1.0);
  return mix(a1, a2, smoothstep(0.05, 0.95, t)); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdDome(vec2 q, float r){ return max(length(q) - r, -q.y); }               // half circle, flat side down at y = 0
float sdColumn(vec2 q, float r, float h){                                        // body from y = -h, rounded top at y = h
  if (q.y > h) return length(q - vec2(0.0, h)) - r; return max(abs(q.x) - r, -h - q.y); }
float h1(float i, float k){ return hash(vec2(i, k)); }
void paint(inout vec3 col, inout float a, float d, float k, vec2 o, float px){
  float m = 1.0 - smoothstep(-px, px, d); col = mix(col, pairCol(k, o), m); a = max(a, m); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y); float t = u_time; float px = 2.0 / u_res.y;
  vec3 col = SCENE_GROUND; float a = 0.0;
  float calm = 1.0 - smoothstep(0.55, 1.0, length((p - vec2(asp * 0.5, 0.58)) / vec2(asp * 0.36, 0.3)));
#if SCENE == 1
  for (int i = 0; i < 12; i++) { float fi = float(i);
    float r = 0.055 + 0.075 * h1(fi, 1.0);
    vec2 c = vec2((fi + 0.5) / 12.0 * asp + 0.08 * sin(t * 0.12 * (0.6 + h1(fi, 3.0)) + fi), 0.5 + (mod(fi, 2.0) < 0.5 ? 0.36 : -0.34) + 0.1 * sin(t * 0.1 * (0.6 + h1(fi, 4.0)) + fi * 1.7) + (h1(fi, 6.0) - 0.5) * 0.12);
    vec2 q = rot(t * 0.12 * (h1(fi, 5.0) - 0.5) * 2.0 + fi) * (p - c); float k = mod(fi, 3.0), d;
    if (k < 0.5) d = length(q) - r; else if (k < 1.5) d = sdDome(q + vec2(0.0, r * 0.42), r); else d = sdColumn(q, r * 0.48, r * 0.95);
    paint(col, a, d, mod(fi * 7.0, 4.0), q / r, px);
  }
#elif SCENE == 2
  float n = 7.0; float w = asp / n;
  for (int i = 0; i < 7; i++) { float fi = float(i);
    float r = w * (0.36 + 0.16 * sin(t * 0.35 + fi * 0.9));
    vec2 q = p - vec2((fi + 0.5) * w, -0.02);
    paint(col, a, sdDome(q, r), mod(fi * 3.0, 4.0) == 2.0 ? 1.0 : mod(fi * 3.0, 4.0), q / r, px);
  }
  for (int i = 0; i < 6; i++) { float fi = float(i);
    float hh = 0.08 + 0.07 * (0.5 + 0.5 * sin(t * 0.28 + fi * 1.3));
    vec2 q = (p - vec2((fi + 1.0) * asp / 7.0, 1.0)) * vec2(1.0, -1.0);
    paint(col, a, sdColumn(q, w * 0.16, hh), mod(fi + 1.0, 4.0) == 2.0 ? 4.0 : mod(fi + 1.0, 4.0), q / 0.1, px);
  }
#elif SCENE == 3
  float cols = 10.0; float cw = asp / cols; float rows = floor(1.0 / cw) + 1.0;
  vec2 cell = floor(vec2(p.x / cw, p.y / cw)); vec2 q = (vec2(p.x, p.y) - (cell + 0.5) * cw);
  float wave = 0.5 + 0.5 * sin(t * 0.55 - (cell.x + cell.y) * 0.55);
  float r = cw * 0.44 * (0.35 + 0.65 * wave) * (1.0 - calm * 0.92);
  float kind = mod(cell.x + cell.y, 2.0);
  float d = kind < 0.5 ? length(q) - r : sdDome(q + vec2(0.0, r * 0.42), r);
  float tone = mod(cell.x * 2.0 + cell.y, 4.0); tone = tone < 0.5 ? 4.0 : tone;
  paint(col, a, d, tone, q / max(r, 1e-3), px);
#elif SCENE == 4
  float n = 9.0; float w = asp / n;
  for (int i = 0; i < 9; i++) { float fi = float(i);
    float hgt = 0.04 + 0.12 * (0.5 + 0.5 * sin(t * 0.42 + fi * 0.75)) * (0.6 + 0.4 * h1(fi, 2.0));
    vec2 q = p - vec2((fi + 0.5) * w, 0.0);
    float tone = mod(fi, 4.0); tone = tone == 1.0 ? 4.0 : tone;
    paint(col, a, sdColumn(q, w * 0.34, hgt), tone, q / 0.15, px);
    vec2 qb = p - vec2((fi + 0.5) * w, hgt + w * 0.34 + w * 0.36);
    paint(col, a, length(qb) - w * 0.18, mod(fi + 2.0, 4.0) == 1.0 ? 4.0 : mod(fi + 2.0, 4.0), qb / (w * 0.18), px);
  }
  for (int i = 0; i < 5; i++) { float fi = float(i);
    vec2 q = p - vec2(mod(fi * 0.37 * asp + t * 0.025 * (1.0 + fi * 0.2), asp + 0.2) - 0.1, 0.9 - 0.05 * fi);
    float rr = 0.022 + 0.012 * h1(fi, 8.0); paint(col, a, length(q) - rr, mod(fi, 4.0) == 1.0 ? 4.0 : mod(fi, 4.0), q / rr, px);
  }
#elif SCENE == 6
  for (int i = 0; i < 16; i++) { float fi = float(i);
    float r = 0.035 + 0.075 * h1(fi, 1.0) * h1(fi, 7.0) + (mod(fi, 5.0) < 0.5 ? 0.04 : 0.0);
    float sp = 0.018 + 0.03 * h1(fi, 2.0);
    float y = fract(h1(fi, 3.0) + t * sp) * (1.0 + 4.0 * r) - 2.0 * r;
    float x = (fi + 0.5) / 16.0 * asp + 0.05 * sin(t * (0.25 + 0.3 * h1(fi, 4.0)) + fi * 2.1);
    vec2 q = p - vec2(x, y);
    float tone = mod(fi * 3.0, 5.0); tone = tone == 2.0 ? 4.0 : tone;
    vec2 o2 = q / r; float m = 1.0 - smoothstep(-px, px, length(q) - r);
    vec3 c = pairCol(tone, o2); c = mix(c, c * c * 1.15, 0.35); // clearer, deeper colour on the sky
    col = mix(col, c, m); a = max(a, m);
  }
#else
  vec2 ctr = vec2(asp * 0.5, 0.5);
  for (int ring = 0; ring < 3; ring++) { float fr = float(ring);
    float R = 0.32 + fr * 0.19; vec2 e = (p - ctr) / vec2(1.75, 1.0);
    float line = abs(length(e) - R); col = mix(col, vec3(0.976), (1.0 - smoothstep(0.0, px * 0.8, line)) * 0.16);
    for (int j = 0; j < 4; j++) { float fj = float(j);
      float ang = t * (0.06 - fr * 0.015) * (mod(fr, 2.0) < 0.5 ? 1.0 : -1.0) + fj * PI * 0.5 + fr * 0.7;
      vec2 c = ctr + vec2(cos(ang) * 1.75, sin(ang)) * R;
      float rr = 0.03 + fr * 0.022 + 0.01 * h1(fj, fr);
      vec2 q = p - c; paint(col, a, length(q) - rr, mod(fj + fr, 4.0), q / rr, px);
    }
  }
#endif
  // the middle stays quiet for the wordmark and the stations
  col = mix(col, SCENE_GROUND, calm * 0.8 * a);
  col += coarseGrain() * (0.025 + 0.045 * a);
  // reveal for transitions: a soft wipe from the sweep side
  float order = u_sweep >= 0.0 ? uv.x : 1.0 - uv.x;
  float rv = smoothstep(order * 0.7, order * 0.7 + 0.3, u_progress * 1.0001);
  o = vec4(col * rv * u_alpha, rv * u_alpha);
}`;
const hexVec = h => { const n = parseInt(h.slice(1), 16); return `vec3(${(((n >> 16) & 255) / 255).toFixed(3)}, ${(((n >> 8) & 255) / 255).toFixed(3)}, ${((n & 255) / 255).toFixed(3)})`; };
const SCENE_PROGS = Object.entries(BUNDLE_SCENES).map(([name, sc], i) => [name, COMMON + SPHERE + `\n#define SCENE ${i + 1}\n#define SCENE_GROUND ${hexVec(sc.ground)}\n` + SCENE_SRC]);
const BUNDLE_STYLES = ['orbs', 'strips', 'stacks', ...Object.keys(BUNDLE_SCENES)];

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
    for (const [name, src] of [['bubbles', BUBBLES], ['mist', MIST], ['orbs', ORBS], ['strips', STRIPS], ['stacks', STACKS], ['silk', SILK], ['lather', LATHER], ['pour', POUR], ['drop', DROP], ['swirl', SWIRL], ['soap', SOAP], ['amber', AMBER], ...Object.entries(LAVARA_SCENE_SRC), ...SCENE_PROGS]) {
      const prog = gl.createProgram();
      for (const [type, code] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, src]]) {
        const sh = gl.createShader(type); gl.shaderSource(sh, code); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(name, gl.getShaderInfoLog(sh)); this.ok = false; return; }
        gl.attachShader(prog, sh);
      }
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
      const u = n => gl.getUniformLocation(prog, n);
      this.programs[name] = { prog, u: { res: u('u_res'), time: u('u_time'), progress: u('u_progress'), alpha: u('u_alpha'), grain: u('u_grain'), sweep: u('u_sweep'), col: u('u_col'), balls: u('u_balls'), tone: u('u_tone') } };
    }
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  set(opts = {}) {
    if (opts.mode) this.mode = opts.mode !== 'mist' ? (BUNDLE_STYLES.includes(opts.variant) ? opts.variant : 'bubbles') : LAVARA_STYLES.includes(opts.variant) ? opts.variant : 'mist';
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
    if (this.mode === 'orbs') { this.stepOrbs(); gl.uniform3fv(P.u.balls, this.orbData); gl.uniform1fv(P.u.tone, this.orbTone); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // Orbs: slow drift with elastic bounces off the edges and off each other, so they never overlap or merge.
  stepOrbs() {
    const asp = (this.canvas.width || 16) / (this.canvas.height || 9), p = this.progress;
    if (!this.orbs) { // start spread across the width
      let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      this.orbs = Array.from({ length: ORB_N }, (_, i) => ({ x: (i + 0.25 + rnd() * 0.5) / ORB_N, y: 0.15 + rnd() * 0.7, vx: (rnd() - 0.5) * 0.05, vy: (rnd() - 0.5) * 0.05, r: 0.07 + rnd() * 0.07 + (i < 2 ? 0.05 : 0), tone: i % 4 }));
      this.orbData = new Float32Array(ORB_N * 3); this.orbTone = new Float32Array(ORB_N);
      this.orbT = this.t;
    }
    const dt = Math.min(0.05, Math.max(0, this.t - this.orbT)); this.orbT = this.t;
    const scale = 0.4 + Math.min(1, p * 1.25) * 0.75, O = this.orbs;
    for (const o of O) {
      o.x += o.vx * dt; o.y += o.vy * dt; const r = o.r * scale;
      if (o.x * asp < r) { o.x = r / asp; o.vx = Math.abs(o.vx); } if (o.x * asp > asp - r) { o.x = 1 - r / asp; o.vx = -Math.abs(o.vx); }
      if (o.y < r) { o.y = r; o.vy = Math.abs(o.vy); } if (o.y > 1 - r) { o.y = 1 - r; o.vy = -Math.abs(o.vy); }
    }
    for (let i = 0; i < O.length; i++) for (let j = i + 1; j < O.length; j++) {
      const a = O[i], b = O[j]; const dx = (b.x - a.x) * asp, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, min = (a.r + b.r) * scale + 0.012;
      if (d < min) { // push apart and exchange the velocity along the line between them
        const nx = dx / d, ny = dy / d, push = (min - d) / 2;
        a.x -= nx * push / asp; a.y -= ny * push; b.x += nx * push / asp; b.y += ny * push;
        const va = a.vx * asp * nx + a.vy * ny, vb = b.vx * asp * nx + b.vy * ny;
        if (va - vb > 0) { const k = va - vb; a.vx -= k * nx / asp; a.vy -= k * ny; b.vx += k * nx / asp; b.vy += k * ny; }
      }
    }
    O.forEach((o, i) => { this.orbData[i * 3] = o.x; this.orbData[i * 3 + 1] = o.y; this.orbData[i * 3 + 2] = o.r * scale; this.orbTone[i] = o.tone; });
  }
}
