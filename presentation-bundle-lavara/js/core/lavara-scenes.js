// Lavara scenes: full-screen moving backgrounds for the opening screen, the hub and the section transitions.
// Each brings its own ground and ink (the text colour on top), uses only Lavara's palette (lavara-brand.pdf) and keeps
// the middle of the screen calm for the words. Ideas from luxury spa and fragrance motion: pool caustics, satin,
// incense smoke, light through curtains, ink in water, light leaks, marble, candle bokeh, rain on still water.
// The same sources run in the background gallery page, so what is chosen there is exactly what the show draws.

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
float sdBox(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float hair(float d, float w){ float px = 1.0 / u_res.y; return 1.0 - smoothstep(w * px, (w + 1.2) * px, abs(d)); }   // a hairline w px wide
float img(vec2 p, vec2 c, float h, float ar){       // the brand image (mask) in a box: centre c, height h, width/height ar
  vec2 q = (p - c) / vec2(h * ar, h) + 0.5; if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return 0.0; return texture(u_tex, q).a; }
#define SETUP vec2 uv = gl_FragCoord.xy / u_res; float asp = u_res.x / u_res.y; vec2 p = vec2(uv.x * asp, uv.y); float t = u_time; float calm = calmAt(p, asp);
`;

const S = {};

// 1 · the bath at dusk: brown stone, ripples of light through bath water, a few faint soap bubbles
S.spa = { name: 'سبا غامق — ضوء الماء', ground: '#3C2E25', ink: '#F3F2E0', body: `
vec3 filmTint(float th){ float x = fract(th);
  vec3 c = mix(LV_OCHRE, LV_TERRA, smoothstep(0.0, 0.33, x)); c = mix(c, LV_SAGE, smoothstep(0.33, 0.66, x)); return mix(c, LV_OCHRE, smoothstep(0.66, 1.0, x)); }
void bubble(inout vec3 col, vec2 d, float r, float k, float id, float t){
  float l = length(d); float aa = 1.5 / (u_res.y * r);
  float cov = 1.0 - smoothstep(1.0 - aa, 1.0 + aa * 0.5, l); if (cov <= 0.0 || k <= 0.0) return;
  float lc = min(l, 1.0), z = sqrt(max(0.0, 1.0 - lc * lc));
  float film = pow(smoothstep(0.35, 1.0, lc), 2.4);
  float a = t * 0.15 + id; vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
  vec3 tint = mix(filmTint(fbm(q * 1.8 + id) * 1.4 - d.y * 0.45 + t * 0.03), LV_IVORY, 0.35);
  vec2 rr = 2.0 * z * d;
  float win = 1.0 - smoothstep(0.0, 0.06, length(max(abs(rr - vec2(-0.45, 0.55)) - vec2(0.14, 0.09), 0.0)));
  float kk = cov * k;
  col = screen(col, tint * film * 0.22 * kk);
  col = screen(col, LV_IVORY * pow(smoothstep(0.88, 1.0, lc), 3.0) * 0.14 * kk);
  col = screen(col, vec3(1.0, 0.98, 0.93) * win * 0.3 * kk);
}
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.72, LV_BROWN * 1.06, uv.y);
  col *= 0.98 + 0.04 * (fbm(vec2(p.x * 0.9, p.y * 7.0) + vec2(fbm(p * 1.5) * 1.2, 0.0)) - 0.5);
  float sun = exp(-length((p - vec2(asp * 0.9, 1.1)) * vec2(0.75, 1.0)) * 1.5);
  vec2 cw = p * 3.4 + vec2(fbm(p * 1.6 + t * 0.03), fbm(p * 1.6 - t * 0.03 + 7.0));
  float c = pow(cells(cw, t * 0.22, 0.085) * 0.6 + cells(cw * 1.7 + 3.0, t * 0.3, 0.085) * 0.4, 1.3);
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.55) * c * 0.17 * (0.45 + 0.55 * smoothstep(0.0, 0.9, sun * 1.6)));
  col = screen(col, LV_OCHRE * sun * 0.2);
  float n = 9.0, w = asp / n, ci = floor(p.x / w);
  for (int j = -1; j <= 1; j++) {
    float i = ci + float(j), id = i + 41.0; if (h1(id, 9.0) < 0.5) continue;
    float r = mix(0.018, 0.034, h1(id, 1.0));
    float y = fract(h1(id, 3.0) + t * 0.022 * (0.7 + 0.6 * h1(id, 2.0)) / 1.24) * 1.24 - 0.12;
    float x = (i + 0.5) * w + (h1(id, 4.0) - 0.5) * w * 0.4 + sin(t * (0.12 + 0.12 * h1(id, 5.0)) + id * 3.1) * w * 0.3;
    bubble(col, (p - vec2(x, y)) / r, r, smoothstep(-0.1, 0.1, y) * (1.0 - smoothstep(0.9, 1.05, y)) * (1.0 - calmAt(vec2(x, y), asp) * 0.6), id, t);
  }
  col *= 1.0 - 0.25 * pow(length((uv - vec2(0.5, 0.55)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// Pressed A: Lavara's answer to Bundle's floating spheres. Bundle's background is its own motif drifting on its own
// colour; Lavara's is its framed A pressed into the page (as in the brand book's embossed paper), on one of its page
// colours, with the warm light of a hotel room passing slowly over it. One material, one light, nothing else.
const PRESS = (ground, light, strength) => `
void main(){ SETUP
  vec3 g = ${ground};
  vec3 col = g * mix(0.86, 1.03, uv.y);
  col *= 0.99 + 0.018 * (vnoise(gl_FragCoord.xy * 0.45) - 0.5) + 0.014 * (fbm(p * 6.0) - 0.5);   // the paper's tooth
  vec2 lp = vec2(asp * (0.6 + 0.3 * sin(t * 0.045)), 0.6 + 0.2 * sin(t * 0.06 + 1.3));            // the room's light, drifting
  float L = exp(-dot(p - lp, p - lp) / 0.42);
  col = mix(col, col * 1.16 + ${light} * 0.05, L);
  vec2 c = vec2(asp * 0.82, 0.47); float h = 1.1;
  float e = 0.0055;
  vec2 gr = vec2(img(p + vec2(e, 0.0), c, h, 0.746) - img(p - vec2(e, 0.0), c, h, 0.746),
                 img(p + vec2(0.0, e), c, h, 0.746) - img(p - vec2(0.0, e), c, h, 0.746));
  e = 0.011;
  gr += 0.6 * vec2(img(p + vec2(e, 0.0), c, h, 0.746) - img(p - vec2(e, 0.0), c, h, 0.746),
                   img(p + vec2(0.0, e), c, h, 0.746) - img(p - vec2(0.0, e), c, h, 0.746));
  vec2 ld = normalize(lp - p + vec2(1e-4, 0.0));
  float sh = dot(gr, ld);                                     // pressed in: the edge toward the light falls in shadow
  float k = ${strength} * (0.55 + 0.9 * L);
  col *= 1.0 - 0.2 * clamp(sh, 0.0, 1.0) * k;
  col += ${light} * 0.09 * clamp(-sh, 0.0, 1.0) * k;
  col *= 1.0 - img(p, c, h, 0.746) * 0.035;
  col *= 1.0 - 0.22 * pow(length((uv - vec2(0.5, 0.52)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}`;
const WARM = 'mix(LV_OCHRE, LV_IVORY, 0.35)';
S.press = { name: 'حرف A مضغوط — البني', ground: '#3C2E25', ink: '#F3F2E0', tex: 'mark', body: PRESS('LV_BROWN', WARM, '1.0') };
S['press-terra'] = { name: 'حرف A مضغوط — التيراكوتا', ground: '#AD6243', ink: '#F3F2E0', tex: 'mark', body: PRESS('LV_TERRA * 0.86', WARM, '0.9') };
S['press-olive'] = { name: 'حرف A مضغوط — الزيتي', ground: '#5B634A', ink: '#F3F2E0', tex: 'mark', body: PRESS('LV_OLIVE', WARM, '0.95') };
S['press-ochre'] = { name: 'حرف A مضغوط — الأوكر', ground: '#926A23', ink: '#F3F2E0', tex: 'mark', body: PRESS('LV_OCHRE * 0.92', WARM, '0.9') };
S['press-paper'] = { name: 'حرف A مضغوط — الورق العاجي', ground: '#F3F2E0', ink: '#3C2E25', tex: 'mark', body: PRESS('mix(LV_PAPER, LV_IVORY, 0.5)', 'LV_OCHRE', '0.8') };

export const LAVARA_SCENES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { name: v.name, ground: v.ground, ink: v.ink }]));
// the brand images some scenes draw (relative to the page): the framed A and the wordmark
export const LAVARA_IMAGES = { mark: 'assets/lavara/lavara-monogram.svg', logo: 'assets/lavara/lavara-wordmark.svg' };
export const LAVARA_TEX = Object.fromEntries(Object.entries(S).filter(([, v]) => v.tex).map(([k, v]) => [k, LAVARA_IMAGES[v.tex]]));
export const LAVARA_SCENE_SRC = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, HEAD + v.body]));
