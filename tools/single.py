# Builds dist/chess3.html: the whole game in one file (works offline, can be shared or opened from Files).
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
for name in ['js/rules.js', 'js/ui.js']:
    html = html.replace(f'<script src="{name}"></script>', '<script>\n' + (root / name).read_text() + '</script>')
html = re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>\n', '', html)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'chess3.html').write_text(html)
print('dist/chess3.html', len(html), 'bytes')
