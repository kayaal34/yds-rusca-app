# Uygulama ikonlarını üretir: orman yeşili zemin, ince halka, içinde ince çizgi dört yapraklı yonca, altında "YDS".
# Yonca yolları src/Logo.tsx ile aynıdır. Çalıştır: python scripts/make-icons.py  (Pillow gerekir)
import math
import re
from PIL import Image, ImageDraw, ImageFont

GREEN = (47, 74, 62, 255)
STONE = (232, 236, 231, 255)
FONT = 'node_modules/@expo-google-fonts/inter/300Light/Inter_300Light.ttf'
SS = 4  # kenarlar yumuşak olsun diye büyük çizip küçültülür

LEAF = 'M16 15.2 C12.6 13 9.4 10.9 9.4 7.7 A3.3 3.3 0 0 1 16 6.9 A3.3 3.3 0 0 1 22.6 7.7 C22.6 10.9 19.4 13 16 15.2 Z'
STEM = 'M16 25.9 C16.3 28.1 17.3 29.9 19.6 31.5'
ANGLES = [-45, 45, 135, 225]


def arc_points(p0, rx, ry, large, sweep, p1, n=24):
    # SVG uç nokta biçimindeki yayı merkez biçimine çevirir (döndürmesiz yay)
    (x1, y1), (x2, y2) = p0, p1
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    lam = dx * dx / rx / rx + dy * dy / ry / ry
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx
    den = rx * rx * dy * dy + ry * ry * dx * dx
    k = math.sqrt(max(0, num / den)) * (-1 if large == sweep else 1)
    cx_, cy_ = k * rx * dy / ry, -k * ry * dx / rx
    cx, cy = cx_ + (x1 + x2) / 2, cy_ + (y1 + y2) / 2
    a1 = math.atan2((dy - cy_) / ry, (dx - cx_) / rx)
    a2 = math.atan2((-dy - cy_) / ry, (-dx - cx_) / rx)
    da = a2 - a1
    if sweep and da < 0:
        da += 2 * math.pi
    if not sweep and da > 0:
        da -= 2 * math.pi
    return [(cx + rx * math.cos(a1 + da * t / n), cy + ry * math.sin(a1 + da * t / n)) for t in range(1, n + 1)]


def path_points(d, n=24):
    tok = re.findall(r'[MCAZ]|-?\d*\.?\d+', d)
    pts, i, cur, start = [], 0, (0, 0), (0, 0)
    while i < len(tok):
        c = tok[i]; i += 1
        if c == 'M':
            cur = start = (float(tok[i]), float(tok[i + 1])); i += 2; pts.append(cur)
        elif c == 'C':
            p1 = (float(tok[i]), float(tok[i + 1])); p2 = (float(tok[i + 2]), float(tok[i + 3])); p3 = (float(tok[i + 4]), float(tok[i + 5])); i += 6
            for t in range(1, n + 1):
                t /= n; u = 1 - t
                pts.append((u**3 * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                            u**3 * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
            cur = p3
        elif c == 'A':
            rx, ry, _, large, sweep, x, y = map(float, tok[i:i + 7]); i += 7
            pts += arc_points(cur, rx, ry, int(large), int(sweep), (x, y), n)
            cur = (x, y)
        elif c == 'Z':
            pts.append(start); cur = start
    return pts


def rot(pts, deg, c=16):
    a = math.radians(deg)
    return [(c + (x - c) * math.cos(a) - (y - c) * math.sin(a), c + (x - c) * math.sin(a) + (y - c) * math.cos(a)) for x, y in pts]


def stroke(draw, pts, w, color):
    draw.line(pts, fill=color, width=w, joint='curve')
    for x, y in (pts[0], pts[-1]):
        draw.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=color)


def mark(draw, cx, cy, r, w, color):
    # Halka: Logo.tsx'te 104 birimlik kutuda r=42, çizgi 3. Yonca halka çapının 0,6'sı kadar bir kutuda, çizgi 1,5/32.
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    box = r / 42 * 104 * 0.6
    k = box / 32
    lw = max(SS, round(1.5 * k))
    for a in ANGLES:
        stroke(draw, [(cx + (x - 16) * k, cy + (y - 16) * k) for x, y in rot(path_points(LEAF), a)], lw, color)
    stroke(draw, [(cx + (x - 16) * k, cy + (y - 16) * k) for x, y in path_points(STEM)], lw, color)


def render(size, bg, fg, scale=1.0, text=True):
    S = size * SS
    img = Image.new('RGBA', (S, S), bg)
    d = ImageDraw.Draw(img)
    r = int(S * 0.22 * scale)
    cy = int(S * (0.43 if text else 0.5))
    mark(d, S // 2, cy, r, max(SS, int(S * 0.012 * scale)), fg)
    if text:
        f = ImageFont.truetype(FONT, int(S * 0.09 * scale))
        label = 'Y D S'
        tw = d.textlength(label, font=f)
        d.text(((S - tw) / 2, cy + r + S * 0.07 * scale), label, font=f, fill=fg)
    return img.resize((size, size), Image.LANCZOS)


render(1024, GREEN, STONE).save('assets/icon.png')
render(48, GREEN, STONE, text=False).save('assets/favicon.png')
# Android uyarlanabilir ikon: ön plan güvenli alanda (ortadaki ~%66) kalsın diye küçültülür
render(1024, (0, 0, 0, 0), STONE, scale=0.66).save('assets/android-icon-foreground.png')
Image.new('RGBA', (1024, 1024), GREEN).save('assets/android-icon-background.png')
render(1024, (0, 0, 0, 0), (255, 255, 255, 255), scale=0.66, text=False).save('assets/android-icon-monochrome.png')
render(512, (0, 0, 0, 0), STONE, scale=1.2, text=False).save('assets/splash-icon.png')
print('ikonlar yazildi')
