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

// The second set: graphic ideas built from Lavara's own identity (its colour pages, hairline frames, the framed A,
// the wordmark, the line-drawn bottles of its product film) rather than more soft atmospheres.

// pages: on each side a tall page of the palette turns slowly into the next colour; the brown middle holds the words
S.pages = { name: 'صفحات الألوان', ground: '#3C2E25', ink: '#F3F2E0', body: `
vec3 pal(float k){ k = mod(k, 5.0); return k < 1.0 ? LV_TERRA : k < 2.0 ? LV_SAGE : k < 3.0 ? LV_OCHRE : k < 4.0 ? LV_OLIVE : LV_RUST; }
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.9, LV_BROWN * 1.04, uv.y);
  float side = uv.x < 0.22 ? 0.0 : uv.x > 0.78 ? 1.0 : -1.0;
  if (side >= 0.0) {
    float ph = t * 0.045 + side * 0.5, k = floor(ph), f = fract(ph);
    float e = smoothstep(0.0, 0.6, f);
    float edge = side < 0.5 ? e : 1.0 - e;
    bool newer = side < 0.5 ? uv.y < e : uv.y > 1.0 - e;
    col = newer ? pal(k + 1.0 + side * 2.0) : pal(k + side * 2.0);
    float x0 = side < 0.5 ? 0.0 : 0.78;
    vec2 q = vec2((uv.x - x0 - 0.11) * asp, uv.y - 0.5);
    col = mix(col, LV_IVORY, hair(sdBox(q, vec2(0.11 * asp - 0.035, 0.465), 0.0), 0.8) * 0.4);
    col = mix(col, LV_IVORY, hair(uv.y - edge, 0.6) * 0.5 * step(0.002, f) * step(f, 0.6));
  }
  col = mix(col, LV_IVORY, (hair((uv.x - 0.22) * asp, 0.8) + hair((uv.x - 0.78) * asp, 0.8)) * 0.3);
  finish(col, uv);
}` };

// frames: Lavara's hairline frames nested around the words, breathing slowly, a point of light travelling round the outer one
S.frames = { name: 'الإطارات الرفيعة', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.85, LV_BROWN * 1.05, uv.y);
  vec2 q = p - vec2(asp * 0.5, 0.5);
  float acc = 0.0;
  for (int k = 0; k < 7; k++) { float fk = float(k);
    float br = 1.0 + 0.022 * sin(t * 0.35 - fk * 0.7);
    vec2 b = vec2(asp * 0.5 - 0.06 - fk * 0.055, 0.44 - fk * 0.035) * br;
    acc += hair(sdBox(q, b, 0.0), 0.8) * (0.42 - fk * 0.045);
  }
  vec2 bo = vec2(asp * 0.5 - 0.06, 0.44) * (1.0 + 0.022 * sin(t * 0.35));
  float ang = atan(q.y / bo.y, q.x / bo.x);
  float run = exp(-pow(mod(ang - t * 0.25 + 3.1416, 6.2832) - 3.1416, 2.0) * 5.0);
  col = mix(col, LV_IVORY, clamp(acc, 0.0, 1.0));
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.4) * run * hair(sdBox(q, bo, 0.0), 2.4));
  finish(col, uv);
}` };

// monogram: the framed A as a tone-on-tone wallpaper drifting slowly, a sheen passing across it
S.monogram = { name: 'نقش حرف A', ground: '#3C2E25', ink: '#F3F2E0', tex: 'mark', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.86, LV_BROWN * 1.04, uv.y);
  vec2 q = p + vec2(t * 0.012, t * 0.008);
  float s = 0.24;
  vec2 cell = floor(q / s), f = fract(q / s);
  if (mod(cell.y, 2.0) > 0.5) f.x = fract(q.x / s + 0.5);
  float a = img(f * s, vec2(0.5 * s), s * 0.62, 0.746);
  float sheen = exp(-pow((p.x + p.y * 0.6 - mod(t * 0.08, asp + 2.0) + 0.5) / 0.4, 2.0));
  col = mix(col, mix(LV_BROWN, LV_OCHRE, 0.6), a * (0.32 + 0.4 * sheen) * (1.0 - calm * 0.5));
  finish(col, uv);
}` };

// emboss: a giant framed A pressed into ivory paper, a raking light turning slowly over it
S.emboss = { name: 'حرف A بارز على الورق (فاتح)', ground: '#F3F2E0', ink: '#3C2E25', tex: 'mark', body: `
void main(){ SETUP
  vec3 col = mix(LV_PAPER, LV_IVORY, uv.y);
  col *= 0.985 + 0.02 * (vnoise(gl_FragCoord.xy * 0.35) - 0.5) + 0.02 * (fbm(p * 8.0) - 0.5);
  vec2 c = vec2(asp * 0.8, 0.46); float h = 1.25, e = 0.0035;
  float gx = img(p + vec2(e, 0.0), c, h, 0.746) - img(p - vec2(e, 0.0), c, h, 0.746);
  float gy = img(p + vec2(0.0, e), c, h, 0.746) - img(p - vec2(0.0, e), c, h, 0.746);
  vec2 L = normalize(vec2(cos(t * 0.12), 0.7 + 0.3 * sin(t * 0.12)));
  float sh = dot(vec2(gx, gy), L);
  col += vec3(0.07) * clamp(sh, 0.0, 1.0);
  col -= vec3(0.11, 0.1, 0.08) * clamp(-sh, 0.0, 1.0);
  finish(col, uv);
}` };

// bottles: the five refills drawn in ochre lines on a dark shelf, each line drawing brightening in its turn (as in the product film)
S.bottles = { name: 'رسم العبوات بالخط', ground: '#3C2E25', ink: '#F3F2E0', body: `
float bottle(vec2 q){
  float body = sdBox(q - vec2(0.0, 0.34), vec2(0.15, 0.34), 0.07);
  float neck = sdBox(q - vec2(0.0, 0.73), vec2(0.05, 0.05), 0.015);
  float collar = sdBox(q - vec2(0.0, 0.79), vec2(0.065, 0.012), 0.004);
  float pump = sdBox(q - vec2(0.0, 0.85), vec2(0.03, 0.06), 0.01);
  float head = sdBox(q - vec2(0.055, 0.93), vec2(0.085, 0.022), 0.01);
  return min(min(body, neck), min(collar, min(pump, head)));
}
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.55, LV_BROWN * 0.95, uv.y);
  col = screen(col, LV_OCHRE * 0.14 * exp(-length((p - vec2(asp * 0.5, 0.3)) * vec2(0.6, 1.4)) * 1.2));
  float H = 0.3, base = 0.07, lines = 0.0;
  for (int k = 0; k < 5; k++) { float fk = float(k);
    vec2 q = (p - vec2(asp * (0.14 + fk * 0.18), base + sin(t * 0.4 + fk * 1.3) * 0.005)) / H;
    float on = smoothstep(0.2, 0.9, sin(t * 0.22 - fk * 0.9) * 0.5 + 0.5);
    lines += hair(bottle(q) * H, 1.0) * (0.3 + 0.7 * on);
  }
  col = mix(col, mix(LV_OCHRE, LV_IVORY, 0.25), clamp(lines, 0.0, 1.0) * 0.9);
  col = mix(col, LV_IVORY, hair(p.y - base, 0.6) * smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x) * 0.3);
  finish(col, uv);
}` };

// foil: brushed ochre-gold foil, as on Lavara's gift box, with a slow gleam passing over it
S.foil = { name: 'رقائق ذهبية', ground: '#6B4F24', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 base = mix(LV_BROWN, LV_OCHRE, 0.55);
  float brushed = fbm(vec2(p.x * 2.0, p.y * 140.0));
  vec3 col = base * (0.82 + 0.28 * brushed);
  float sweep = exp(-pow((p.x - p.y * 0.8 - mod(t * 0.06, asp + 2.4) + 1.0) / 0.35, 2.0));
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.5) * sweep * (0.3 + 0.3 * brushed));
  col *= 1.0 - 0.35 * pow(length((uv - vec2(0.5)) * vec2(1.1, 1.0)), 2.0);
  col = mix(col, col * 0.78, calm * 0.45);
  finish(col, uv);
}` };

// pinstripe: fine vertical hairlines on brown, swaying slightly, a soft brightness wave moving along them
S.pinstripe = { name: 'خطوط رفيعة متموّجة', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.82, LV_BROWN * 1.05, uv.y);
  float xw = p.x + sin(p.y * 2.5 + t * 0.3) * 0.012 + sin(p.y * 7.0 - t * 0.2) * 0.004;
  float d = (fract(xw * 30.0) - 0.5) / 30.0;
  float wv = 0.5 + 0.5 * sin(p.x * 3.0 - t * 0.4 + p.y * 1.5);
  col = mix(col, mix(LV_OCHRE, LV_IVORY, 0.4), hair(d, 0.6) * (0.08 + 0.3 * wv) * (1.0 - calm * 0.6));
  finish(col, uv);
}` };

// wordmark: the LAVARA letters very large and tone-on-tone, sliding slowly along the bottom of the screen
S.wordmark = { name: 'الاسم الكبير', ground: '#3C2E25', ink: '#F3F2E0', tex: 'logo', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.84, LV_BROWN * 1.04, uv.y);
  float h = 0.5, ar = 5.18, wl = h * ar, period = wl + 0.5;
  float u = mod(p.x + t * 0.03, period);
  float a = img(vec2(u, p.y), vec2(wl * 0.5, 0.17), h, ar);
  col = mix(col, mix(LV_BROWN, LV_IVORY, 0.14), a);
  col = mix(col, LV_IVORY, hair(p.y - 0.46, 0.6) * 0.18);
  finish(col, uv);
}` };

// split: brown and terracotta divided by a slow diagonal, a hairline riding the edge
S.split = { name: 'قطري بلونين', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  float ang = 0.35 + 0.08 * sin(t * 0.07);
  vec2 n = vec2(cos(ang), sin(ang));
  float d = dot(p - vec2(asp * (0.5 + 0.18 * sin(t * 0.05)), 0.5), n);
  vec3 a = mix(LV_BROWN * 0.86, LV_BROWN * 1.04, uv.y), b = mix(LV_TERRA * 0.72, LV_TERRA * 0.92, uv.y);
  vec3 col = mix(a, b, smoothstep(-0.0015, 0.0015, d));
  col = mix(col, LV_IVORY, hair(d - 0.012, 0.6) * 0.45);
  finish(col, uv);
}` };

// rings: the seal's rings in hairlines, off to one side, with fine ticks on two of them turning opposite ways
S.rings = { name: 'حلقات الختم', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.82, LV_BROWN * 1.05, uv.y);
  vec2 q = p - vec2(asp * 0.82, 0.3); float r = length(q), a = atan(q.y, q.x);
  float acc = 0.0;
  for (int k = 0; k < 6; k++) { float fk = float(k); acc += hair(r - (0.18 + fk * 0.13), 0.7) * (0.36 - fk * 0.04); }
  float t1 = smoothstep(0.75, 0.8, fract((a + t * 0.05) / 6.2832 * 120.0)) * (1.0 - smoothstep(0.009, 0.013, abs(r - 0.44)));
  float t2 = smoothstep(0.86, 0.9, fract((a - t * 0.035) / 6.2832 * 60.0)) * (1.0 - smoothstep(0.015, 0.02, abs(r - 0.7)));
  col = mix(col, LV_IVORY, clamp(acc + (t1 + t2) * 0.22, 0.0, 1.0) * (1.0 - calm * 0.5));
  col = screen(col, LV_OCHRE * 0.12 * exp(-r * 2.0));
  finish(col, uv);
}` };

export const LAVARA_SCENES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { name: v.name, ground: v.ground, ink: v.ink }]));
// the brand images some scenes draw (relative to the page): the framed A and the wordmark
export const LAVARA_IMAGES = { mark: 'assets/lavara/lavara-monogram.svg', logo: 'assets/lavara/lavara-wordmark.svg' };
export const LAVARA_TEX = Object.fromEntries(Object.entries(S).filter(([, v]) => v.tex).map(([k, v]) => [k, LAVARA_IMAGES[v.tex]]));
export const LAVARA_SCENE_SRC = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, HEAD + v.body]));
