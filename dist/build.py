"""Build the testable versions of the three apps.

    python3 dist/build.py

Writes to dist/:
  1-guest-order.html, 2-room-service-staff.html, 3-admin.html
      each app as one self-contained file (every stylesheet and script inlined)
  room-store-all-in-one.html
      ONE file with a main page that opens all three. Each app runs in its own
      srcdoc iframe, so their globals (App, Views, I18N) and stylesheets never
      collide, while all three share the page's localStorage: an order placed
      in the guest frame fires a storage event in the staff frame and appears
      there live. A side-by-side mode shows the guest and room service at once.
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
APPS = [
    ('guest', 'app',   '1-guest-order.html'),
    ('staff', 'staff', '2-room-service-staff.html'),
    ('admin', 'admin', '3-admin.html'),
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

def write(name, html):
    with open(os.path.join(DIST, name), 'w', encoding='utf-8') as f:
        f.write(html)
    print('%-30s %8d bytes' % (name, len(html.encode('utf-8'))))

def main():
    bundles = {}
    for key, app_dir, out in APPS:
        bundles[key] = bundle(app_dir)
        write(out, bundles[key])

    shell = read(os.path.join(DIST, 'all-in-one.template.html'))
    payload = ',\n'.join(
        '  %s: "%s"' % (k, base64.b64encode(bundles[k].encode('utf-8')).decode('ascii'))
        for k, _, _ in APPS)
    if '/*__APPS__*/' not in shell:
        sys.exit('template is missing the /*__APPS__*/ marker')
    write('room-store-all-in-one.html', shell.replace('/*__APPS__*/', payload))

if __name__ == '__main__':
    main()
