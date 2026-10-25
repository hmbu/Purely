#!/usr/bin/env python3
"""Build a single self-contained presentation file (opens on any device, no launcher needed).

    python3 tools/build_single.py [--esbuild PATH] [--max-width 1920] [--quality 74]

Requires Python 3 + Pillow, and esbuild (npx esbuild works). Output: dist/presentation-standalone.html
Everything is embedded: content.json, CSS, GSAP, code, fonts in use, logos and images (resized).
Videos are not embedded (too large) — video slides show their placeholder.
"""
import argparse, base64, io, json, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--esbuild', default='npx esbuild')
ap.add_argument('--max-width', type=int, default=1920)
ap.add_argument('--quality', type=int, default=74)
a = ap.parse_args()

def rd(p, mode='r'):
    with open(os.path.join(ROOT, p), mode) as f: return f.read()

def data_uri(path):
    full = os.path.join(ROOT, path)
    ext = os.path.splitext(path)[1].lower()
    if ext == '.svg':
        return 'data:image/svg+xml;base64,' + base64.b64encode(rd(path, 'rb')).decode()
    if ext == '.woff2':
        return 'data:font/woff2;base64,' + base64.b64encode(rd(path, 'rb')).decode()
    if ext == '.png':  # logos: keep transparency (CSS masks need the alpha channel)
        im = Image.open(full).convert('RGBA')
        if im.width > a.max_width: im = im.resize((a.max_width, round(im.height * a.max_width / im.width)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
        return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
    if ext in ('.jpg', '.jpeg', '.webp'):
        im = Image.open(full).convert('RGB')
        if im.width > a.max_width: im = im.resize((a.max_width, round(im.height * a.max_width / im.width)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'JPEG', quality=a.quality, optimize=True, progressive=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    return None  # videos and others are dropped

content = json.loads(rd('content.json'))
# keep only the font families/weights in use (global + per-project overrides) + Medium for eyebrows
used = {}
def use(t):
    if t and t.get('font'): used.setdefault(t['font'], set()).add(str(t.get('weight') or 400))
ty = content['settings']['typography']; use(ty.get('title')); use(ty.get('body'))
used.setdefault(ty['body']['font'], set()).add('500')
for p in content['projects']:
    for r in ('title', 'body'): use((p.get('brand', {}).get('typography') or {}).get(r))
content['fonts'] = [{**f, 'files': {w: u for w, u in f['files'].items() if w in used.get(f['id'], set())}} for f in content['fonts'] if f['id'] in used]

cache = {}
def walk(v):
    if isinstance(v, dict): return {k: walk(x) for k, x in v.items()}
    if isinstance(v, list): return [walk(x) for x in v]
    if isinstance(v, str) and re.match(r'^assets/.+\.(svg|jpe?g|png|webp|woff2|mp4|webm|mov|m4v)$', v, re.I):
        if v not in cache: cache[v] = data_uri(v) or ''
        return cache[v]
    return v
content = walk(content)
content['settings'].setdefault('motion', {})['textureScale'] = 0.4

js = subprocess.run(f'{a.esbuild} js/presentation.js --bundle --format=iife --minify --target=es2020', shell=True, cwd=ROOT, capture_output=True, text=True)
if js.returncode: sys.exit(js.stderr)
css = rd('css/show.css')
gsap = rd('assets/vendor/gsap.min.js')
html = rd('presentation.html')
html = html.replace('<link rel="stylesheet" href="css/show.css">', f'<style>{css}</style>')
html = html.replace('<script src="assets/vendor/gsap.min.js"></script>', f'<script>{gsap}</script>')
html = html.replace('<script type="module" src="js/presentation.js"></script>',
    '<script>window.__BXL_CONTENT__=' + json.dumps(content, ensure_ascii=False).replace('</', '<\\/') + ';</script>\n<script>' + js.stdout.replace('</script', '<\\/script') + '</script>')
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="theme-color" content="#15120F">')
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'presentation-standalone.html')
with open(out, 'w') as f: f.write(html)
print(out, f'{os.path.getsize(out) / 1e6:.1f} MB', 'fonts:', {k: sorted(v) for k, v in used.items()})
