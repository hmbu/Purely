// Lavara's background for the opening screen, the hub and the section transitions: its framed A pressed into the
// brown page, floating slowly under a moving warm light. Only Lavara's palette (lavara-brand.pdf); the middle stays calm.
// Kept in its own module so the gallery page can run the very same shader.

const HEAD = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time, u_progress, u_alpha, u_grain, u_sweep;
uniform vec3 u_col[4];
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v; }
const vec3 LV_BROWN = vec3(0.235, 0.180, 0.145), LV_IVORY = vec3(0.953, 0.949, 0.878), LV_PAPER = vec3(0.973, 0.949, 0.910);
const vec3 LV_TERRA = vec3(0.678, 0.384, 0.263), LV_RUST = vec3(0.561, 0.180, 0.008), LV_OLIVE = vec3(0.357, 0.388, 0.290);
const vec3 LV_SAGE = vec3(0.573, 0.620, 0.478), LV_OCHRE = vec3(0.573, 0.416, 0.137);
float h1(float a, float b){ return hash(vec2(a, b * 1.37 + 0.11)); }
vec2 h2(vec2 p){ return vec2(hash(p), hash(p + 17.3)); }
vec3 screen(vec3 a, vec3 b){ return 1.0 - (1.0 - a) * (1.0 - clamp(b, 0.0, 1.0)); }
// 1 in the middle (where the words sit), 0 toward the edges
float calmAt(vec2 c, float asp){ return 1.0 - smoothstep(0.45, 1.0, length((c - vec2(asp * 0.5, 0.56)) / vec2(asp * 0.3, 0.3))); }
float cells(vec2 p, float t, float w){            // the bright edges of slowly moving cells: light through water
  vec2 i = floor(p), f = fract(p); float f1 = 9.0, f2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o2 = vec2(x, y), c = h2(i + o2); c = 0.5 + 0.42 * sin(t + 6.2831 * c);
    float d = length(o2 + c - f); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return 1.0 - smoothstep(0.0, w, f2 - f1);
}
void finish(vec3 col, vec2 uv){
  col += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 91.0) - 0.5) * u_grain * 0.35;
  float order = u_sweep >= 0.0 ? uv.x : 1.0 - uv.x;
  float rv = smoothstep(order * 0.7, order * 0.7 + 0.3, u_progress * 1.0001);
  o = vec4(col * rv * u_alpha, rv * u_alpha);
}
uniform sampler2D u_tex;
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0); return length(pa - ba * h); }
float sdBox(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float hair(float d, float w){ float px = 1.0 / u_res.y; return 1.0 - smoothstep(w * px, (w + 1.2) * px, abs(d)); }   // a hairline w px wide
float img(vec2 p, vec2 c, float h, float ar){       // the brand image (mask) in a box: centre c, height h, width/height ar
  vec2 q = (p - c) / vec2(h * ar, h) + 0.5; if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return 0.0; return texture(u_tex, q).a; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float fill(float d){ float px = 1.3 / u_res.y; return 1.0 - smoothstep(-px, px, d); }
// one gently drifting object (i of n), the way Bundle's spheres move: spread across the width, a slow wander, a slight turn.
// returns centre (xy), size (z) and angle (w)
vec4 drift(float i, float n, float seed, float asp, float t, float rmin, float rmax){
  float j = i + seed;
  vec2 c = vec2((i + 0.5) / n * asp + (h1(j, 1.0) - 0.5) * asp / n * 0.8, 0.1 + 0.8 * h1(j, 2.0));
  c += vec2(sin(t * (0.05 + 0.04 * h1(j, 3.0)) + j * 1.7) * 0.07, cos(t * (0.04 + 0.04 * h1(j, 4.0)) + j * 2.3) * 0.055);
  return vec4(c, mix(rmin, rmax, h1(j, 5.0)), sin(t * (0.05 + 0.05 * h1(j, 6.0)) + j) * 0.35);
}
vec3 tone(float k){ k = mod(k, 5.0); return k < 1.0 ? LV_TERRA : k < 2.0 ? LV_SAGE : k < 3.0 ? LV_OCHRE : k < 4.0 ? LV_IVORY : LV_OLIVE; }
#define SETUP vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y; vec2 p = vec2(uv.x * asp, uv.y); float t = u_time; float calm = calmAt(p, asp);
`;


const S = {};

// Pressed A: Lavara's background, its answer to Bundle's drifting spheres. Its framed A is pressed into the page, in
// Lavara's own brown (#3C2E25, kept exact: no darkening gradients or vignettes). The motion is simple and slow:
// the A floats as it rests, and every few seconds it lets go of the page (the press fades flat) and is pressed again
// on the other side, so it walks from one edge to the other and never crosses the words. A warm light drifts over it,
// its pressed edges catching light and shadow.
S.press = { name: 'حرف A مضغوط', ground: '#3C2E25', ink: '#F3F2E0', tex: 'mark', body: `
void main(){ SETUP
  vec3 col = LV_BROWN * 0.93;   // with the room light added on top, the page reads as Lavara's brown (#3C2E25)
  col *= 1.0 + 0.016 * (vnoise(gl_FragCoord.xy * 0.45) - 0.5) + 0.012 * (fbm(p * 6.0) - 0.5);   // the paper's tooth
  vec2 lp = vec2(asp * (0.5 + 0.35 * sin(t * 0.08)), 0.62 + 0.2 * sin(t * 0.11 + 1.3));            // the room's light, drifting
  float L = exp(-dot(p - lp, p - lp) / 0.4);
  vec3 warm = mix(LV_OCHRE, LV_IVORY, 0.35);
  col += (col * 0.1 + warm * 0.03) * L;
  // the A: pressed on one side, held while it floats, let go, pressed again on the other side
  float P = 10.0, ph = t / P, f = fract(ph);
  float side = mod(floor(ph), 2.0);
  float depth = smoothstep(0.0, 0.18, f) * (1.0 - smoothstep(0.82, 1.0, f));
  float x = side < 0.5 ? asp * 0.85 : asp * 0.15;
  vec2 c = vec2(x + 0.04 * sin(t * 0.16), 0.47 + 0.06 * sin(t * 0.26) + 0.04 * (1.0 - depth));
  float h = 1.1 * (1.0 + 0.03 * sin(t * 0.14));
  vec2 pa = c + rot(0.05 * sin(t * 0.21)) * (p - c);
  float e = 0.0055;
  vec2 gr = vec2(img(pa + vec2(e, 0.0), c, h, 0.746) - img(pa - vec2(e, 0.0), c, h, 0.746),
                 img(pa + vec2(0.0, e), c, h, 0.746) - img(pa - vec2(0.0, e), c, h, 0.746));
  e = 0.011;
  gr += 0.6 * vec2(img(pa + vec2(e, 0.0), c, h, 0.746) - img(pa - vec2(e, 0.0), c, h, 0.746),
                   img(pa + vec2(0.0, e), c, h, 0.746) - img(pa - vec2(0.0, e), c, h, 0.746));
  vec2 ld = normalize(lp - p + vec2(1e-4, 0.0));
  float sh = dot(gr, ld);                                     // pressed in: the edge toward the light falls in shadow
  float k = depth * (0.7 + 0.8 * L);
  col *= 1.0 - 0.26 * clamp(sh, 0.0, 1.0) * k;
  col += warm * 0.12 * clamp(-sh, 0.0, 1.0) * k;
  col *= 1.0 - img(pa, c, h, 0.746) * 0.04 * depth;
  finish(col, uv);
}` };


// ----- two framed A's on the same page, seen as if through a thin layer of water --------------------------------
// Options 1–5 keep one layout (an A on each side) and change the motion; 6–10 keep one gentle water motion and
// change where the two A's stand. Same brown, same pressed look as above.
const WATER = `
float aMask(vec2 q, vec2 c, float h, float ang){ vec2 pa = c + rot(ang) * (q - c); return img(pa, c, h, 0.746); }
// one A pressed into the page at c (height h, turned by ang), depth 0..1: the edge toward the light falls in shade,
// the far edge catches a little warm light
vec3 press(vec3 col, vec2 q, vec2 c, float h, float ang, float depth, vec2 lp, float L, vec3 warm){
  if (depth <= 0.001 || abs(q.x - c.x) > h * 0.5 || abs(q.y - c.y) > h * 0.62) return col;
  float e = 0.005 * h;
  vec2 gr = vec2(aMask(q + vec2(e, 0.0), c, h, ang) - aMask(q - vec2(e, 0.0), c, h, ang),
                 aMask(q + vec2(0.0, e), c, h, ang) - aMask(q - vec2(0.0, e), c, h, ang));
  e *= 2.0;
  gr += 0.6 * vec2(aMask(q + vec2(e, 0.0), c, h, ang) - aMask(q - vec2(e, 0.0), c, h, ang),
                   aMask(q + vec2(0.0, e), c, h, ang) - aMask(q - vec2(0.0, e), c, h, ang));
  float sh = dot(gr, normalize(lp - q + vec2(1e-4, 0.0)));
  float k = depth * (0.7 + 0.8 * L);
  col *= 1.0 - 0.26 * clamp(sh, 0.0, 1.0) * k;
  col += warm * 0.12 * clamp(-sh, 0.0, 1.0) * k;
  return col * (1.0 - aMask(q, c, h, ang) * 0.04 * depth);
}
// the brown page under a drifting warm light (Lavara's #3C2E25 on average)
vec3 page(vec2 p, float t, float asp, out vec2 lp, out float L, out vec3 warm){
  vec3 col = LV_BROWN * 0.93;
  col *= 1.0 + 0.016 * (vnoise(gl_FragCoord.xy * 0.45) - 0.5) + 0.012 * (fbm(p * 6.0) - 0.5);
  lp = vec2(asp * (0.5 + 0.35 * sin(t * 0.08)), 0.62 + 0.2 * sin(t * 0.11 + 1.3));
  L = exp(-dot(p - lp, p - lp) / 0.4);
  warm = mix(LV_OCHRE, LV_IVORY, 0.35);
  return col + (col * 0.1 + warm * 0.03) * L;
}
// a thin water layer: a slow two-way drift of the surface, -0.5..0.5
vec2 water(vec2 p, float t){
  return vec2(fbm(p * 2.2 + vec2(t * 0.07, -t * 0.05)), fbm(p * 2.2 + vec2(-t * 0.06, t * 0.07) + 7.3)) - 0.5;
}
// light through the water: thin bright lines of a caustic net, kept off the middle
vec3 caustic(vec3 col, vec2 q, float t, float calm, float L, vec3 warm, float a){
  float cs = cells(q * 2.6 + vec2(t * 0.015, 0.0), t * 0.32, 0.1);
  return col * (1.0 - 0.012 * a) + warm * a * 0.03 * cs * (1.0 - 0.75 * calm) * (0.5 + L);
}
`;
const W = (name, code) => ({ name, ground: '#3C2E25', ink: '#F3F2E0', tex: 'mark', body: WATER + `
void main(){ SETUP
  vec2 lp; float L; vec3 warm; vec3 col = page(p, t, asp, lp, L, warm);
${code}
  finish(col, uv);
}` });
const S2 = {};
// ---- five motions, one layout (an A on each side)
S2.w1 = W('سطح ماء', `
  vec2 q = p + water(p, t) * 0.03;
  col = press(col, q, vec2(asp * 0.12, 0.5), 1.0, 0.0, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.88, 0.5), 1.0, 0.0, 1.0, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 1.0);`);
S2.w2 = W('قطرة وتموّج', `
  float amp = 1.0;
  vec2 q = p + water(p, t) * 0.012;
  for (int k = 0; k < 2; k++) {                       // a drop falls on each A in turn; its ring spreads over the page
    float fk = float(k), ph = fract(t / 7.0 + fk * 0.5);
    vec2 c = vec2(asp * (fk < 0.5 ? 0.12 : 0.88), 0.5);
    vec2 d = p - c; float r = length(d), R = ph * 1.3;
    float ring = exp(-pow((r - R) / 0.06, 2.0)) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
    q += d / max(r, 1e-3) * ring * amp * 0.022 * sin((r - R) * 45.0);
    col += warm * amp * 0.035 * ring * (1.0 - 0.85 * calm);
  }
  col = press(col, q, vec2(asp * 0.12, 0.5), 1.0, 0.0, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.88, 0.5), 1.0, 0.0, 1.0, lp, L, warm);`);
S2.w3 = W('تنفّس متبادل', `
  vec2 q = p + water(p, t) * 0.015;
  float b = 0.5 + 0.5 * sin(t * 0.55);                // one A presses in as the other lets go
  float d1 = 0.15 + 0.85 * smoothstep(0.1, 0.9, b), d2 = 0.15 + 0.85 * smoothstep(0.1, 0.9, 1.0 - b);
  col = press(col, q, vec2(asp * 0.12, 0.5 + 0.02 * b), 1.0 * (0.97 + 0.03 * b), 0.0, d1, lp, L, warm);
  col = press(col, q, vec2(asp * 0.88, 0.5 + 0.02 * (1.0 - b)), 1.0 * (1.0 - 0.03 * b), 0.0, d2, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 0.5);`);
S2.w4 = W('طافيان', `
  vec2 q = p + water(p, t) * 0.012;
  float y1 = 0.5 + 0.045 * sin(t * 0.5), y2 = 0.5 + 0.045 * sin(t * 0.5 + 2.6);   // bobbing on the surface, out of step
  col = press(col, q, vec2(asp * 0.12 + 0.015 * sin(t * 0.31), y1), 1.0, 0.07 * sin(t * 0.43), 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.88 + 0.015 * sin(t * 0.29 + 1.0), y2), 1.0, 0.07 * sin(t * 0.43 + 2.2), 1.0, lp, L, warm);
  float band = sin(p.y * 16.0 + 3.0 * fbm(p * 1.6 + t * 0.08) - t * 0.9);            // light rocking on the surface
  col += warm * 0.018 * smoothstep(0.75, 1.0, band) * (1.0 - 0.8 * calm) * (0.4 + L);`);
S2.w5 = W('تيار', `
  float f = fbm(vec2(p.x * 1.2 - t * 0.12, p.y * 3.0));                               // the water flows across the page
  vec2 q = p + vec2(0.022 * sin(p.y * 9.0 + t * 0.8 + 5.0 * f), 0.008 * sin(p.x * 5.0 - t * 0.6 + 3.0 * f));
  col = press(col, q, vec2(asp * 0.12, 0.5), 1.0, 0.0, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.88, 0.5), 1.0, 0.0, 1.0, lp, L, warm);
  float streak = smoothstep(0.82, 1.0, sin(p.y * 22.0 + 4.0 * f + sin(p.x * 2.0 - t * 0.7) * 1.5));
  col += warm * 0.016 * streak * (1.0 - 0.8 * calm) * (0.4 + L);`);
// ---- five layouts, one gentle water motion
const WM = `  vec2 q = p + water(p, t) * 0.018;`;
S2.c1 = W('متقابلان', WM + `
  col = press(col, q, vec2(asp * 0.1, 0.47 + 0.02 * sin(t * 0.3)), 1.05, -0.16, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.9, 0.47 + 0.02 * sin(t * 0.3 + 1.5)), 1.05, 0.16, 1.0, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 0.6);`);
S2.c2 = W('قُطري', WM + `
  col = press(col, q, vec2(asp * 0.9, 0.8 + 0.02 * sin(t * 0.3)), 1.5, 0.0, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.1, 0.24 + 0.02 * sin(t * 0.3 + 2.0)), 0.62, 0.0, 1.0, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 0.6);`);
S2.c3 = W('في الزاويتين', WM + `
  col = press(col, q, vec2(asp * 0.03, 0.08 + 0.015 * sin(t * 0.3)), 1.55, 0.0, 1.0, lp, L, warm);
  col = press(col, q, vec2(asp * 0.97, 0.08 + 0.015 * sin(t * 0.3 + 1.7)), 1.55, 0.0, 1.0, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 0.6);`);
S2.c4 = W('كبير وصغير', WM + `
  col = press(col, q, vec2(asp * 0.95, 0.5 + 0.015 * sin(t * 0.25)), 2.2, 0.0, 0.7, lp, L, warm);
  col = press(col, q, vec2(asp * 0.11, 0.42 + 0.02 * sin(t * 0.3 + 1.0)), 0.72, 0.0, 1.0, lp, L, warm);
  col = caustic(col, q, t, calm, L, warm, 0.6);`);
S2.c5 = W('وانعكاسه', WM + `
  vec2 c = vec2(asp * 0.87, 0.69 + 0.012 * sin(t * 0.3)); float y0 = 0.37;          // an A and its reflection in the water below it
  col = press(col, q, c, 0.56, 0.0, 1.0, lp, L, warm);
  vec2 qr = vec2(q.x + 0.012 * sin(q.y * 40.0 - t * 1.2) * smoothstep(y0, y0 - 0.3, q.y), 2.0 * y0 - q.y);
  col = press(col, qr, c, 0.56, 0.0, 0.55, lp, L, warm);
  col += warm * 0.02 * exp(-pow((p.y - y0) / 0.006, 2.0)) * smoothstep(0.35, 0.0, abs(p.x - c.x) / asp);
  col = caustic(col, q, t, calm, L, warm, 0.6);`);
// ---- the chosen directions carried further: the two A's trade sides in turn and keep drifting, and the page moves
// the way option 2 does: drops fall on it in turn (on each A, and now and then on the sides) and their rings spread
// over the page, bending the pressed A's as they pass. No water layer over everything, no drawn drops.
const RIPPLE = `
vec2 ripple(vec2 p, vec2 a, vec2 b, float t, float asp, float calm, vec3 warm, float amp, inout vec3 col){
  vec2 q = p;
  for (int k = 0; k < 3; k++) {
    float fk = float(k), ph = fract(t / 10.0 + fk / 3.0), n = floor(t / 10.0 + fk / 3.0);
    vec2 c = k == 0 ? a : k == 1 ? b
      : vec2(asp * (h1(n, 3.0) < 0.5 ? 0.06 + 0.18 * h1(n, 4.0) : 0.76 + 0.18 * h1(n, 4.0)), 0.15 + 0.7 * h1(n, 5.0));
    vec2 d = p - c; float r = length(d), R = ph * 1.3;
    float ring = exp(-pow((r - R) / 0.06, 2.0)) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
    q += d / max(r, 1e-3) * ring * amp * 0.022 * sin((r - R) * 45.0);
    col += warm * amp * 0.035 * ring * (1.0 - 0.85 * calm);
  }
  return q;
}
`;
const WR = (name, code) => { const w = W(name, code); return { ...w, body: RIPPLE + w.body }; };
// 11 — direction 9: the large and the small A trade sides in turn
S2.duo = WR('كبير وصغير بتموّج القطرات', `
  float P = 24.0, f = fract(t / P), s = mod(floor(t / P), 2.0) < 0.5 ? 1.0 : -1.0;
  float dB = smoothstep(0.0, 0.14, f) * (1.0 - smoothstep(0.82, 0.96, f));                // pressed, held, let go: then they trade sides
  float dS = smoothstep(0.05, 0.19, f) * (1.0 - smoothstep(0.86, 1.0, f));
  vec2 bigC = vec2(asp * (0.5 + 0.45 * s) + 0.012 * sin(t * 0.15), 0.5 + 0.015 * sin(t * 0.12));
  vec2 smC = vec2(asp * (0.5 - 0.39 * s) + 0.01 * sin(t * 0.19 + 1.0), 0.42 + 0.018 * sin(t * 0.16 + 2.0) + 0.015 * (1.0 - dS));
  vec2 q = ripple(p, vec2(bigC.x - 0.25 * s, bigC.y), smC, t, asp, calm, warm, 0.3, col);   // kept very light (user)
  col = press(col, q, bigC, 2.2, 0.012 * sin(t * 0.11), 0.7 * dB, lp, L, warm);
  col = press(col, q, smC, 0.72, 0.025 * sin(t * 0.14), dS, lp, L, warm);`);
// 12 — direction 10: an A and its reflection, crossing to the other side in turn
S2.mirror = WR('وانعكاسه بتموّج القطرات', `
  float P = 16.0, f = fract(t / P), s = mod(floor(t / P), 2.0) < 0.5 ? 1.0 : -1.0;
  float dp = smoothstep(0.0, 0.14, f) * (1.0 - smoothstep(0.84, 1.0, f));
  vec2 c = vec2(asp * (0.5 + 0.37 * s) + 0.03 * sin(t * 0.2), 0.69 + 0.015 * sin(t * 0.3) + 0.03 * (1.0 - dp)); float y0 = 0.37;
  vec2 q = ripple(p, c, vec2(c.x, 2.0 * y0 - c.y + 0.1), t, asp, calm, warm, 1.0, col);
  col = press(col, q, c, 0.56, 0.03 * sin(t * 0.17), dp, lp, L, warm);
  vec2 qr = vec2(q.x + 0.012 * sin(q.y * 40.0 - t * 1.2) * smoothstep(y0, y0 - 0.3, q.y), 2.0 * y0 - q.y);
  col = press(col, qr, c, 0.56, 0.03 * sin(t * 0.17), 0.55 * dp, lp, L, warm);
  col += warm * 0.02 * dp * exp(-pow((p.y - y0) / 0.006, 2.0)) * smoothstep(0.35, 0.0, abs(p.x - c.x) / asp);`);
Object.entries(S2).forEach(([k, v], i) => { S[k] = { ...v, num: i + 1 }; });
// ------------------------------------------------------------------ the shared frame's backgrounds (not Lavara's):
// its pearl paper as it is, with one quiet movement in its brass. The middle, where the words sit, stays calmer.
const PEARL = `const vec3 PL_A = vec3(0.969, 0.953, 0.925), PL_B = vec3(0.933, 0.910, 0.863), PL_GOLD = vec3(0.690, 0.541, 0.306), PL_GLOW = vec3(0.851, 0.725, 0.498);
vec3 pearlBase(vec2 uv){ return mix(PL_A, PL_B, smoothstep(0.0, 1.0, 0.25 + uv.y * 0.35 - (uv.x - 0.5) * 0.1)); }
`;
const SP = (name, code) => ({ name, ground: '#F7F3EC', ink: '#1E1B17', shared: true, body: PEARL + `void main(){ SETUP\n` + code + `\n  finish(col, uv); }` });
S['pearl-glow'] = SP('توهج ذهبي', `
  vec3 col = pearlBase(uv); float g = 0.0;
  for (int i = 0; i < 4; i++) { float fi = float(i);
    vec2 c = vec2(asp * (0.12 + 0.76 * h1(fi, 1.0)) + sin(t * 0.045 + fi * 2.1) * 0.4, 0.15 + 0.7 * h1(fi, 2.0) + cos(t * 0.035 + fi * 1.3) * 0.2);
    float r = 0.32 + 0.22 * h1(fi, 3.0); g += exp(-dot(p - c, p - c) / (r * r)) * (0.65 + 0.35 * sin(t * 0.25 + fi * 1.7)); }
  g *= mix(1.0, 0.5, calm);
  col = mix(col, PL_GLOW, clamp(g * 0.34, 0.0, 0.5)); col += vec3(0.035, 0.022, 0.0) * g;`);
S['pearl-marble'] = SP('رخام متحرك', `
  vec2 q = p * 1.5; float tt = t * 0.022;
  vec2 w = vec2(fbm(q + vec2(tt, -tt)), fbm(q + vec2(5.2, 1.3) - tt));
  float m = fbm(q * 1.3 + 3.2 * w + vec2(tt * 1.5, 0.0));
  float v = abs(sin((q.x * 0.7 + q.y * 1.1 + m * 5.0) * 1.7)), vein = pow(1.0 - v, 22.0) + 0.45 * pow(1.0 - abs(sin((q.x * 1.3 - q.y * 0.5 + m * 6.0) * 2.3)), 30.0);
  vec3 col = mix(pearlBase(uv), PL_B * 0.98, smoothstep(0.35, 0.8, m) * 0.55);
  col = mix(col, mix(PL_GOLD, PL_GLOW, 0.6), clamp(vein, 0.0, 1.0) * mix(0.3, 0.12, calm));`);
S['pearl-smoke'] = SP('دخان ذهبي', `
  // incense smoke in gold: three slow columns rise from below the page; low down their threads run close and nearly
  // straight, higher up they curl, spread and thin out, with a soft gold body around the bright threads and open pearl
  // between the columns; the middle (the words) a touch calmer
  float tt = t * 0.035, y = uv.y;
  vec2 r = vec2(p.x * 1.3, p.y * 1.5 - tt * 2.4);
  vec2 wp = vec2(fbm(r), fbm(r + vec2(5.1, 3.3)));
  vec2 wq = vec2(fbm(r * 1.2 + 1.8 * wp + vec2(1.7, 9.2)), fbm(r * 1.2 + 1.8 * wp + vec2(8.3, 2.8)));
  float turb = 0.06 + 1.1 * y * y;
  float xx = p.x + turb * (wq.x - 0.5) * 1.5 + 0.1 * y * sin(p.y * 3.2 - tt * 5.0);
  float body = 0.0, thr = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float cx = asp * (0.15 + 0.35 * fi) + 0.12 * sin(tt * 1.6 + fi * 2.3);
    float wd = 0.05 + 0.3 * y;
    float d = (xx - cx) / wd, env = exp(-d * d);
    body += env;
    float k = cos(d * 5.0 + (wq.y - 0.5) * 7.0 + fi);
    thr += env * (smoothstep(0.9, 1.0, k) + 0.5 * smoothstep(0.97, 1.0, cos(d * 9.0 - wq.x * 5.0)));
  }
  float fade = mix(1.0, 0.55, smoothstep(0.55, 1.0, y));
  body = clamp(body, 0.0, 1.0) * fade; thr = clamp(thr, 0.0, 1.0) * fade;
  float a = 1.0 - 0.4 * calm;
  float dens = body * (0.45 + 0.55 * smoothstep(0.35, 0.75, wq.y));
  vec3 col = pearlBase(uv);
  col = mix(col, mix(PL_GLOW, PL_GOLD, smoothstep(0.3, 0.9, dens)), dens * 0.62 * a);
  col -= vec3(0.04, 0.036, 0.024) * smoothstep(0.55, 0.95, dens) * a;
  col = mix(col, vec3(0.99, 0.93, 0.76), thr * 0.85 * a);`);
S['pearl-sheen'] = SP('لمعة اللؤلؤ', `
  float n = fbm(p * 1.8 + vec2(t * 0.018, -t * 0.01));
  float band = sin((p.x * 0.9 - p.y * 0.6) * 2.2 - t * 0.11 + n * 3.0);
  vec3 irid = 0.5 + 0.5 * cos(6.2831 * (n * 0.7 + band * 0.12 + vec3(0.0, 0.33, 0.67)));
  float k = smoothstep(0.15, 1.0, band) * (1.0 - 0.55 * calm);
  vec3 col = mix(pearlBase(uv), mix(PL_A, irid, 0.2), k * 0.7);
  col = mix(col, PL_GLOW, smoothstep(0.8, 1.0, band) * 0.18);`);
S['pearl-silk'] = SP('حرير ذهبي', `
  float tt = t * 0.055;
  float f = sin(p.x * 2.1 + sin(p.y * 1.6 + tt) * 1.3 + tt) + 0.6 * sin(p.y * 2.9 - p.x * 0.8 - tt * 1.2) + 0.25 * fbm(p * 2.0 + tt);
  float h = 0.5 + 0.5 * f / 1.75, light = smoothstep(0.58, 1.0, h), shade = smoothstep(0.42, 0.0, h);
  float a = 1.0 - 0.5 * calm;
  vec3 col = pearlBase(uv) - shade * 0.06 * a;
  col = mix(col, PL_GLOW, light * 0.32 * a);`);

S.press.num = 0;   // the current one stays first, as 0

export const LAVARA_SCENES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { name: v.name, ground: v.ground, ink: v.ink, num: v.num, shared: !!v.shared }]));
// the brand images some scenes draw (relative to the page): the framed A and the wordmark
export const LAVARA_IMAGES = { mark: 'assets/lavara/lavara-monogram.svg', logo: 'assets/lavara/lavara-wordmark.svg' };
export const LAVARA_TEX = Object.fromEntries(Object.entries(S).filter(([, v]) => v.tex).map(([k, v]) => [k, LAVARA_IMAGES[v.tex]]));
export const LAVARA_SCENE_SRC = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, HEAD + v.body]));
