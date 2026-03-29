#!/usr/bin/env python3
"""Generate Lina professional info sheet PDF for UK family mediators."""

import io
import math
import os
import sys
import qrcode
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ── Colors ──────────────────────────────────────────────────────────────────
BG        = HexColor('#F8F8F6')
PRIMARY   = HexColor('#0D6B64')
TEXT      = HexColor('#1A1E23')
TEXT_SEC  = HexColor('#50565E')
BORDER    = HexColor('#DEDFE2')
WHITE     = white

# ── Page geometry ────────────────────────────────────────────────────────────
W, H = A4          # 595.28 × 841.89 pt
M    = 22 * mm     # margin
CW   = W - 2 * M  # content width

# ── Output paths ─────────────────────────────────────────────────────────────
HERE    = os.path.dirname(os.path.abspath(__file__))
ROOT    = os.path.dirname(HERE)
OUT1    = os.path.join(ROOT, 'assets', 'downloads', 'lina-info-sheet.pdf')
OUT2    = '/mnt/user-data/outputs/lina-info-sheet.pdf'


# ── SVG arc → cubic bezier ───────────────────────────────────────────────────
def arc_to_bezier(x1, y1, rx, ry, phi, large_arc, sweep, x2, y2):
    """Convert SVG arc to list of cubic bezier segments (each: x1,y1,x2,y2,x,y)."""
    if x1 == x2 and y1 == y2:
        return []
    if rx == 0 or ry == 0:
        return []
    phi_r = math.radians(phi)
    cos_phi, sin_phi = math.cos(phi_r), math.sin(phi_r)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p =  cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy
    rx, ry = abs(rx), abs(ry)
    x1p_sq, y1p_sq = x1p * x1p, y1p * y1p
    rx_sq, ry_sq = rx * rx, ry * ry
    lam = x1p_sq / rx_sq + y1p_sq / ry_sq
    if lam > 1:
        lam_sq = math.sqrt(lam)
        rx *= lam_sq
        ry *= lam_sq
        rx_sq, ry_sq = rx * rx, ry * ry
    num = max(0, rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq)
    den = rx_sq * y1p_sq + ry_sq * x1p_sq
    sq = math.sqrt(num / den) if den else 0
    if large_arc == sweep:
        sq = -sq
    cxp =  sq * rx * y1p / ry
    cyp = -sq * ry * x1p / rx
    cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2
    cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2

    def angle(ux, uy, vx, vy):
        n = math.sqrt(ux*ux + uy*uy) * math.sqrt(vx*vx + vy*vy)
        if n == 0:
            return 0
        c = max(-1, min(1, (ux*vx + uy*vy) / n))
        a = math.acos(c)
        return -a if (ux*vy - uy*vx) < 0 else a

    theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dtheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry,
                   (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not sweep and dtheta > 0:
        dtheta -= 2 * math.pi
    elif sweep and dtheta < 0:
        dtheta += 2 * math.pi

    # Split into ≤90° segments
    n_segs = max(1, math.ceil(abs(dtheta) / (math.pi / 2)))
    dt = dtheta / n_segs
    alpha = math.sin(dt) * (math.sqrt(4 + 3 * math.tan(dt / 2) ** 2) - 1) / 3

    curves = []
    t = theta1
    px = cx + cos_phi * rx * math.cos(t) - sin_phi * ry * math.sin(t)
    py = cy + sin_phi * rx * math.cos(t) + cos_phi * ry * math.sin(t)
    dpx = -cos_phi * rx * math.sin(t) - sin_phi * ry * math.cos(t)
    dpy = -sin_phi * rx * math.sin(t) + cos_phi * ry * math.cos(t)

    for _ in range(n_segs):
        t2 = t + dt
        qx = cx + cos_phi * rx * math.cos(t2) - sin_phi * ry * math.sin(t2)
        qy = cy + sin_phi * rx * math.cos(t2) + cos_phi * ry * math.sin(t2)
        dqx = -cos_phi * rx * math.sin(t2) - sin_phi * ry * math.cos(t2)
        dqy = -sin_phi * rx * math.sin(t2) + cos_phi * ry * math.cos(t2)
        curves.append((
            px + alpha * dpx, py + alpha * dpy,
            qx - alpha * dqx, qy - alpha * dqy,
            qx, qy
        ))
        t, px, py, dpx, dpy = t2, qx, qy, dqx, dqy
    return curves


# ── SVG path parser ──────────────────────────────────────────────────────────
def parse_path(d):
    """Yield (cmd, [args]) from SVG path data string."""
    import re
    tokens = re.findall(
        r'[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?',
        d
    )
    it = iter(tokens)
    cmd = None
    def nxt():
        return float(next(it))
    try:
        while True:
            tok = next(it)
            if tok.isalpha():
                cmd = tok
            else:
                # implicit repeat — push back by prepending
                tokens.insert(0, tok)  # won't work with iter; handle below
                break
            if cmd in ('Z', 'z'):
                yield cmd, []
            elif cmd in ('M', 'm', 'L', 'l'):
                yield cmd, [nxt(), nxt()]
                # subsequent pairs are implicit L/l
                if cmd == 'M': cmd = 'L'
                if cmd == 'm': cmd = 'l'
            elif cmd in ('H', 'h'):
                yield cmd, [nxt()]
            elif cmd in ('V', 'v'):
                yield cmd, [nxt()]
            elif cmd in ('C', 'c'):
                yield cmd, [nxt(), nxt(), nxt(), nxt(), nxt(), nxt()]
            elif cmd in ('S', 's'):
                yield cmd, [nxt(), nxt(), nxt(), nxt()]
            elif cmd in ('A', 'a'):
                yield cmd, [nxt(), nxt(), nxt(), nxt(), nxt(), nxt(), nxt()]
    except StopIteration:
        pass


def tokenize_path(d):
    """Return flat token list from path data."""
    import re
    return re.findall(
        r'[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?',
        d
    )


def iter_path_commands(d):
    """Yield (cmd, args_list) properly handling implicit repetition."""
    tokens = tokenize_path(d)
    i = 0
    cmd = None
    repeating_cmd = None

    while i < len(tokens):
        tok = tokens[i]
        if tok.isalpha():
            cmd = tok
            i += 1
            if cmd in ('Z', 'z'):
                yield cmd, []
                continue
            if cmd == 'M': repeating_cmd = 'L'
            elif cmd == 'm': repeating_cmd = 'l'
            else: repeating_cmd = cmd
        else:
            cmd = repeating_cmd

        def consume(n):
            nonlocal i
            vals = [float(tokens[i + k]) for k in range(n)]
            i += n
            return vals

        if cmd in ('Z', 'z'):
            yield cmd, []
        elif cmd in ('M', 'm', 'L', 'l'):
            yield cmd, consume(2)
            if cmd == 'M': repeating_cmd = 'L'
            elif cmd == 'm': repeating_cmd = 'l'
        elif cmd in ('H', 'h'):
            yield cmd, consume(1)
        elif cmd in ('V', 'v'):
            yield cmd, consume(1)
        elif cmd in ('C', 'c'):
            yield cmd, consume(6)
        elif cmd in ('S', 's'):
            yield cmd, consume(4)
        elif cmd in ('Q', 'q'):
            yield cmd, consume(4)
        elif cmd in ('T', 't'):
            yield cmd, consume(2)
        elif cmd in ('A', 'a'):
            yield cmd, consume(7)
        else:
            i += 1


def draw_svg_path(c, path_d, ox, oy, scale, svg_h):
    """Draw an SVG path onto reportlab canvas with coordinate transform.

    SVG: y-down, origin top-left
    PDF: y-up, origin bottom-left
    Transform: pdf_x = ox + svg_x * scale
               pdf_y = oy + (svg_h - svg_y) * scale
    """
    def tx(x, y):
        return ox + x * scale, oy + (svg_h - y) * scale

    p = c.beginPath()
    cx, cy = 0, 0  # current point
    lx, ly = 0, 0  # last control point for S/s
    start_x, start_y = 0, 0

    for cmd, args in iter_path_commands(path_d):
        if cmd == 'M':
            cx, cy = args[0], args[1]
            start_x, start_y = cx, cy
            px, py = tx(cx, cy)
            p.moveTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'm':
            cx += args[0]; cy += args[1]
            start_x, start_y = cx, cy
            px, py = tx(cx, cy)
            p.moveTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'L':
            cx, cy = args[0], args[1]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'l':
            cx += args[0]; cy += args[1]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'H':
            cx = args[0]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'h':
            cx += args[0]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'V':
            cy = args[0]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'v':
            cy += args[0]
            px, py = tx(cx, cy)
            p.lineTo(px, py)
            lx, ly = cx, cy
        elif cmd == 'C':
            x1,y1,x2,y2,x,y = args
            p.curveTo(*tx(x1,y1), *tx(x2,y2), *tx(x,y))
            lx,ly = x2,y2; cx,cy = x,y
        elif cmd == 'c':
            x1,y1,x2,y2,x,y = cx+args[0],cy+args[1],cx+args[2],cy+args[3],cx+args[4],cy+args[5]
            p.curveTo(*tx(x1,y1), *tx(x2,y2), *tx(x,y))
            lx,ly = x2,y2; cx,cy = x,y
        elif cmd == 'S':
            rx1 = 2*cx - lx; ry1 = 2*cy - ly
            x2,y2,x,y = args
            p.curveTo(*tx(rx1,ry1), *tx(x2,y2), *tx(x,y))
            lx,ly = x2,y2; cx,cy = x,y
        elif cmd == 's':
            rx1 = 2*cx - lx; ry1 = 2*cy - ly
            x2,y2,x,y = cx+args[0],cy+args[1],cx+args[2],cy+args[3]
            p.curveTo(*tx(rx1,ry1), *tx(x2,y2), *tx(x,y))
            lx,ly = x2,y2; cx,cy = x,y
        elif cmd == 'A':
            rx,ry,phi,large,sweep,x,y = args
            segs = arc_to_bezier(cx,cy,rx,ry,phi,int(large),int(sweep),x,y)
            for bx1,by1,bx2,by2,bx,by in segs:
                p.curveTo(*tx(bx1,by1), *tx(bx2,by2), *tx(bx,by))
            lx,ly = cx,cy; cx,cy = x,y
        elif cmd == 'a':
            rx,ry,phi,large,sweep,dx,dy = args
            x,y = cx+dx, cy+dy
            segs = arc_to_bezier(cx,cy,rx,ry,phi,int(large),int(sweep),x,y)
            for bx1,by1,bx2,by2,bx,by in segs:
                p.curveTo(*tx(bx1,by1), *tx(bx2,by2), *tx(bx,by))
            lx,ly = cx,cy; cx,cy = x,y
        elif cmd in ('Z', 'z'):
            p.close()
            cx, cy = start_x, start_y
            lx, ly = cx, cy

    c.drawPath(p, fill=1, stroke=0)


# ── QR code generator ────────────────────────────────────────────────────────
def make_qr_image(url, size_pt):
    """Return a PIL Image of a QR code for the given URL."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#0D6B64', back_color='#FFFFFF')
    return img.convert('RGB')


def pil_to_reportlab(pil_img):
    """Convert PIL image to a reportlab-compatible image buffer."""
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    buf.seek(0)
    return buf


# ── Drawing helpers ──────────────────────────────────────────────────────────
def rounded_rect(c, x, y, w, h, r, fill_color=WHITE, stroke_color=BORDER, stroke_width=0.5):
    c.setFillColor(fill_color)
    c.setStrokeColor(stroke_color)
    c.setLineWidth(stroke_width)
    p = c.beginPath()
    p.moveTo(x + r, y)
    p.lineTo(x + w - r, y)
    p.arcTo(x + w - 2*r, y, x + w, y + 2*r, startAng=-90, extent=90)
    p.lineTo(x + w, y + h - r)
    p.arcTo(x + w - 2*r, y + h - 2*r, x + w, y + h, startAng=0, extent=90)
    p.lineTo(x + r, y + h)
    p.arcTo(x, y + h - 2*r, x + 2*r, y + h, startAng=90, extent=90)
    p.lineTo(x, y + r)
    p.arcTo(x, y, x + 2*r, y + 2*r, startAng=180, extent=90)
    p.close()
    c.drawPath(p, fill=1, stroke=1)


def draw_horizontal_rule(c, x, y, w, color=BORDER):
    c.setStrokeColor(color)
    c.setLineWidth(0.5)
    c.line(x, y, x + w, y)


def draw_bullet_dot(c, x, y, color=PRIMARY):
    c.setFillColor(color)
    c.circle(x, y + 1.5, 2, fill=1, stroke=0)


# ── Font setup ───────────────────────────────────────────────────────────────
def setup_fonts():
    """Register Inter if available, else fall back to Helvetica."""
    # Try system Inter font
    inter_paths = [
        '/System/Library/Fonts/Supplemental/Inter.ttc',
        '/Library/Fonts/Inter.ttf',
        os.path.expanduser('~/Library/Fonts/Inter-Regular.ttf'),
    ]
    for path in inter_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('Inter', path))
                pdfmetrics.registerFont(TTFont('Inter-Bold', path))
                return 'Inter', 'Inter-Bold'
            except Exception:
                pass
    return 'Helvetica', 'Helvetica-Bold'


# ── Main PDF generation ──────────────────────────────────────────────────────
def generate(output_path):
    font_reg, font_bold = setup_fonts()

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle('Lina — Information for Professionals')
    c.setAuthor('Lina')
    c.setSubject('Co-parenting app information sheet for family mediators')

    # ── Background ──
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── SVG logo data ──
    LOGO_PATH1 = ("M192.59,303.61V96.93c0-.24,0-.46,0-.69s0-.46,0-.69V89.48h-.31"
                  "A96.2,96.2,0,0,0,96.39,0,96.33,96.33,0,0,0,0,96.24v152.1l.07-.11"
                  "V399.87H96.33a96.26,96.26,0,0,0,96.26-96.26")
    LOGO_PATH2 = ("M371.85,235.65a96.24,96.24,0,0,0-164.32,67.94"
                  "A110.89,110.89,0,0,1,151.67,400h152.1a96.29,96.29,0,0,0,68.08-164.32")

    LOGO_SVG_H = 400.0
    LOGO_SIZE  = 36  # pt rendered size
    LOGO_SCALE = LOGO_SIZE / LOGO_SVG_H

    # ── Header ──────────────────────────────────────────────────────────────
    header_y_top = H - M
    header_h     = 52

    # Logo — drawn at top-left of header area
    logo_x = M
    logo_y = header_y_top - LOGO_SIZE  # baseline of logo area

    c.setFillColor(PRIMARY)
    draw_svg_path(c, LOGO_PATH1, logo_x, logo_y, LOGO_SCALE, LOGO_SVG_H)
    draw_svg_path(c, LOGO_PATH2, logo_x, logo_y, LOGO_SCALE, LOGO_SVG_H)

    # Title
    title_x = logo_x + LOGO_SIZE + 10
    c.setFillColor(TEXT)
    c.setFont(font_bold, 16)
    c.drawString(title_x, header_y_top - 18, 'Lina')
    c.setFont(font_reg, 11)
    c.setFillColor(TEXT_SEC)
    c.drawString(title_x, header_y_top - 32, 'A co-parenting tool you can recommend')

    # Header divider
    divider_y = header_y_top - header_h
    draw_horizontal_rule(c, M, divider_y, CW)

    # ── Layout: two columns ──────────────────────────────────────────────────
    col_gap   = 10
    col_w     = (CW - col_gap) / 2
    left_x    = M
    right_x   = M + col_w + col_gap

    body_top = divider_y - 14
    cursor_l = body_top   # left column cursor (y, moving down)
    cursor_r = body_top   # right column cursor

    CARD_R    = 5         # border radius
    SEC_LABEL_SIZE = 7
    SEC_TITLE_SIZE = 10.5
    BODY_SIZE      = 8.5
    LINE_H         = 13   # line height for body text
    LABEL_MB       = 3    # margin below section label
    TITLE_MB       = 7    # margin below section title
    CARD_PAD       = 11   # card inner padding
    CARD_MB        = 8    # margin below card

    def section_label(col_x, y, text):
        c.setFont(font_bold, SEC_LABEL_SIZE)
        c.setFillColor(PRIMARY)
        c.drawString(col_x, y, text.upper())
        return y - SEC_LABEL_SIZE - LABEL_MB

    def section_title(col_x, y, text, w):
        c.setFont(font_bold, SEC_TITLE_SIZE)
        c.setFillColor(TEXT)
        # simple word wrap
        words = text.split()
        line, lines = [], []
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_bold, SEC_TITLE_SIZE) <= w:
                line.append(word)
            else:
                lines.append(' '.join(line))
                line = [word]
        if line: lines.append(' '.join(line))
        for ln in lines:
            c.drawString(col_x, y, ln)
            y -= SEC_TITLE_SIZE + 2
        return y - TITLE_MB + 2

    def body_text(col_x, y, text, w, color=TEXT_SEC, size=BODY_SIZE):
        c.setFont(font_reg, size)
        c.setFillColor(color)
        words = text.split()
        line = []
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_reg, size) <= w:
                line.append(word)
            else:
                c.drawString(col_x, y, ' '.join(line))
                y -= LINE_H - 2
                line = [word]
        if line:
            c.drawString(col_x, y, ' '.join(line))
            y -= LINE_H - 2
        return y

    def bullet_item(col_x, y, label, desc, w, label_color=TEXT):
        """Draw a bullet point with bold label and description."""
        dot_x = col_x + 4
        text_x = col_x + 12
        text_w = w - 12
        draw_bullet_dot(c, dot_x, y)
        # Bold label
        c.setFont(font_bold, BODY_SIZE)
        c.setFillColor(label_color)
        lbl_w = c.stringWidth(label + ': ', font_bold, BODY_SIZE)
        c.drawString(text_x, y, label + ': ')
        # Regular description on same line if it fits
        c.setFont(font_reg, BODY_SIZE)
        c.setFillColor(TEXT_SEC)
        full = label + ': ' + desc
        if c.stringWidth(full, font_reg, BODY_SIZE) <= text_w + lbl_w:
            c.drawString(text_x + lbl_w, y, desc)
            return y - LINE_H
        else:
            # Wrap desc
            words = desc.split()
            line = []
            first = True
            y -= LINE_H
            for word in words:
                test = ' '.join(line + [word])
                avail = text_w if not first else text_w - lbl_w
                if c.stringWidth(test, font_reg, BODY_SIZE) <= text_w:
                    line.append(word)
                else:
                    c.drawString(text_x, y, ' '.join(line))
                    y -= LINE_H - 2
                    line = [word]
                    first = False
            if line:
                c.drawString(text_x, y, ' '.join(line))
                y -= LINE_H - 2
            return y

    def simple_bullet(col_x, y, text, w):
        """Simple bullet without bold label."""
        dot_x = col_x + 4
        text_x = col_x + 12
        text_w = w - 12
        draw_bullet_dot(c, dot_x, y)
        c.setFont(font_reg, BODY_SIZE)
        c.setFillColor(TEXT_SEC)
        words = text.split()
        line = []
        first_line = True
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_reg, BODY_SIZE) <= text_w:
                line.append(word)
            else:
                c.drawString(text_x, y, ' '.join(line))
                y -= LINE_H - 2
                line = [word]
                first_line = False
        if line:
            c.drawString(text_x, y, ' '.join(line))
            y -= LINE_H - 2
        return y

    # ═══════════════════════════════════════════════════════════════════════
    # LEFT COLUMN
    # ═══════════════════════════════════════════════════════════════════════

    # ── Section 1: What is Lina? ────────────────────────────────────────────
    y = cursor_l
    y = section_label(left_x, y, 'What is Lina?')

    intro_text = ('Lina is a private, structured communication space for parents who '
                  'share care of a child across two homes. It brings the practical details '
                  '— medical information, contacts, equipment lists, photos, and messages '
                  '— into one shared place that both parents can access.')

    # Estimate card height
    intro_lines = 5
    card1_h = CARD_PAD + intro_lines * (LINE_H - 1) + CARD_PAD
    card1_y = y - card1_h
    rounded_rect(c, left_x, card1_y, col_w, card1_h, CARD_R)
    iy = y - CARD_PAD
    iy = body_text(left_x + CARD_PAD, iy, intro_text, col_w - 2 * CARD_PAD, color=TEXT_SEC, size=BODY_SIZE)
    cursor_l = card1_y - CARD_MB

    # ── Section 2: Key features ─────────────────────────────────────────────
    y = cursor_l
    y = section_label(left_x, y, 'Key features')

    features = [
        ('Threads',            'One topic at a time — nothing gets lost'),
        ('Messages',           'Cannot be edited or deleted — a clear record'),
        ('Shared album',       'Photos from both homes, privately stored'),
        ('Child information',  'Medical details, contacts — entered once, shared with both'),
        ('Equipment lists',    'What the child needs in each home'),
        ('Care schedule',      'A shared view of the care arrangement'),
    ]

    # Estimate card height for features
    feat_h_est = CARD_PAD + len(features) * (LINE_H + 1) + CARD_PAD
    feat_card_y = y - feat_h_est - 4
    rounded_rect(c, left_x, feat_card_y, col_w, feat_h_est + 4, CARD_R)

    fy = y - CARD_PAD
    for i, (lbl, desc) in enumerate(features):
        fy = bullet_item(left_x + CARD_PAD, fy, lbl, desc, col_w - 2 * CARD_PAD)
        if i < len(features) - 1:
            fy -= 2  # small gap between items

    cursor_l = feat_card_y - CARD_MB

    # ═══════════════════════════════════════════════════════════════════════
    # RIGHT COLUMN
    # ═══════════════════════════════════════════════════════════════════════

    # ── Section 3: Designed for sensitive situations ─────────────────────────
    y = cursor_r
    y = section_label(right_x, y, 'Designed for sensitive situations')

    sensitive_items = [
        'Blur photos or messages to reduce emotional load',
        'Mark important messages so they stay accessible',
        'Export all conversations for documentation when needed',
    ]

    sens_h_est = CARD_PAD + len(sensitive_items) * (LINE_H + 2) + CARD_PAD
    sens_card_y = y - sens_h_est
    rounded_rect(c, right_x, sens_card_y, col_w, sens_h_est, CARD_R)

    sy = y - CARD_PAD
    for item in sensitive_items:
        sy = simple_bullet(right_x + CARD_PAD, sy, item, col_w - 2 * CARD_PAD)
        sy -= 2

    cursor_r = sens_card_y - CARD_MB

    # ── Section 4: Privacy and data protection ───────────────────────────────
    y = cursor_r
    y = section_label(right_x, y, 'Privacy and data protection')

    privacy_text = ('Lina is GDPR-compliant. No advertising, no data sharing, no algorithm. '
                    "Parents' data is protected through secure storage, access control, and "
                    'signed links. Read the full privacy policy at getlina.app/privacy.')

    priv_lines = 5
    priv_h = CARD_PAD + priv_lines * (LINE_H - 1) + CARD_PAD
    priv_card_y = y - priv_h
    rounded_rect(c, right_x, priv_card_y, col_w, priv_h, CARD_R)
    py_cur = y - CARD_PAD
    body_text(right_x + CARD_PAD, py_cur, privacy_text, col_w - 2 * CARD_PAD, color=TEXT_SEC)
    cursor_r = priv_card_y - CARD_MB

    # ── Section 5: Download ─────────────────────────────────────────────────
    # Full-width at bottom
    footer_top = min(cursor_l, cursor_r) - 4

    y = footer_top
    y = section_label(left_x, y, 'Download and contact')

    APP_STORE_URL  = 'https://apps.apple.com/us/app/lina-co-parenting/id6757200671'
    PLAY_URL       = 'https://play.google.com/store/apps/details?id=com.getlina.lina'

    qr_size_pt = 58  # QR code rendered size in points

    # Estimate footer card height
    footer_h = CARD_PAD + qr_size_pt + 4 + 28 + CARD_PAD
    footer_card_y = y - footer_h
    rounded_rect(c, left_x, footer_card_y, CW, footer_h, CARD_R)

    # QR codes
    qr_as  = make_qr_image(APP_STORE_URL, qr_size_pt)
    qr_gp  = make_qr_image(PLAY_URL, qr_size_pt)
    buf_as = pil_to_reportlab(qr_as)
    buf_gp = pil_to_reportlab(qr_gp)

    qr_y = y - CARD_PAD - qr_size_pt

    # App Store QR
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(buf_as), left_x + CARD_PAD, qr_y, width=qr_size_pt, height=qr_size_pt,
                preserveAspectRatio=True)
    c.setFont(font_bold, 7.5)
    c.setFillColor(TEXT)
    c.drawString(left_x + CARD_PAD, qr_y - 10, 'App Store')
    c.setFont(font_reg, 6.5)
    c.setFillColor(TEXT_SEC)
    c.drawString(left_x + CARD_PAD, qr_y - 19, 'apps.apple.com/us/app/lina-co-parenting/id6757200671')

    # Google Play QR
    gp_qr_x = left_x + CARD_PAD + qr_size_pt + 14
    c.drawImage(ImageReader(buf_gp), gp_qr_x, qr_y, width=qr_size_pt, height=qr_size_pt,
                preserveAspectRatio=True)
    c.setFont(font_bold, 7.5)
    c.setFillColor(TEXT)
    c.drawString(gp_qr_x, qr_y - 10, 'Google Play')
    c.setFont(font_reg, 6.5)
    c.setFillColor(TEXT_SEC)
    c.drawString(gp_qr_x, qr_y - 19, 'play.google.com/store/apps/details?id=com.getlina.lina')

    # Contact info block on the right side of footer
    info_x = left_x + CARD_PAD + qr_size_pt * 2 + 14 + 18
    info_y = y - CARD_PAD - 2

    def info_row(label, value, iy):
        c.setFont(font_bold, 8)
        c.setFillColor(TEXT)
        lw = c.stringWidth(label + '  ', font_bold, 8)
        c.drawString(info_x, iy, label)
        c.setFont(font_reg, 8)
        c.setFillColor(TEXT_SEC)
        c.drawString(info_x + lw, iy, value)
        return iy - 13

    info_y = info_row('Website:', 'getlina.app', info_y)
    info_y = info_row('Email:', 'hello@getlina.app', info_y)

    # ── Footer strip ─────────────────────────────────────────────────────────
    strip_h = 18
    strip_y = footer_card_y - strip_h - 4
    c.setFillColor(PRIMARY)
    # Draw rounded bottom strip
    c.rect(M, strip_y, CW, strip_h, fill=1, stroke=0)
    c.setFont(font_reg, 7.5)
    c.setFillColor(WHITE)
    c.drawCentredString(W / 2, strip_y + 5.5,
                        'getlina.app  ·  hello@getlina.app  ·  For family mediators, solicitors, and co-parenting professionals')

    c.save()
    print(f'PDF saved: {output_path}')


if __name__ == '__main__':
    generate(OUT1)
    # Also save to /mnt/user-data/outputs/ if possible
    try:
        os.makedirs(os.path.dirname(OUT2), exist_ok=True)
        generate(OUT2)
    except Exception as e:
        print(f'Could not write to {OUT2}: {e}')
