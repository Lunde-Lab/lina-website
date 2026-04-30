#!/usr/bin/env python3
"""Generate Lina multilingual mediator one-pager PDFs (8 languages)."""

import io
import math
import os
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

# ── Colors ───────────────────────────────────────────────────────────────────
BG       = HexColor('#F8F8F6')
PRIMARY  = HexColor('#0D6B64')
TEXT     = HexColor('#1A1E23')
TEXT_SEC = HexColor('#50565E')
BORDER   = HexColor('#DEDFE2')
WHITE    = white

# ── Page geometry ─────────────────────────────────────────────────────────────
W, H = A4          # 595.28 × 841.89 pt
M    = 22 * mm     # margin
CW   = W - 2 * M  # content width

# ── Output paths ──────────────────────────────────────────────────────────────
HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, 'assets')

OUTPUTS = {
    'en': os.path.join(ASSETS, 'lina-one-pager.pdf'),
    'nb': os.path.join(ASSETS, 'lina-one-pager-nb.pdf'),
    'sv': os.path.join(ASSETS, 'lina-one-pager-sv.pdf'),
    'da': os.path.join(ASSETS, 'lina-one-pager-da.pdf'),
    'fi': os.path.join(ASSETS, 'lina-one-pager-fi.pdf'),
    'de': os.path.join(ASSETS, 'lina-one-pager-de.pdf'),
    'nl': os.path.join(ASSETS, 'lina-one-pager-nl.pdf'),
    'fr': os.path.join(ASSETS, 'lina-one-pager-fr.pdf'),
}

# ── App store URLs ────────────────────────────────────────────────────────────
APP_STORE_URL = 'https://apps.apple.com/us/app/lina-co-parenting/id6757200671'
PLAY_URL      = 'https://play.google.com/store/apps/details?id=com.getlina.lina'

# ── Copy (all translatable strings keyed by language code) ───────────────────
COPY = {
    'en': {
        'tagline':      'A shared space for two homes',
        'card1_title':  'What is Lina?',
        'card1_body':   ('Lina is a private, structured communication space for parents who '
                         'share care of a child across two homes. It brings the practical details '
                         '— medical information, contacts, equipment lists, photos, and messages '
                         '— into one shared place that both parents can access.'),
        'card1_note':   ('Lina is not a legal tool. It does not manage custody decisions '
                         'or replace professional advice.'),
        'card2_title':  "What's included",
        'card2_bullets': [
            ('Threads',           'One topic at a time — nothing gets lost'),
            ('Messages',          'Cannot be edited or deleted — a clear record'),
            ('Shared album',      'Photos from both homes, privately stored'),
            ('Child information', 'Medical details, contacts — entered once, shared with both'),
            ('Equipment lists',   'What the child needs in each home'),
            ('Care schedule',     'A shared view of the care arrangement'),
            ('Care agreement',    'A written record of what parents have agreed to'),
        ],
        'card3_title':  'For sensitive situations',
        'card3_bullets': [
            'Blur photos or messages to reduce emotional load',
            'Mark important messages so they stay accessible',
            'Export all conversations for documentation when needed',
        ],
        'card4_title':  'Privacy',
        'card4_body':   ('Lina is GDPR-compliant. No advertising, no data sharing, no algorithm. '
                         'Data is protected through secure storage, access control, and signed links.'),
        'card5_title':  'Getting started',
        'card5_steps':  [
            'Download Lina from the App Store or Google Play',
            'Create an account with your email address',
            'Invite the other parent to connect',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'For family mediators, counselors, and family law professionals'),
    },
    'nb': {
        'tagline':      'Et felles rom for to hjem',
        'card1_title':  'Hva er Lina?',
        'card1_body':   ('Lina er et privat, strukturert kommunikasjonsverktøy for foreldre som '
                         'deler omsorgen for et barn mellom to hjem. Den samler praktisk informasjon '
                         '— medisinske opplysninger, kontakter, pakkelister, bilder og meldinger '
                         '— på étt sted som begge foreldre kan bruke.'),
        'card1_note':   ('Lina er ikke et juridisk verktøy og håndterer ikke '
                         'avgjørelser om foreldreansvar.'),
        'card2_title':  'Hva er inkludert',
        'card2_bullets': [
            ('Tråder',          'Én sak om gangen — ingenting går tapt'),
            ('Meldinger',            'Kan ikke redigeres eller slettes — en tydelig logg'),
            ('Felles album',         'Bilder fra begge hjem, lagret privat'),
            ('Barneopplysninger',    'Medisinske detaljer, kontakter — legges inn én gang, deles med begge'),
            ('Pakkelister',          'Hva barnet trenger i hvert hjem'),
            ('Omsorgsplan',          'En felles oversikt over omsorgsordningen'),
            ('Omsorgsavtale',        'Et skriftlig referat av det foreldrene har blitt enige om'),
        ],
        'card3_title':  'For krevende situasjoner',
        'card3_bullets': [
            'Uskarpgjør bilder eller meldinger for å redusere emosjonell belastning',
            'Merk viktige meldinger så de forblir lett tilgjengelige',
            'Eksporter samtaler som dokumentasjon ved behov',
        ],
        'card4_title':  'Personvern',
        'card4_body':   ('Lina er GDPR-sertifisert. Ingen reklame, ingen datadeling, ingen algoritme. '
                         'Data beskyttes gjennom sikker lagring, tilgangskontroll og signerte lenker.'),
        'card5_title':  'Kom i gang',
        'card5_steps':  [
            'Last ned Lina fra App Store eller Google Play',
            'Opprett en konto med e-postadressen din',
            'Inviter den andre forelderen til å koble seg til',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'For familiemeklere, rådgivere og familierettslige fagpersoner'),
    },
    'sv': {
        'tagline':      'En gemensam plats för två hem',
        'card1_title':  'Vad är Lina?',
        'card1_body':   ('Lina är ett privat, strukturerat kommunikationsutrymme för '
                         'föräldrar som delar omvårdnaden om ett barn mellan två hem. '
                         'Det samlar praktisk information — medicinska uppgifter, kontakter, '
                         'packlistor, bilder och meddelanden — på en gemensam plats som '
                         'båda föräldrarna kan använda.'),
        'card1_note':   ('Lina är inte ett juridiskt verktyg och hanterar inte '
                         'beslut om vårdnad.'),
        'card2_title':  'Vad ingår',
        'card2_bullets': [
            ('Trådar',          'Ett ämne i taget — ingenting försvinner'),
            ('Meddelanden',          'Kan inte redigeras eller raderas — ett tydligt underlag'),
            ('Gemensamt album',      'Bilder från båda hem, privat lagrade'),
            ('Barnuppgifter',        'Medicinska detaljer, kontakter — anges en gång, delas med båda'),
            ('Packlistor',           'Vad barnet behöver i varje hem'),
            ('Omsorgsschema',        'En gemensam översikt över omsorgsschemat'),
            ('Omsorgsavtal',         'Ett skriftligt underlag om vad föräldrarna kommit överens om'),
        ],
        'card3_title':  'För känsliga situationer',
        'card3_bullets': [
            'Sudda ut bilder eller meddelanden för att minska den känslomässiga belastningen',
            'Markera viktiga meddelanden så att de förblir tillgängliga',
            'Exportera konversationer som dokumentation vid behov',
        ],
        'card4_title':  'Integritet',
        'card4_body':   ('Lina är GDPR-anpassad. Ingen reklam, ingen datadelning, ingen algoritm. '
                         'Data skyddas genom säker lagring, åtkomstkontroll och signerade länkar.'),
        'card5_title':  'Kom igång',
        'card5_steps':  [
            'Hämta Lina från App Store eller Google Play',
            'Skapa ett konto med din e-postadress',
            'Bjud in den andra föräldern att ansluta',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'För familjemäklare, rådgivare och familjerättsliga yrkespersoner'),
    },
    'da': {
        'tagline':      'Et fælles rum til to hjem',
        'card1_title':  'Hvad er Lina?',
        'card1_body':   ('Lina er et privat, struktureret kommunikationsrum for forældre, der '
                         'deler omsorgen for et barn mellem to hjem. Det samler praktiske oplysninger '
                         '— medicinske informationer, kontakter, pakkelister, billeder og beskeder '
                         '— ét sted, som begge forældre kan benytte.'),
        'card1_note':   ('Lina er ikke et juridisk værktøj og håndterer ikke '
                         'afgørelser om forældremyndighed.'),
        'card2_title':  'Hvad er inkluderet',
        'card2_bullets': [
            ('Tråde',           'Ét emne ad gangen — intet går tabt'),
            ('Beskeder',             'Kan ikke redigeres eller slettes — en klar dokumentation'),
            ('Fælles album',    'Billeder fra begge hjem, privat gemt'),
            ('Barnoplysninger',      'Medicinske detaljer, kontakter — indtastes én gang, deles med begge'),
            ('Pakkelister',          'Hvad barnet har brug for i hvert hjem'),
            ('Omsorgsplan',          'Et fælles overblik over omsorgsordningen'),
            ('Omsorgsaftale',        'En skriftlig aftale om, hvad forældrene er nået til enighed om'),
        ],
        'card3_title':  'Til svære situationer',
        'card3_bullets': [
            'Sløring af billeder eller beskeder for at reducere den følelsesmæssige belastning',
            'Markér vigtige beskeder, så de forbliver tilgængelige',
            'Eksportér samtaler som dokumentation, når det er nødvendigt',
        ],
        'card4_title':  'Privatliv',
        'card4_body':   ('Lina er GDPR-overensstemmende. Ingen reklame, ingen datadeling, ingen algoritme. '
                         'Data beskyttes via sikker lagring, adgangskontrol og signerede links.'),
        'card5_title':  'Kom i gang',
        'card5_steps':  [
            'Download Lina fra App Store eller Google Play',
            'Opret en konto med din e-mailadresse',
            'Invitér den anden forælder til at oprette forbindelse',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'Til familiemæglere, rådgivere og familierelaterede fagpersoner'),
    },
    'fi': {
        'tagline':      'Yhteinen tila kahdelle kodille',
        'card1_title':  'Mikä on Lina?',
        'card1_body':   ('Lina on yksityinen, jäsennelty viestintätila vanhemmille, jotka '
                         'jakavat lapsen hoitovastuun kahden kodin välillä. Se kokoaa '
                         'käytännön tiedot — lääketieteelliset tiedot, '
                         'yhteystiedot, pakkaamislistat, kuvat ja viestit — yhteen paikkaan, '
                         'johon molemmilla vanhemmilla on pääsy.'),
        'card1_note':   ('Lina ei ole oikeudellinen työkalu eikä se käsittele '
                         'huoltajuuspäätöksiä.'),
        'card2_title':  'Mitä sisältyy',
        'card2_bullets': [
            ('Viestiketjut',     'Yksi aihe kerrallaan — mikään ei katoa'),
            ('Viestit',          'Niitä ei voi muokata tai poistaa — selkeä kirjaus'),
            ('Yhteinen albumi',  'Kuvat molemmista kodeista, yksityisesti tallennettuina'),
            ('Lapsen tiedot',    'Lääketieteelliset tiedot, yhteystiedot — syötetään kerran, jaetaan molemmille'),
            ('Pakkaamislistat',  'Mitä lapsi tarvitsee kummassakin kodissa'),
            ('Hoitoaikataulu',   'Yhteinen näkymä hoitojärjestelyyn'),
            ('Hoitosopimus',     'Kirjallinen muistiinpano siitä, mistä vanhemmat ovat sopineet'),
        ],
        'card3_title':  'Herkille tilanteille',
        'card3_bullets': [
            'Sumentaa kuvia tai viestejä tunnekuorman vähentämiseksi',
            'Merkitse tärkeät viestit niin, että ne pysyvät helposti saatavilla',
            'Vie kaikki keskustelut dokumentaatioksi tarvittaessa',
        ],
        'card4_title':  'Tietosuoja',
        'card4_body':   ('Lina on GDPR-yhteensopiva. Ei mainontaa, ei tietojen jakamista, ei algoritmia. '
                         'Tiedot on suojattu turvallisella tallennuksella, pääsynhallinnalla '
                         'ja allekirjoitetuilla linkeillä.'),
        'card5_title':  'Aloittaminen',
        'card5_steps':  [
            'Lataa Lina App Storesta tai Google Playsta',
            'Luo tili sähköpostiosoitteellasi',
            'Kutsu toinen vanhempi yhdistymään',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'Perhesovittelijoille, neuvonantajille ja perheoikeuden ammattilaisille'),
    },
    'de': {
        'tagline':      'Ein gemeinsamer Raum für zwei Haushalte',
        'card1_title':  'Was ist Lina?',
        'card1_body':   ('Lina ist ein privater, strukturierter Kommunikationsraum für Eltern, '
                         'die die Betreuung eines Kindes auf zwei Haushalte aufteilen. Es bündelt '
                         'praktische Informationen — medizinische Daten, Kontakte, Packlisten, '
                         'Fotos und Nachrichten — an einem gemeinsamen Ort, auf den beide '
                         'Elternteile zugreifen können.'),
        'card1_note':   ('Lina ist kein rechtliches Werkzeug und trifft keine '
                         'Sorgerechtsentscheidungen.'),
        'card2_title':  'Funktionen',
        'card2_bullets': [
            ('Threads',                  'Ein Thema auf einmal — nichts geht verloren'),
            ('Nachrichten',              'Können nicht bearbeitet oder gelöscht werden — eine klare Dokumentation'),
            ('Gemeinsames Album',        'Fotos aus beiden Haushalten, privat gespeichert'),
            ('Kindinformationen',        'Medizinische Daten, Kontakte — einmal eingegeben, mit beiden geteilt'),
            ('Packlisten',               'Was das Kind in jedem Haushalt braucht'),
            ('Betreuungsplan',           'Eine gemeinsame Übersicht der Betreuungsregelung'),
            ('Betreuungsvereinbarung',   'Ein schriftlicher Nachweis der getroffenen Absprachen'),
        ],
        'card3_title':  'Für belastende Situationen',
        'card3_bullets': [
            'Fotos oder Nachrichten unkenntlich machen, um emotionalen Stress zu reduzieren',
            'Wichtige Nachrichten markieren, damit sie leicht zugänglich bleiben',
            'Alle Gespräche bei Bedarf als Dokumentation exportieren',
        ],
        'card4_title':  'Datenschutz',
        'card4_body':   ('Lina ist DSGVO-konform. Keine Werbung, keine Datenweitergabe, kein Algorithmus. '
                         'Daten sind durch sichere Speicherung, Zugangskontrolle und signierte Links geschützt.'),
        'card5_title':  'Erste Schritte',
        'card5_steps':  [
            'Lina aus dem App Store oder Google Play herunterladen',
            'Ein Konto mit Ihrer E-Mail-Adresse erstellen',
            'Den anderen Elternteil einladen, sich zu verbinden',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'Für Familienmediatoren, Berater und Fachkräfte im Familienrecht'),
    },
    'nl': {
        'tagline':      'Een gedeelde ruimte voor twee huizen',
        'card1_title':  'Wat is Lina?',
        'card1_body':   ("Lina is een privé, gestructureerde communicatieruimte voor ouders die "
                         "de zorg voor een kind verdelen over twee huizen. Het brengt praktische "
                         "informatie — medische gegevens, contacten, paklijsten, foto’s en "
                         "berichten — samen op één plek die beide ouders kunnen raadplegen."),
        'card1_note':   ('Lina is geen juridisch instrument en neemt geen beslissingen '
                         'over het ouderlijk gezag.'),
        'card2_title':  'Wat is inbegrepen',
        'card2_bullets': [
            ('Threads',          'Één onderwerp tegelijk — niets raakt verloren'),
            ('Berichten',        'Kunnen niet worden bewerkt of verwijderd — een duidelijke vastlegging'),
            ('Gedeeld album',    "Foto’s uit beide huizen, privé opgeslagen"),
            ('Kindinformatie',   'Medische gegevens, contacten — eenmaal ingevoerd, gedeeld met beiden'),
            ('Paklijsten',       'Wat het kind nodig heeft in elk huis'),
            ('Zorgregeling',     'Een gedeeld overzicht van de zorgafspraken'),
            ('Zorgovereenkomst', 'Een schriftelijke vastlegging van wat ouders zijn overeengekomen'),
        ],
        'card3_title':  'Voor gevoelige situaties',
        'card3_bullets': [
            "Foto’s of berichten wazig maken om emotionele belasting te verminderen",
            'Belangrijke berichten markeren zodat ze bereikbaar blijven',
            'Alle gesprekken exporteren als documentatie wanneer nodig',
        ],
        'card4_title':  'Privacy',
        'card4_body':   ('Lina is AVG-conform. Geen advertenties, geen gegevensdeling, geen algoritme. '
                         'Gegevens worden beschermd via veilige opslag, toegangscontrole en ondertekende links.'),
        'card5_title':  'Aan de slag',
        'card5_steps':  [
            'Download Lina via de App Store of Google Play',
            'Maak een account aan met uw e-mailadres',
            'Nodig de andere ouder uit om verbinding te maken',
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'Voor familiemediators, adviseurs en professionals in het familierecht'),
    },
    'fr': {
        'tagline':      'Un espace partagé pour deux foyers',
        'card1_title':  'Qu’est-ce que Lina ?',
        'card1_body':   ("Lina est un espace de communication privé et structuré pour les "
                         "parents qui partagent la garde d’un enfant entre deux foyers. Il regroupe "
                         "les informations pratiques — données médicales, contacts, listes "
                         "d’affaires, photos et messages — en un seul endroit accessible aux "
                         "deux parents."),
        'card1_note':   ("Lina n’est pas un outil juridique et ne prend pas de décisions "
                         "en matière de garde."),
        'card2_title':  'Ce qui est inclus',
        'card2_bullets': [
            ('Fils de discussion',      'Un sujet à la fois — rien ne se perd'),
            ('Messages',                'Ne peuvent pas être modifiés ni supprimés — un enregistrement clair'),
            ('Album partagé',      'Photos des deux foyers, stockées en privé'),
            ("Infos sur l’enfant", 'Données médicales, contacts — saisies une fois, partagées avec les deux'),
            ("Listes d’affaires",  "Ce dont l’enfant a besoin dans chaque foyer"),
            ('Planning de garde',       'Une vue partagée des arrangements de garde'),
            ('Accord de garde',         'Un document écrit de ce que les parents ont convenu'),
        ],
        'card3_title':  'Pour les situations sensibles',
        'card3_bullets': [
            'Flouter des photos ou des messages pour réduire la charge émotionnelle',
            'Marquer les messages importants pour y accéder facilement',
            'Exporter toutes les conversations pour en garder une trace',
        ],
        'card4_title':  'Confidentialité',
        'card4_body':   ('Lina est conforme au RGPD. Aucune publicité, aucun partage de données, '
                         'aucun algorithme. Les données sont protégées par un stockage '
                         'sécurisé, un contrôle des accès et des liens signés.'),
        'card5_title':  'Premiers pas',
        'card5_steps':  [
            "Téléchargez Lina depuis l’App Store ou Google Play",
            'Créez un compte avec votre adresse e-mail',
            "Invitez l’autre parent à se connecter",
        ],
        'contact_website': 'getlina.app',
        'contact_email':   'hello@getlina.app',
        'footer_strip':    ('getlina.app  ·  hello@getlina.app  ·  '
                            'Pour les médiateurs familiaux, conseillers et professionnels du droit de la famille'),
    },
}

# ── SVG arc → cubic bezier ────────────────────────────────────────────────────
def arc_to_bezier(x1, y1, rx, ry, phi, large_arc, sweep, x2, y2):
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
        rx *= lam_sq; ry *= lam_sq
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
        curves.append((px + alpha * dpx, py + alpha * dpy,
                        qx - alpha * dqx, qy - alpha * dqy, qx, qy))
        t, px, py, dpx, dpy = t2, qx, qy, dqx, dqy
    return curves


def tokenize_path(d):
    import re
    return re.findall(
        r'[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)


def iter_path_commands(d):
    tokens = tokenize_path(d)
    i = 0
    cmd = repeating_cmd = None
    while i < len(tokens):
        tok = tokens[i]
        if tok.isalpha():
            cmd = tok; i += 1
            if cmd in ('Z', 'z'):
                yield cmd, []; continue
            repeating_cmd = {'M': 'L', 'm': 'l'}.get(cmd, cmd)
        else:
            cmd = repeating_cmd

        def consume(n):
            nonlocal i
            vals = [float(tokens[i + k]) for k in range(n)]
            i += n
            return vals

        if cmd in ('Z', 'z'):       yield cmd, []
        elif cmd in ('M','m','L','l'): yield cmd, consume(2); repeating_cmd = {'M':'L','m':'l'}.get(cmd, cmd)
        elif cmd in ('H', 'h'):     yield cmd, consume(1)
        elif cmd in ('V', 'v'):     yield cmd, consume(1)
        elif cmd in ('C', 'c'):     yield cmd, consume(6)
        elif cmd in ('S', 's'):     yield cmd, consume(4)
        elif cmd in ('Q', 'q'):     yield cmd, consume(4)
        elif cmd in ('T', 't'):     yield cmd, consume(2)
        elif cmd in ('A', 'a'):     yield cmd, consume(7)
        else:                       i += 1


def draw_svg_path(c, path_d, ox, oy, scale, svg_h):
    def tx(x, y):
        return ox + x * scale, oy + (svg_h - y) * scale

    p = c.beginPath()
    cx = cy = lx = ly = start_x = start_y = 0

    for cmd, args in iter_path_commands(path_d):
        if cmd == 'M':
            cx, cy = args[0], args[1]; start_x, start_y = cx, cy
            p.moveTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'm':
            cx += args[0]; cy += args[1]; start_x, start_y = cx, cy
            p.moveTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'L':
            cx, cy = args[0], args[1]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'l':
            cx += args[0]; cy += args[1]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'H':
            cx = args[0]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'h':
            cx += args[0]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'V':
            cy = args[0]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'v':
            cy += args[0]; p.lineTo(*tx(cx, cy)); lx, ly = cx, cy
        elif cmd == 'C':
            x1,y1,x2,y2,x,y = args
            p.curveTo(*tx(x1,y1), *tx(x2,y2), *tx(x,y)); lx,ly=x2,y2; cx,cy=x,y
        elif cmd == 'c':
            x1,y1,x2,y2,x,y = cx+args[0],cy+args[1],cx+args[2],cy+args[3],cx+args[4],cy+args[5]
            p.curveTo(*tx(x1,y1), *tx(x2,y2), *tx(x,y)); lx,ly=x2,y2; cx,cy=x,y
        elif cmd == 'S':
            rx1,ry1 = 2*cx-lx, 2*cy-ly
            x2,y2,x,y = args
            p.curveTo(*tx(rx1,ry1), *tx(x2,y2), *tx(x,y)); lx,ly=x2,y2; cx,cy=x,y
        elif cmd == 's':
            rx1,ry1 = 2*cx-lx, 2*cy-ly
            x2,y2,x,y = cx+args[0],cy+args[1],cx+args[2],cy+args[3]
            p.curveTo(*tx(rx1,ry1), *tx(x2,y2), *tx(x,y)); lx,ly=x2,y2; cx,cy=x,y
        elif cmd == 'A':
            rx,ry,phi,large,sweep,x,y = args
            for seg in arc_to_bezier(cx,cy,rx,ry,phi,int(large),int(sweep),x,y):
                p.curveTo(*tx(seg[0],seg[1]), *tx(seg[2],seg[3]), *tx(seg[4],seg[5]))
            lx,ly=cx,cy; cx,cy=x,y
        elif cmd == 'a':
            rx,ry,phi,large,sweep,dx,dy = args
            x,y = cx+dx, cy+dy
            for seg in arc_to_bezier(cx,cy,rx,ry,phi,int(large),int(sweep),x,y):
                p.curveTo(*tx(seg[0],seg[1]), *tx(seg[2],seg[3]), *tx(seg[4],seg[5]))
            lx,ly=cx,cy; cx,cy=x,y
        elif cmd in ('Z', 'z'):
            p.close(); cx,cy = start_x,start_y; lx,ly = cx,cy

    c.drawPath(p, fill=1, stroke=0)


# ── QR helpers ────────────────────────────────────────────────────────────────
def make_qr_image(url, size_pt):
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color='#0D6B64', back_color='#FFFFFF').convert('RGB')


def pil_to_reportlab(pil_img):
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    buf.seek(0)
    return buf


# ── Drawing helpers ───────────────────────────────────────────────────────────
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


# ── Font setup ────────────────────────────────────────────────────────────────
def setup_fonts():
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


# ── Logo constants ────────────────────────────────────────────────────────────
LOGO_PATH1 = ("M192.59,303.61V96.93c0-.24,0-.46,0-.69s0-.46,0-.69V89.48h-.31"
              "A96.2,96.2,0,0,0,96.39,0,96.33,96.33,0,0,0,0,96.24v152.1l.07-.11"
              "V399.87H96.33a96.26,96.26,0,0,0,96.26-96.26")
LOGO_PATH2 = ("M371.85,235.65a96.24,96.24,0,0,0-164.32,67.94"
              "A110.89,110.89,0,0,1,151.67,400h152.1a96.29,96.29,0,0,0,68.08-164.32")
LOGO_SVG_H = 400.0
LOGO_SIZE  = 36
LOGO_SCALE = LOGO_SIZE / LOGO_SVG_H


# ── PDF generator ─────────────────────────────────────────────────────────────
def generate(lang, output_path, font_reg, font_bold):
    copy = COPY[lang]

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle('Lina — Mediator One-Pager')
    c.setAuthor('Lina')
    c.setSubject('Co-parenting app one-pager for family mediators and counselors')

    # Background
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── Header ───────────────────────────────────────────────────────────────
    header_y_top = H - M
    header_h     = 52

    logo_x = M
    logo_y = header_y_top - LOGO_SIZE
    c.setFillColor(PRIMARY)
    draw_svg_path(c, LOGO_PATH1, logo_x, logo_y, LOGO_SCALE, LOGO_SVG_H)
    draw_svg_path(c, LOGO_PATH2, logo_x, logo_y, LOGO_SCALE, LOGO_SVG_H)

    title_x = logo_x + LOGO_SIZE + 10
    c.setFillColor(TEXT)
    c.setFont(font_bold, 16)
    c.drawString(title_x, header_y_top - 18, 'Lina')
    c.setFont(font_reg, 11)
    c.setFillColor(TEXT_SEC)
    c.drawString(title_x, header_y_top - 32, copy['tagline'])

    divider_y = header_y_top - header_h
    draw_horizontal_rule(c, M, divider_y, CW)

    # ── Column geometry ───────────────────────────────────────────────────────
    col_gap  = 10
    col_w    = (CW - col_gap) / 2
    left_x   = M
    right_x  = M + col_w + col_gap
    body_top = divider_y - 14

    CARD_R         = 5
    SEC_LABEL_SIZE = 7
    SEC_TITLE_SIZE = 10.5
    BODY_SIZE      = 8.5
    LINE_H         = 13
    LABEL_MB       = 6
    TITLE_MB       = 7
    CARD_PAD       = 14
    CARD_MB        = 10
    inner_w        = col_w - 2 * CARD_PAD

    # ── Inner helpers (close over c, font_*, constants) ───────────────────────
    def section_label(col_x, y, text):
        baseline = y - SEC_LABEL_SIZE
        c.setFont(font_bold, SEC_LABEL_SIZE)
        c.setFillColor(PRIMARY)
        c.drawString(col_x, baseline, text.upper())
        return baseline - LABEL_MB

    def section_title(col_x, y, text, w):
        c.setFont(font_bold, SEC_TITLE_SIZE)
        c.setFillColor(TEXT)
        words = text.split()
        line, lines = [], []
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_bold, SEC_TITLE_SIZE) <= w:
                line.append(word)
            else:
                lines.append(' '.join(line)); line = [word]
        if line:
            lines.append(' '.join(line))
        for ln in lines:
            c.drawString(col_x, y, ln); y -= SEC_TITLE_SIZE + 2
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
                y -= LINE_H - 2; line = [word]
        if line:
            c.drawString(col_x, y, ' '.join(line)); y -= LINE_H - 2
        return y

    def layout_bullet_desc(desc, lbl_w, text_w):
        """Greedy word-wrap desc inline with label then hanging.
        Returns [(chunk, x_offset_from_text_x)].
        First chunk sits at lbl_w (same line as label); subsequent at 0.
        """
        words = desc.split()
        lines_out = []
        line = []
        first = True
        avail = text_w - lbl_w
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_reg, BODY_SIZE) <= avail:
                line.append(word)
            else:
                if line:
                    lines_out.append((' '.join(line), lbl_w if first else 0))
                else:
                    # Single word too long for first slot — force it
                    lines_out.append((word, lbl_w if first else 0))
                    first = False; avail = text_w; line = []; continue
                first = False; avail = text_w; line = [word]
        if line:
            lines_out.append((' '.join(line), lbl_w if first else 0))
        return lines_out

    def bullet_item(col_x, y, label, desc, w):
        dot_x = col_x + 4; text_x = col_x + 12; text_w = w - 12
        draw_bullet_dot(c, dot_x, y)
        c.setFont(font_bold, BODY_SIZE); c.setFillColor(TEXT)
        lbl_w = c.stringWidth(label + ': ', font_bold, BODY_SIZE)
        c.drawString(text_x, y, label + ': ')
        c.setFont(font_reg, BODY_SIZE); c.setFillColor(TEXT_SEC)
        if lbl_w + c.stringWidth(desc, font_reg, BODY_SIZE) <= text_w:
            c.drawString(text_x + lbl_w, y, desc)
            return y - LINE_H
        for chunk, x_off in layout_bullet_desc(desc, lbl_w, text_w):
            c.drawString(text_x + x_off, y, chunk)
            y -= LINE_H - 2
        return y

    def simple_bullet(col_x, y, text, w):
        dot_x = col_x + 4; text_x = col_x + 12; text_w = w - 12
        draw_bullet_dot(c, dot_x, y)
        c.setFont(font_reg, BODY_SIZE); c.setFillColor(TEXT_SEC)
        words = text.split(); line = []
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_reg, BODY_SIZE) <= text_w:
                line.append(word)
            else:
                c.drawString(text_x, y, ' '.join(line)); y -= LINE_H - 2; line = [word]
        if line:
            c.drawString(text_x, y, ' '.join(line)); y -= LINE_H - 2
        return y

    def numbered_item(col_x, y, num, text, w):
        num_str = f'{num}.'; text_x = col_x + 14; text_w = w - 14
        c.setFont(font_bold, BODY_SIZE); c.setFillColor(PRIMARY)
        c.drawString(col_x, y, num_str)
        c.setFont(font_reg, BODY_SIZE); c.setFillColor(TEXT_SEC)
        words = text.split(); line = []
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font_reg, BODY_SIZE) <= text_w:
                line.append(word)
            else:
                c.drawString(text_x, y, ' '.join(line)); y -= LINE_H - 2; line = [word]
        if line:
            c.drawString(text_x, y, ' '.join(line)); y -= LINE_H - 2
        return y

    # Height-estimation helpers (same word-wrap logic, no drawing)
    def count_lines(text, font, size, width):
        words = text.split(); line = []; n = 0
        for word in words:
            test = ' '.join(line + [word])
            if c.stringWidth(test, font, size) <= width:
                line.append(word)
            else:
                n += 1; line = [word]
        return n + (1 if line else 0)

    def body_h(text, width=inner_w):
        return count_lines(text, font_reg, BODY_SIZE, width) * (LINE_H - 2)

    def bullet_item_h(label, desc):
        text_w = inner_w - 12
        lbl_w  = c.stringWidth(label + ': ', font_bold, BODY_SIZE)
        if lbl_w + c.stringWidth(desc, font_reg, BODY_SIZE) <= text_w:
            return LINE_H
        return len(layout_bullet_desc(desc, lbl_w, text_w)) * (LINE_H - 2)

    def simple_bullet_h(text):
        return count_lines(text, font_reg, BODY_SIZE, inner_w - 12) * (LINE_H - 2)

    def numbered_item_h(text):
        return count_lines(text, font_reg, BODY_SIZE, inner_w - 14) * (LINE_H - 2)

    # ═══ LEFT COLUMN ══════════════════════════════════════════════════════════

    cursor_l = body_top

    # Card 1 — What is Lina?
    cursor_l = section_label(left_x, cursor_l, copy['card1_title'])
    para_gap = 6
    h1 = body_h(copy['card1_body']) + para_gap + body_h(copy['card1_note'])
    card1_h  = CARD_PAD + h1 + CARD_PAD
    card1_y  = cursor_l - card1_h
    rounded_rect(c, left_x, card1_y, col_w, card1_h, CARD_R)
    iy = cursor_l - CARD_PAD
    iy = body_text(left_x + CARD_PAD, iy, copy['card1_body'], inner_w)
    iy -= para_gap
    body_text(left_x + CARD_PAD, iy, copy['card1_note'], inner_w)
    cursor_l = card1_y - CARD_MB

    # Card 2 — What's included
    cursor_l = section_label(left_x, cursor_l, copy['card2_title'])
    bullets   = copy['card2_bullets']
    card2_content_h = (sum(bullet_item_h(lbl, desc) for lbl, desc in bullets)
                       + 2 * (len(bullets) - 1))
    card2_h  = CARD_PAD + card2_content_h + CARD_PAD
    card2_y  = cursor_l - card2_h
    rounded_rect(c, left_x, card2_y, col_w, card2_h, CARD_R)
    fy = cursor_l - CARD_PAD
    for i, (lbl, desc) in enumerate(bullets):
        fy = bullet_item(left_x + CARD_PAD, fy, lbl, desc, inner_w)
        if i < len(bullets) - 1:
            fy -= 2
    cursor_l = card2_y - CARD_MB

    # ═══ RIGHT COLUMN ═════════════════════════════════════════════════════════

    cursor_r = body_top

    # Card 3 — For sensitive situations
    cursor_r = section_label(right_x, cursor_r, copy['card3_title'])
    items3   = copy['card3_bullets']
    card3_content_h = (sum(simple_bullet_h(item) for item in items3)
                       + 2 * (len(items3) - 1))
    card3_h  = CARD_PAD + card3_content_h + CARD_PAD
    card3_y  = cursor_r - card3_h
    rounded_rect(c, right_x, card3_y, col_w, card3_h, CARD_R)
    sy = cursor_r - CARD_PAD
    for i, item in enumerate(items3):
        sy = simple_bullet(right_x + CARD_PAD, sy, item, inner_w)
        if i < len(items3) - 1:
            sy -= 2
    cursor_r = card3_y - CARD_MB

    # Card 4 — Privacy
    cursor_r = section_label(right_x, cursor_r, copy['card4_title'])
    card4_h  = CARD_PAD + body_h(copy['card4_body']) + CARD_PAD
    card4_y  = cursor_r - card4_h
    rounded_rect(c, right_x, card4_y, col_w, card4_h, CARD_R)
    body_text(right_x + CARD_PAD, cursor_r - CARD_PAD, copy['card4_body'], inner_w)
    cursor_r = card4_y - CARD_MB

    # Card 5 — Getting started (numbered steps + QR codes)
    cursor_r = section_label(right_x, cursor_r, copy['card5_title'])
    steps        = copy['card5_steps']
    qr_size_pt   = 50
    qr_block_h   = qr_size_pt + 4 + 10    # QR + gap-to-label + label-line
    rule_block_h = 10 + 0.5 + 10          # gap + rule + gap
    steps_h      = (sum(numbered_item_h(step) for step in steps)
                    + 2 * (len(steps) - 1))
    card5_h  = CARD_PAD + steps_h + rule_block_h + qr_block_h + CARD_PAD
    card5_y  = cursor_r - card5_h
    rounded_rect(c, right_x, card5_y, col_w, card5_h, CARD_R)

    ny = cursor_r - CARD_PAD
    for i, step in enumerate(steps):
        ny = numbered_item(right_x + CARD_PAD, ny, i + 1, step, inner_w)
        if i < len(steps) - 1:
            ny -= 2

    rule_y = ny - 10
    draw_horizontal_rule(c, right_x + CARD_PAD, rule_y, inner_w)

    qr_img_y = rule_y - 10 - qr_size_pt
    buf_as = pil_to_reportlab(make_qr_image(APP_STORE_URL, qr_size_pt))
    c.drawImage(ImageReader(buf_as), right_x + CARD_PAD, qr_img_y,
                width=qr_size_pt, height=qr_size_pt, preserveAspectRatio=True)

    gp_qr_x = right_x + CARD_PAD + qr_size_pt + 14
    buf_gp = pil_to_reportlab(make_qr_image(PLAY_URL, qr_size_pt))
    c.drawImage(ImageReader(buf_gp), gp_qr_x, qr_img_y,
                width=qr_size_pt, height=qr_size_pt, preserveAspectRatio=True)

    c.setFont(font_bold, 7.5); c.setFillColor(TEXT)
    c.drawString(right_x + CARD_PAD + 5, qr_img_y - 4, 'App Store')
    c.drawString(gp_qr_x + 5, qr_img_y - 4, 'Google Play')

    cursor_r = card5_y - CARD_MB

    # ── Footer strip ──────────────────────────────────────────────────────────
    strip_h = 18
    strip_y = min(cursor_l, cursor_r) - 14 - strip_h
    c.setFillColor(PRIMARY)
    c.rect(M, strip_y, CW, strip_h, fill=1, stroke=0)
    c.setFont(font_reg, 7.5); c.setFillColor(WHITE)
    c.drawCentredString(W / 2, strip_y + 5.5, copy['footer_strip'])

    c.save()
    print(f'  {lang}: {output_path}')


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    font_reg, font_bold = setup_fonts()
    print(f'Fonts: {font_reg} / {font_bold}')
    print('Generating PDFs...')
    for lang, path in OUTPUTS.items():
        generate(lang, path, font_reg, font_bold)
    print('Done.')
