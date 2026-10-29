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

// 2 · satin: a slow drape of brown silk with a warm sheen sliding over its folds
S.satin = { name: 'ساتان — قماش حريري', ground: '#3C2E25', ink: '#F3F2E0', body: `
float fold(vec2 q, float t){ float w = fbm(q * 0.7 + vec2(t * 0.5, -t * 0.3)); return 0.5 + 0.5 * sin((q.x * 0.8 + q.y * 1.4) * 3.6 + w * 4.6 - t * 1.4); }
void main(){ SETUP
  float tt = t * 0.07; vec2 q = p * 1.5;
  float h = fold(q, tt), hx = fold(q + vec2(0.004, 0.0), tt);
  float slope = (hx - h) / 0.004;
  vec3 col = mix(LV_BROWN * 0.42, LV_BROWN * 1.3, smoothstep(0.0, 1.0, h));
  col = mix(col, mix(LV_BROWN, LV_TERRA, 0.35), smoothstep(0.7, 1.0, h) * 0.35);
  float sheen = pow(clamp(0.5 + slope * 0.05, 0.0, 1.0), 5.0);
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.35) * sheen * 0.5 * (1.0 - calm * 0.45));
  col *= 1.0 - 0.3 * pow(length((uv - vec2(0.5, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 3 · oud smoke: fine strands of incense smoke curling up through a dark room
S.smoke = { name: 'بخور — دخان العود', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.55, LV_BROWN * 1.0, uv.y);
  col = screen(col, LV_TERRA * 0.08 * exp(-length((p - vec2(asp * 0.2, 0.0)) * vec2(0.8, 1.2)) * 1.6));
  vec2 q = vec2(p.x * 1.1, p.y * 0.8 - t * 0.035);
  vec2 w = vec2(fbm(q * 1.4 + vec2(0.0, t * 0.03)), fbm(q * 1.4 + vec2(5.2, 1.3) - t * 0.02));
  float d = fbm(q * 1.8 + 2.6 * w);
  float strand = pow(1.0 - abs(2.0 * d - 1.0), 9.0);                    // thin curling ridges
  float body = smoothstep(0.5, 0.85, d);
  float rise = smoothstep(-0.1, 0.5, uv.y) * (1.0 - smoothstep(0.75, 1.1, uv.y) * 0.6);
  float k = rise * (1.0 - calm * 0.55);
  col = screen(col, LV_IVORY * (strand * 0.32 + body * 0.06) * k);
  col = screen(col, LV_OCHRE * strand * 0.12 * k);
  col *= 1.0 - 0.3 * pow(length((uv - vec2(0.5, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 4 · morning light: sun beams falling through sheer curtains, dust turning slowly inside them
S.rays = { name: 'شعاع الصباح — ضوء الستائر', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.6, LV_BROWN * 1.05, uv.y);
  vec2 src = vec2(asp * 0.92, 1.25);
  vec2 dv = p - src; float ang = atan(dv.x, -dv.y);
  float beams = fbm(vec2(ang * 7.0 + sin(t * 0.05) * 0.4, t * 0.04));
  beams = smoothstep(0.42, 0.82, beams);
  float fall = exp(-length(dv) * 0.9);
  float light = beams * fall;
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.4) * light * 0.45 * (1.0 - calm * 0.4));
  col = screen(col, LV_OCHRE * fall * 0.18);
  // dust in the light
  vec2 g = p * 26.0 + vec2(t * 0.15, -t * 0.25 + sin(t * 0.2 + p.x) * 0.5);
  vec2 ci = floor(g), f = fract(g) - 0.5; float hh = hash(ci);
  if (hh > 0.88) { float dd = length(f - (h2(ci) - 0.5) * 0.6);
    col = screen(col, LV_IVORY * (1.0 - smoothstep(0.0, 0.08, dd)) * (0.3 + 0.7 * light) * (0.5 + 0.5 * sin(t + hh * 50.0)) * 0.5); }
  col *= 1.0 - 0.28 * pow(length((uv - vec2(0.45, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 5 · ink in water: terracotta and ochre ink blooming slowly into dark water, with lit fringes
S.ink = { name: 'حبر في الماء', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.62, LV_BROWN * 1.0, uv.y);
  vec2 q = p * 1.2;
  vec2 w = vec2(fbm(q * 1.1 + vec2(t * 0.025, 0.0)), fbm(q * 1.1 + vec2(3.0, -t * 0.02)));
  float d = fbm(q * 1.4 + 2.2 * w + vec2(0.0, -t * 0.02));
  float ink = smoothstep(0.48, 0.72, d) * (1.0 - calm * 0.6);
  vec3 tone = mix(LV_TERRA, LV_RUST, smoothstep(0.55, 0.8, d));
  tone = mix(tone, LV_OCHRE, smoothstep(0.3, 0.7, w.x) * 0.4);
  col = mix(col, tone * 0.8, ink * 0.6);
  float fringe = smoothstep(0.44, 0.48, d) - smoothstep(0.48, 0.56, d);
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.4) * fringe * 0.22 * (1.0 - calm * 0.6));
  col *= 1.0 - 0.3 * pow(length((uv - vec2(0.5, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 6 · light leaks: soft amber and terracotta glows drifting across, as on warm film
S.leaks = { name: 'وهج دافئ — تسرّب الضوء', ground: '#3C2E25', ink: '#F3F2E0', body: `
float blob(vec2 p, vec2 c, float r){ return exp(-dot(p - c, p - c) / (r * r)); }
void main(){ SETUP
  vec3 col = LV_BROWN * mix(0.62, 0.95, uv.y);
  vec2 c1 = vec2(asp * (0.15 + 0.12 * sin(t * 0.05)), 0.85 + 0.1 * cos(t * 0.04));
  vec2 c2 = vec2(asp * (0.88 + 0.08 * cos(t * 0.045)), 0.2 + 0.12 * sin(t * 0.06));
  vec2 c3 = vec2(asp * (0.6 + 0.25 * sin(t * 0.03 + 1.0)), 1.05);
  col = screen(col, LV_OCHRE * blob(p, c1, 0.55) * 0.55);
  col = screen(col, LV_TERRA * blob(p, c2, 0.6) * 0.5);
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.5) * blob(p, c3, 0.4) * 0.3);
  col = screen(col, LV_RUST * blob(p, vec2(asp * 0.05, 0.1), 0.5) * 0.35);
  col *= 1.0 - 0.2 * pow(length((uv - vec2(0.5, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 7 · the room: dark wood slats with the warm cove light travelling slowly along them (the hotel room in the brand book)
S.slats = { name: 'ألواح الخشب — إضاءة الغرفة', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  float n = 34.0;
  float sx = fract(uv.x * n);
  float profile = smoothstep(0.0, 0.18, sx) * smoothstep(1.0, 0.72, sx);     // rounded slats, dark gaps
  float grain = fbm(vec2(uv.x * n * 1.0 + floor(uv.x * n) * 3.1, p.y * 2.5)) ;
  float lx = asp * 0.5 + sin(t * 0.06) * asp * 0.42;
  float L = exp(-pow((p.x - lx) / 0.55, 2.0)) * (0.35 + 0.65 * smoothstep(0.0, 1.0, uv.y));
  float cove = smoothstep(0.55, 1.0, uv.y) * 0.5 + smoothstep(0.35, 0.0, uv.y) * 0.25;
  vec3 wood = mix(LV_BROWN * 0.7, mix(LV_BROWN, LV_OCHRE, 0.45), 0.25 + 0.6 * grain);
  vec3 col = wood * (0.25 + 0.75 * profile) * (0.35 + 1.1 * (L + cove * 0.6));
  col = screen(col, LV_OCHRE * (L * 0.18 + cove * 0.1) * profile);
  col = mix(col, LV_BROWN * 0.55, calm * 0.35);
  finish(col, uv);
}` };

// 8 · emperador marble: dark brown stone with ivory and ochre veins, drifting very slowly
S.marble = { name: 'رخام إمبرادور', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec2 q = p * 1.3 + vec2(t * 0.012, 0.0);
  float w = fbm(q * 1.2 + fbm(q * 2.0) * 1.5);
  float v1 = pow(1.0 - abs(sin((q.x * 1.4 + q.y * 0.6) * 3.0 + w * 6.0)), 26.0);
  float v2 = pow(1.0 - abs(sin((q.x * 0.5 - q.y * 1.3) * 5.0 + w * 9.0 + 1.3)), 40.0);
  vec3 col = mix(LV_BROWN * 0.6, LV_BROWN * 1.1, fbm(q * 3.0));
  col = mix(col, mix(LV_BROWN, LV_TERRA, 0.3), smoothstep(0.5, 0.8, w) * 0.3);
  float k = 1.0 - calm * 0.5;
  col = screen(col, LV_IVORY * v1 * 0.32 * k);
  col = screen(col, LV_OCHRE * v2 * 0.3 * k);
  float sweep = exp(-pow((p.x - mod(t * 0.04, asp + 1.2) + 0.6) / 0.35, 2.0));       // a slow polished gleam
  col = screen(col, LV_IVORY * sweep * 0.05);
  finish(col, uv);
}` };

// 9 · candlelight: warm out-of-focus lights drifting and breathing, as in an evening suite
S.bokeh = { name: 'ضوء الشموع', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 col = LV_BROWN * mix(0.55, 0.9, uv.y);
  for (int k = 0; k < 3; k++) {
    float fk = float(k), s = 0.16 + fk * 0.09;
    vec2 g = (p + vec2(t * (0.006 + fk * 0.004), sin(t * 0.05 + fk) * 0.03)) / s;
    vec2 ci = floor(g), f = fract(g) - 0.5;
    float hh = hash(ci + fk * 7.0);
    if (hh < 0.55) continue;
    vec2 c = (h2(ci + fk) - 0.5) * 0.5;
    float r = 0.18 + 0.2 * hash(ci + 3.0);
    float d = length(f - c);
    float disc = 1.0 - smoothstep(r - 0.04 - fk * 0.03, r, d);
    float ring = smoothstep(r - 0.1, r - 0.02, d) * disc;
    float flick = 0.7 + 0.3 * sin(t * (0.6 + hh) + hh * 40.0);
    vec3 tone = mix(LV_OCHRE, LV_TERRA, hash(ci + 9.0)) * 1.3;
    col = screen(col, tone * (disc * 0.12 + ring * 0.08) * flick * (1.0 - calm * 0.6));
  }
  col *= 1.0 - 0.25 * pow(length((uv - vec2(0.5, 0.5)) * vec2(1.1, 1.0)), 2.0);
  finish(col, uv);
}` };

// 10 · still water: drops falling one by one on a dark surface, rings spreading and catching the light
S.ripples = { name: 'قطرات على ماء ساكن', ground: '#3C2E25', ink: '#F3F2E0', body: `
float H(vec2 p, float t){
  float h = 0.0;
  for (int k = 0; k < 7; k++) {
    float fk = float(k), ph = t * 0.1 + fk / 7.0, cyc = floor(ph), age = fract(ph);
    vec2 c = vec2(0.2 + 1.4 * h1(cyc, fk), 0.1 + 0.8 * h1(fk, cyc + 4.0));
    float d = length(p - c);
    h += sin(d * 34.0 - age * 22.0) * exp(-d * 1.6) * smoothstep(age * 1.1 + 0.05, age * 1.1 - 0.2, d) * (1.0 - age);
  }
  return h;
}
void main(){ SETUP
  vec3 col = mix(LV_BROWN * 0.55, LV_BROWN * 1.0, uv.y);
  vec2 q = vec2(p.x / asp * 1.8, p.y);
  float e = 0.002, h = H(q, t);
  vec2 g = vec2(H(q + vec2(e, 0.0), t) - h, H(q + vec2(0.0, e), t) - h) / e;
  float spec = pow(clamp(dot(normalize(vec3(-g * 0.03, 1.0)), normalize(vec3(-0.4, 0.6, 0.7))), 0.0, 1.0), 18.0);
  col = screen(col, mix(LV_OCHRE, LV_IVORY, 0.5) * spec * 0.5 * (1.0 - calm * 0.5));
  col = screen(col, LV_OCHRE * max(h, 0.0) * 0.16 * (1.0 - calm * 0.5));
  col = screen(col, LV_OCHRE * 0.12 * exp(-length((p - vec2(asp * 0.8, 1.0))) * 1.5));
  finish(col, uv);
}` };

// 11 · hammam: polished terracotta plaster with steam rising slowly
S.hammam = { name: 'حمّام — بخار على الطين', ground: '#6E3A26', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec3 clay = mix(mix(LV_RUST, LV_BROWN, 0.55), LV_TERRA, 0.35);
  vec3 col = mix(clay * 0.6, clay * 1.05, uv.y);
  col *= 0.95 + 0.08 * (fbm(p * 2.2 + 3.0) * 0.6 + fbm(p * 6.0) * 0.4);
  vec2 sq = vec2(p.x * 1.6, p.y * 1.1 - t * 0.055);
  float st = fbm(sq + 1.4 * vec2(fbm(p * 1.2 + vec2(0.0, -t * 0.045)), fbm(p * 1.2 + 5.0 - t * 0.025)));
  float steam = smoothstep(0.4, 0.82, st) * (1.0 - smoothstep(0.2, 1.05, uv.y) * 0.6) * (1.0 - calm * 0.4);
  col = screen(col, LV_IVORY * steam * 0.2);
  col = screen(col, mix(LV_TERRA, LV_IVORY, 0.6) * smoothstep(0.35, 0.0, uv.y) * 0.12);
  col *= 1.0 - 0.3 * pow(length((uv - vec2(0.5, 0.6)) * vec2(1.1, 1.0)), 2.2);
  finish(col, uv);
}` };

// 12 · linen: an ivory linen sheet with the soft shadow of a window and its moving curtain (Lavara on its light ground)
S.linen = { name: 'كتّان وظل النافذة (فاتح)', ground: '#F3F2E0', ink: '#3C2E25', body: `
void main(){ SETUP
  vec3 col = mix(LV_PAPER, LV_IVORY, uv.y) * 0.97;
  vec2 g = gl_FragCoord.xy / max(1.0, u_res.y / 360.0);
  float weave = (sin(g.x * 2.2) * 0.5 + 0.5) * (sin(g.y * 2.2) * 0.5 + 0.5);
  col *= 0.985 + 0.02 * weave + 0.02 * (vnoise(g * 0.08) - 0.5);
  vec2 q = p - vec2(asp * 0.62, 0.55);
  q.x += q.y * 0.35 + sin(t * 0.15 + q.y * 3.0) * 0.03;                 // the curtain sways the light
  vec2 b = abs(q) - vec2(0.55, 0.42);
  float win = 1.0 - smoothstep(-0.08, 0.06, max(b.x, b.y));
  float bars = smoothstep(0.012, 0.03, abs(q.x)) * smoothstep(0.012, 0.03, abs(q.y));
  float light = win * bars;
  col = mix(col * mix(vec3(1.0), LV_OCHRE * 1.3, 0.12) * 0.94, col * 1.03 + LV_OCHRE * 0.03, light);
  finish(col, uv);
}` };

// 13 · flow: the palette itself moving like a slow mesh gradient — brown, terracotta, ochre and olive
S.flow = { name: 'تدرّج الهوية المتحرك', ground: '#3C2E25', ink: '#F3F2E0', body: `
void main(){ SETUP
  vec2 q = p * 0.9;
  vec2 w = vec2(fbm(q + vec2(t * 0.03, 0.0)), fbm(q + vec2(4.0, -t * 0.025)));
  float a = fbm(q * 0.8 + 1.6 * w), b = fbm(q * 0.7 - 1.3 * w + 9.0);
  vec3 col = mix(LV_BROWN * 0.8, mix(LV_BROWN, LV_TERRA, 0.75), smoothstep(0.35, 0.75, a));
  col = mix(col, mix(LV_BROWN, LV_OCHRE, 0.7), smoothstep(0.5, 0.8, b) * 0.6);
  col = mix(col, mix(LV_BROWN, LV_OLIVE, 0.8), smoothstep(0.55, 0.85, 1.0 - a) * 0.45);
  col = mix(col, LV_BROWN * 0.9, calm * 0.35);
  finish(col, uv);
}` };

export const LAVARA_SCENES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { name: v.name, ground: v.ground, ink: v.ink }]));
export const LAVARA_SCENE_SRC = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, HEAD + v.body]));
