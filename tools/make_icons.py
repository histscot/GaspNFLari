"""Regenerates every web and Android icon from assets/app-logo.png.  Needs Pillow:  python3 tools/make_icons.py"""
import glob, os
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda *a: os.path.join(ROOT, *a)
NAVY = (11, 15, 23, 255)
WHITE = (255, 255, 255, 255)

src = Image.open(p('assets', 'app-logo.png')).convert('RGB')
# make the white around the shield transparent (the white inside the shield stays)
work = src.copy()
KEY = (255, 0, 255)
for corner in [(0, 0), (src.width - 1, 0), (0, src.height - 1), (src.width - 1, src.height - 1)]:
    ImageDraw.floodfill(work, corner, KEY, thresh=60)
mask = Image.new('L', src.size, 255)
mask.putdata([0 if px == KEY else 255 for px in work.getdata()])
mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
shield = src.convert('RGBA'); shield.putalpha(mask)
shield = shield.crop(mask.point(lambda v: 255 if v > 128 else 0).getbbox())

def place(size, frac, bg, w=None):
    """shield centred on a canvas, its height = frac * the shorter side"""
    cw, ch = (w or size), size
    canvas = Image.new('RGBA', (cw, ch), bg)
    h = round(min(cw, ch) * frac); sw = round(shield.width * h / shield.height)
    s = shield.resize((sw, h), Image.LANCZOS)
    canvas.alpha_composite(s, ((cw - sw) // 2, (ch - h) // 2))
    return canvas

def save(img, *path, opaque=False):
    os.makedirs(os.path.dirname(p(*path)), exist_ok=True)
    (img.convert('RGB') if opaque else img).save(p(*path), optimize=True)

save(place(192, .96, (0, 0, 0, 0)), 'www', 'icons', 'icon-192.png')
save(place(512, .96, (0, 0, 0, 0)), 'www', 'icons', 'icon-512.png')
save(place(64, 1.0, (0, 0, 0, 0)), 'www', 'icons', 'favicon-64.png')
# maskable and iPhone icons get cropped by the system, so keep the shield inside the safe zone on white
save(place(192, .68, WHITE), 'www', 'icons', 'maskable-192.png', opaque=True)
save(place(512, .68, WHITE), 'www', 'icons', 'maskable-512.png', opaque=True)
save(place(180, .84, WHITE), 'www', 'icons', 'apple-touch-icon.png', opaque=True)

res = ('android', 'app', 'src', 'main', 'res')
for dens, k in dict(mdpi=1, hdpi=1.5, xhdpi=2, xxhdpi=3, xxxhdpi=4).items():
    legacy, adaptive = round(48 * k), round(108 * k)
    sq = place(legacy, .82, WHITE)
    m = Image.new('L', (legacy * 4, legacy * 4), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, legacy * 4 - 1, legacy * 4 - 1], legacy * 4 // 6, fill=255)
    sq.putalpha(m.resize((legacy, legacy), Image.LANCZOS))
    save(sq, *res, f'mipmap-{dens}', 'ic_launcher.png')
    rnd = place(legacy, .70, WHITE)
    m = Image.new('L', (legacy * 4, legacy * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, legacy * 4 - 1, legacy * 4 - 1], fill=255)
    rnd.putalpha(m.resize((legacy, legacy), Image.LANCZOS))
    save(rnd, *res, f'mipmap-{dens}', 'ic_launcher_round.png')
    save(place(adaptive, .54, (0, 0, 0, 0)), *res, f'mipmap-{dens}', 'ic_launcher_foreground.png')
for f in glob.glob(p(*res, 'drawable*', 'splash.png')):
    w, h = Image.open(f).size
    Image.alpha_composite(Image.new('RGBA', (w, h), NAVY), place(h, .5, NAVY, w)).convert('RGB').save(f, optimize=True)
with open(p(*res, 'values', 'ic_launcher_background.xml'), 'w') as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n')
print('icons written')
