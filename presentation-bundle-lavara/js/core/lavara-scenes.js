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

// Pressed A: Lavara's background, its answer to Bundle's drifting spheres. Its framed A is pressed into the brown page
// (as in the brand book's embossed paper). A simple, slow motion: the A floats gently, like Bundle's spheres, and the
// warm light of the room passes over it, so its pressed edges catch light and shadow in turn.
S.press = { name: 'حرف A مضغوط', ground: '#3C2E25', ink: '#F3F2E0', tex: 'mark', body: `
void main(){ SETUP
  vec3 col = LV_BROWN * mix(0.86, 1.03, uv.y);
  col *= 0.99 + 0.018 * (vnoise(gl_FragCoord.xy * 0.45) - 0.5) + 0.014 * (fbm(p * 6.0) - 0.5);   // the paper's tooth
  vec2 lp = vec2(asp * (0.6 + 0.3 * sin(t * 0.045)), 0.6 + 0.2 * sin(t * 0.06 + 1.3));            // the room's light, drifting
  float L = exp(-dot(p - lp, p - lp) / 0.42);
  vec3 warm = mix(LV_OCHRE, LV_IVORY, 0.35);
  col = mix(col, col * 1.16 + warm * 0.05, L);
  // the A floats: a slow rise and fall, a slight sway and breath
  vec2 c = vec2(asp * 0.82 + 0.025 * sin(t * 0.07), 0.47 + 0.035 * sin(t * 0.11));
  float h = 1.1 * (1.0 + 0.02 * sin(t * 0.05));
  vec2 pa = c + rot(0.025 * sin(t * 0.06)) * (p - c);
  float e = 0.0055;
  vec2 gr = vec2(img(pa + vec2(e, 0.0), c, h, 0.746) - img(pa - vec2(e, 0.0), c, h, 0.746),
                 img(pa + vec2(0.0, e), c, h, 0.746) - img(pa - vec2(0.0, e), c, h, 0.746));
  e = 0.011;
  gr += 0.6 * vec2(img(pa + vec2(e, 0.0), c, h, 0.746) - img(pa - vec2(e, 0.0), c, h, 0.746),
                   img(pa + vec2(0.0, e), c, h, 0.746) - img(pa - vec2(0.0, e), c, h, 0.746));
  vec2 ld = normalize(lp - p + vec2(1e-4, 0.0));
  float sh = dot(gr, ld);                                     // pressed in: the edge toward the light falls in shadow
  float k = 0.55 + 0.9 * L;
  col *= 1.0 - 0.2 * clamp(sh, 0.0, 1.0) * k;
  col += warm * 0.09 * clamp(-sh, 0.0, 1.0) * k;
  col *= 1.0 - img(pa, c, h, 0.746) * 0.035;
  col *= 1.0 - 0.22 * pow(length((uv - vec2(0.5, 0.52)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

export const LAVARA_SCENES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { name: v.name, ground: v.ground, ink: v.ink }]));
// the brand images some scenes draw (relative to the page): the framed A and the wordmark
export const LAVARA_IMAGES = { mark: 'assets/lavara/lavara-monogram.svg', logo: 'assets/lavara/lavara-wordmark.svg' };
export const LAVARA_TEX = Object.fromEntries(Object.entries(S).filter(([, v]) => v.tex).map(([k, v]) => [k, LAVARA_IMAGES[v.tex]]));
export const LAVARA_SCENE_SRC = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, HEAD + v.body]));
