#!/usr/bin/env python3
"""
Builds the Milestones artboards.

The card is written once here and rendered into four artboards, so the phone,
the desktop and the dark theme cannot disagree about a single hairline. The
tokens are the ones in `src/styles.css`; where a value below is not a token it
is an optical adjustment on top of the ramp, exactly as the shipped code does.
"""

from pathlib import Path

HERE = Path(__file__).parent

FONTS = ('https://fonts.googleapis.com/css2?'
         'family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600'
         '&family=IBM+Plex+Mono:wght@400;500'
         '&display=swap')

LIGHT = """
      --paper:oklch(0.968 0.008 85);
      --surface:oklch(0.995 0.003 85);
      --sunk:oklch(0.944 0.010 85);
      --line:oklch(0.886 0.010 80);
      --line-strong:oklch(0.800 0.012 80);
      --ink:oklch(0.255 0.014 65);
      --ink-muted:oklch(0.510 0.014 68);
      --ink-faint:oklch(0.655 0.012 72);
      --leaf:oklch(0.455 0.098 152);
      --leaf-tint:oklch(0.944 0.026 152);
      --water:oklch(0.455 0.104 236);
      --water-tint:oklch(0.944 0.028 236);
      --on-accent:oklch(0.985 0.004 85);
"""

DARK = """
      --paper:oklch(0.190 0.008 80);
      --surface:oklch(0.238 0.009 80);
      --sunk:oklch(0.155 0.008 80);
      --line:oklch(0.322 0.010 80);
      --line-strong:oklch(0.405 0.012 80);
      --ink:oklch(0.945 0.008 85);
      --ink-muted:oklch(0.735 0.012 80);
      --ink-faint:oklch(0.575 0.012 78);
      --leaf:oklch(0.760 0.110 152);
      --leaf-tint:oklch(0.300 0.040 152);
      --water:oklch(0.760 0.105 236);
      --water-tint:oklch(0.305 0.042 236);
      --on-accent:oklch(0.180 0.010 80);
"""

UI = "system-ui,-apple-system,'Segoe UI',sans-serif"
SERIF = "'Newsreader',Georgia,'Times New Roman',serif"
MONO = "'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace"


def page(body: str, theme: str = LIGHT) -> str:
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="{FONTS}">
  <style>
    :root{{{theme}}}
    body{{margin:0;background:var(--paper);color:var(--ink);
      font-family:{UI};font-size:16px;line-height:24px;
      -webkit-font-smoothing:antialiased}}
    .mono{{font-family:{MONO};font-variant-numeric:tabular-nums}}
    .serif{{font-family:{SERIF}}}
    .label{{font-size:12px;line-height:16px;font-weight:600;
      letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-faint)}}
    .card{{border:1px solid var(--line);border-radius:16px;background:var(--surface)}}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""


# --- the card ---------------------------------------------------------------

def milestone(date: str, title: str, detail: str = '', last: bool = False) -> str:
    """One dated row. The date leads and is the spine the facts hang off — the
    card is a chronicle, not a second run of label/value rows like Care."""
    edge = '' if last else 'border-bottom:1px solid var(--line);'
    under = (f'<div style="font-size:13px;line-height:18px;'
             f'color:var(--ink-faint)">{detail}</div>') if detail else ''
    return (
        f'<div style="display:flex;align-items:baseline;gap:12px;padding:12px 0;{edge}">'
        f'<span class="mono" style="width:80px;flex-shrink:0;text-align:right;'
        f'font-size:12px;line-height:16px;color:var(--ink-muted)">{date}</span>'
        f'<div style="min-width:0;flex:1">'
        f'<div style="font-size:15px;line-height:20px;font-weight:500">{title}</div>'
        f'{under}</div></div>'
    )


def tally(text: str) -> str:
    """The counts. Not a moment, so not a dated row — a mono line under a
    hairline, where a column of figures is what it is."""
    return (
        f'<div class="mono" style="border-top:1px solid var(--line);'
        f'padding:12px 0;font-size:12px;line-height:16px;letter-spacing:0.08em;'
        f'color:var(--ink-muted)">{text}</div>'
    )


def milestones(rows: list[tuple], counts: str, top: int = 32) -> str:
    """The whole section: the tracked-out label, then the card."""
    body = ''.join(
        milestone(date, title, detail, last=(index == len(rows) - 1))
        for index, (date, title, detail) in enumerate(rows)
    )
    foot = tally(counts) if counts else ''
    return (
        f'<section style="margin-top:{top}px">'
        f'<div class="label">Milestones</div>'
        f'<div class="card" style="margin-top:8px;padding:0 16px">'
        f'{body}{foot}</div></section>'
    )


FLUWEEL = [
    ('2 Mar 2021', 'Arrived', 'after 214 days on the wishlist'),
    ('18 Apr 2021', 'First new leaf', ''),
    ('9 Jun 2022', 'First bloom', '464 days after it arrived'),
    ('4 May 2025', 'Into its third pot', '12 → 15 → 19 cm'),
    ('2 Mar 2026', 'Five years here', ''),
    ('9 May 2026', 'Watered for the 200th time', ''),
]
FLUWEEL_COUNTS = ''

SNEEUW = [
    ('4 Jul 2026', 'Arrived', 'after 41 days on the wishlist'),
    ('29 Aug 2026', 'First new leaf', ''),
]
SNEEUW_COUNTS = ''


# --- the neighbours, so the card is judged in its actual company -------------

def care_tail() -> str:
    """The bottom row of the Care card, cut by the top edge: the artboard is a
    page scrolled down, not a card floating on its own."""
    return (
        '<div class="card" style="border-top:0;border-radius:0 0 16px 16px;'
        'padding:0 18px;margin-top:-1px">'
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 0">'
        f'{chip("pot", "leaf")}'
        '<div style="min-width:0;flex:1">'
        '<div style="font-size:15px;line-height:20px;font-weight:500">Last repot</div>'
        '<div style="font-size:13px;color:var(--ink-faint)">15 → 19 cm</div>'
        '</div>'
        '<div class="mono" style="font-size:14px;color:var(--ink-muted)">4 May 2025</div>'
        '</div></div>'
    )


ICONS = {
    # Lucide, the same paths `ui/Icon.tsx` vendors.
    'pot': '<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/><path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/><path d="M5 21h14"/>',
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    'ruler': '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    'medium': '<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12 8 8"/>',
    'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
}


def chip(icon: str, tone: str, size: int = 38) -> str:
    ground = {'water': 'var(--water-tint)', 'leaf': 'var(--leaf-tint)',
              'ink': 'var(--sunk)'}[tone]
    stroke = {'water': 'var(--water)', 'leaf': 'var(--leaf)',
              'ink': 'var(--ink-muted)'}[tone]
    return (
        f'<span style="display:inline-flex;align-items:center;justify-content:center;'
        f'width:{size}px;height:{size}px;border-radius:9999px;background:{ground};'
        f'color:{stroke};flex-shrink:0">{glyph(icon, round(size * 0.5))}</span>'
    )


def glyph(icon: str, size: int) -> str:
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
        f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
        f'stroke-linejoin="round" style="display:block">{ICONS[icon]}</svg>'
    )


def family() -> str:
    """Fluweel with the two cuttings taken off it — the card Milestones sits
    directly under, and the reason lineage is not repeated inside it."""
    def kin(name, meta, own=False):
        mark = ('<span class="label" style="color:var(--leaf);flex-shrink:0">This one</span>'
                if own else '')
        return (
            f'<div style="position:relative;margin:2px 0;'
            + ('border-radius:12px;background:var(--leaf-tint);padding:8px 8px 8px 28px;'
               'margin-left:-28px' if own else 'padding:6px 0') + '">'
            f'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">'
            f'<span class="serif" style="font-size:19px;line-height:24px;font-weight:600;'
            f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{name}</span>{mark}</div>'
            f'<span class="mono" style="display:block;font-size:12px;'
            f'line-height:16px;letter-spacing:0.08em;color:var(--ink-muted)">{meta}</span>'
            f'</div>'
        )

    rail = (
        '<div style="border-left:1px solid var(--line);padding-left:20px;margin-left:8px">'
        + kin('Fluweel', 'ANT-4C19 · from a nursery', own=True)
        + '<div style="border-left:1px solid var(--line);padding-left:20px">'
        + kin('Fluweel II', 'ANT-9B02 · cutting, 2023')
        + kin('Fluweel III', 'ANT-1D77 · cutting, 2025')
        + '</div></div>'
    )
    return (
        '<section style="margin-top:28px">'
        '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">'
        '<div class="label">Family</div>'
        '<span style="font-size:13px;color:var(--ink-faint)">3 plants · 2 generations</span>'
        '</div>'
        f'<div class="card" style="margin-top:8px;padding:14px 18px 16px">{rail}</div>'
        '</section>'
    )


def tab_bar() -> str:
    stops = [('Today', 'home', False), ('Plants', 'rows', True),
             ('Log', 'plus', None), ('Wishlist', 'bookmark', False),
             ('Settings', 'sliders', False)]
    paths = {
        'home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        'rows': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
        'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
        'bookmark': '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
        'sliders': '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
    }
    cells = ''
    for name, icon, active in stops:
        svg = (f'<svg width="23" height="23" viewBox="0 0 24 24" fill="none" '
               f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
               f'stroke-linejoin="round" style="display:block">{paths[icon]}</svg>')
        if active is None:
            mark = (f'<span style="margin-top:-18px;display:flex;align-items:center;'
                    f'justify-content:center;width:48px;height:48px;border-radius:9999px;'
                    f'background:var(--leaf);color:var(--on-accent)">'
                    f'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" '
                    f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
                    f'stroke-linejoin="round" style="display:block">{paths[icon]}</svg></span>')
            colour, weight = 'var(--leaf)', '400'
        else:
            mark = svg
            colour = 'var(--leaf)' if active else 'var(--ink-faint)'
            weight = '600' if active else '400'
        cells += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;'
                  f'gap:4px;padding-bottom:10px;color:{colour}">{mark}'
                  f'<span style="font-size:11px;line-height:16px;font-weight:{weight}">{name}</span></div>')
    return (f'<div style="position:absolute;left:0;right:0;bottom:0;display:flex;'
            f'border-top:1px solid var(--line);background:var(--surface);'
            f'padding-top:10px;padding-bottom:22px">{cells}</div>')


def drop() -> str:
    return (
        '<div style="position:absolute;left:310px;top:674px;display:inline-flex;'
        'align-items:center;justify-content:center;width:64px;height:64px;'
        'border-radius:9999px;background:var(--water);color:var(--on-accent);'
        'box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)">'
        + glyph('droplet', 29) + '</div>'
    )


def phone(inner: str) -> str:
    return (
        '<div style="position:relative;width:390px;height:844px;overflow:hidden;'
        'background:var(--paper);color:var(--ink)">'
        f'<div style="padding:0 16px">{inner}</div>{tab_bar()}{drop()}</div>'
    )


# --- artboards --------------------------------------------------------------

def main_board() -> str:
    return page(phone(
        care_tail()
        + family()
        + milestones(FLUWEEL, FLUWEEL_COUNTS)
    ))


def dark_board() -> str:
    return page(phone(
        care_tail()
        + family()
        + milestones(FLUWEEL, FLUWEEL_COUNTS)
    ), theme=DARK)


def states_board() -> str:
    def caption(text):
        return (f'<p style="margin:0 0 10px;font-size:13px;line-height:18px;'
                f'color:var(--ink-faint)">{text}</p>')

    empty = (
        '<div style="margin-top:8px;border:1px dashed var(--line-strong);border-radius:16px;'
        'padding:18px;color:var(--ink-faint);font-size:14px;line-height:20px">'
        'Nothing. One dated fact is not a chronicle, and a card of hollow rows '
        'waiting to be filled is the locked badge this design refuses.</div>'
    )

    body = (
        '<div style="padding:28px 16px 40px">'
        + caption('Fluweel · five years, two cuttings, one bloom')
        + milestones(FLUWEEL, FLUWEEL_COUNTS, top=0)
        + f'<div style="height:34px"></div>{caption("Sneeuw · four months in")}'
        + milestones(SNEEUW, SNEEUW_COUNTS, top=0)
        + f'<div style="height:34px"></div>'
        + caption('Mos · added yesterday, watered once')
        + '<div class="label">Milestones</div>' + empty
        + '</div>'
    )
    return page(f'<div style="width:390px;background:var(--paper);color:var(--ink)">{body}</div>')


def desktop_board() -> str:
    def detail_row(icon, text, last=False):
        edge = '' if last else 'border-bottom:1px solid var(--line);'
        return (f'<div style="display:flex;align-items:center;gap:14px;padding:12px 0;{edge}">'
                f'<span style="color:var(--ink-faint);display:inline-flex">{glyph(icon, 19)}</span>'
                f'<span style="font-size:15px;line-height:20px">{text}</span></div>')

    def care_row(icon, tone, label, detail, value, last=False):
        edge = '' if last else 'border-bottom:1px solid var(--line);'
        under = (f'<div style="font-size:13px;color:var(--ink-faint)">{detail}</div>'
                 if detail else '')
        return (f'<div style="display:flex;align-items:center;gap:14px;padding:14px 0;{edge}">'
                f'{chip(icon, tone)}<div style="min-width:0;flex:1">'
                f'<div style="font-size:15px;line-height:20px;font-weight:500">{label}</div>{under}</div>'
                f'<div class="mono" style="font-size:14px;color:var(--ink-muted)">{value}</div></div>')

    care = ('<div class="card" style="margin-top:14px;padding:0 18px">'
            + care_row('droplet', 'water', 'Last watered', 'every 9 days · 7–12', '6 days ago')
            + care_row('pot', 'leaf', 'Last repot', '15 → 19 cm', '4 May 2025', last=True)
            + '</div>')

    details = ('<section style="margin-top:28px"><div class="label">Details</div>'
               '<div class="card" style="margin-top:8px;padding:0 18px">'
               + detail_row('medium', 'Pon')
               + detail_row('ruler', '19 cm · Semi-hydro')
               + detail_row('leaf', '3 leaves and 1 bloom this year')
               + detail_row('receipt', 'Nursery · Bureau Bloem · € 145', last=True)
               + '</div></section>')

    history_rows = ''
    entries = [('Watered', '', '12 Sep'), ('Watered', '', '3 Sep'),
               ('New leaf', '', '2 Sep'), ('Note', 'Second spathe opening', '28 Aug'),
               ('Watered', '', '25 Aug')]
    for index, (title, detail, date) in enumerate(entries):
        icon = {'Watered': ('droplet', 'water'), 'New leaf': ('leaf', 'leaf'),
                'Note': ('receipt', 'ink')}[title]
        edge = '' if index == len(entries) - 1 else 'border-bottom:1px solid var(--line);'
        under = (f'<div style="font-size:13px;color:var(--ink-muted)">{detail}</div>'
                 if detail else '')
        history_rows += (
            f'<div style="display:flex;align-items:center;gap:14px;padding:12px 18px;{edge}">'
            f'{chip(icon[0], icon[1], 34)}<div style="min-width:0;flex:1">'
            f'<div style="font-size:15px;line-height:20px;font-weight:500">{title}</div>{under}</div>'
            f'<span class="mono" style="font-size:12px;color:var(--ink-faint)">{date}</span></div>')

    history = ('<div style="flex:1;min-width:0">'
               '<div style="display:flex;gap:8px;margin-top:2px">'
               + ''.join(
                   f'<span style="display:inline-flex;align-items:center;height:36px;'
                   f'padding:0 14px;border-radius:9999px;font-size:14px;'
                   + ('background:var(--ink);color:var(--paper)' if on else
                      'border:1px solid var(--line-strong);color:var(--ink-muted)')
                   + f'">{name}</span>'
                   for name, on in [('Everything', True), ('Notable', False),
                                    ('Waterings', False), ('Photos', False)])
               + '</div>'
               '<div class="serif" style="margin-top:22px;font-size:21px;line-height:26px;'
               'font-weight:500">September 2026</div>'
               f'<div class="card" style="margin-top:8px;overflow:hidden">{history_rows}</div>'
               '</div>')

    column = ('<div style="width:336px;flex-shrink:0">'
              + care + details + family() + milestones(FLUWEEL, FLUWEEL_COUNTS) + '</div>')

    return page(
        '<div style="position:relative;width:1440px;height:1160px;overflow:hidden;'
        'background:var(--paper);color:var(--ink)">'
        '<div style="position:absolute;left:0;top:0;bottom:0;width:248px;'
        'background:var(--surface);border-right:1px solid var(--line)"></div>'
        '<div style="position:absolute;left:332px;top:36px;width:1024px">'
        '<div class="serif" style="font-size:40px;line-height:44px;font-weight:500;'
        'letter-spacing:-0.025em">Fluweel</div>'
        '<p style="margin:2px 0 0;font-size:17px;color:var(--ink-muted)">'
        'Anthurium papillilaminum × crystallinum</p>'
        f'<div style="display:flex;gap:32px;align-items:flex-start;margin-top:22px">'
        f'{history}{column}</div>'
        '</div></div>'
    )


BOARDS = {
    'Main.dc.html': main_board,
    'States.dc.html': states_board,
    'Desktop.dc.html': desktop_board,
    'Dark.dc.html': dark_board,
}

for name, build in BOARDS.items():
    (HERE / name).write_text(build())
    print(f'wrote {name}')
