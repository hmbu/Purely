"""Bundle each app into one self-contained HTML file that opens straight from
disk: every stylesheet and script is inlined, in the original order.

    python3 dist/build.py

The three files share the browser's localStorage, so opened in the same
browser (Chrome or Edge) they behave as one hotel: an order placed in the
guest file appears in the staff file."""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = [
    ('app',   '1-guest-order.html'),
    ('staff', '2-room-service-staff.html'),
    ('admin', '3-admin.html'),
]

def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

def bundle(app_dir):
    base = os.path.join(ROOT, app_dir)
    html = read(os.path.join(base, 'index.html'))

    def css(m):
        src = os.path.normpath(os.path.join(base, m.group(1)))
        return '<style>\n/* ' + os.path.relpath(src, ROOT) + ' */\n' + read(src) + '\n</style>'

    def js(m):
        src = os.path.normpath(os.path.join(base, m.group(1)))
        code = read(src).replace('</script', '<\\/script')
        return '<script>\n/* ' + os.path.relpath(src, ROOT) + ' */\n' + code + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', css, html)
    html = re.sub(r'<script src="([^"]+\.js)"></script>', js, html)
    left = re.findall(r'(?:href|src)="(?!https?:|#|data:)[^"]+\.(?:css|js)"', html)
    if left:
        sys.exit('unbundled references left in %s: %s' % (app_dir, left))
    return html

for app_dir, out in APPS:
    html = bundle(app_dir)
    path = os.path.join(ROOT, 'dist', out)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('%-28s %7d bytes  (from %s/)' % (out, len(html.encode('utf-8')), app_dir))
