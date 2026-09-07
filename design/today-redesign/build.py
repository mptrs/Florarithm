#!/usr/bin/env python3
"""
Builds the Today artboards.

The rows, the plates and the tab bar come from here rather than being retyped
per artboard, so four directions can differ in structure and agree on every
pixel of the thing they share.
"""

from pathlib import Path

HERE = Path(__file__).parent
CSS = (HERE / '_common.css').read_text()

FONTS = ('https://fonts.googleapis.com/css2?'
         'family=IBM+Plex+Mono:wght@400;500;600'
         '&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..500'
         '&display=swap')


def page(body: str, extra_css: str = '') -> str:
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
{CSS}{extra_css}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""


# --- the drawn plate, in four specimens -------------------------------------
# One style, one stroke weight, one colour: this is src/ui/Plate.tsx, varied so
# a column of them does not read as the same rectangle eleven times.

def plate(kind: int) -> str:
    # `vector-effect` is the whole reason this reads at 40px: the viewBox is 240
    # wide, so a 1.4 stroke scaled into a thumbnail is a third of a pixel and
    # the plate disappears. The stroke stays 1.4 device px at any size instead —
    # which is what "the same weight in a thumbnail as in a hero" already claims.
    g = ('<g fill="none" stroke="currentColor" stroke-width="1.4" '
         'vector-effect="non-scaling-stroke" stroke-linecap="round" opacity="0.62">')
    paths = {
        0: (  # the shipped plate
            '<path d="M120 148c-26 0-46-22-46-52 0-34 22-62 46-84 24 22 46 50 46 84 0 30-20 52-46 52Z"/>'
            '<path d="M120 148V22"/>'
            '<path d="M120 60c-10-6-20-10-32-11M120 60c10-6 20-10 32-11"/>'
            '<path d="M120 92c-13-7-26-11-40-12M120 92c13-7 26-11 40-12"/>'
            '<path d="M120 124c-11-6-22-9-34-10M120 124c11-6 22-9 34-10"/>'
        ),
        1: (  # an arrow leaf
            '<path d="M120 150c-31 0-53-25-53-57 0-26 16-47 35-61 8-6 14-11 18-16 4 5 10 10 18 16 19 14 35 35 35 61 0 32-22 57-53 57Z"/>'
            '<path d="M120 150V26"/>'
            '<path d="M120 66c-11-3-21-9-29-17M120 66c11-3 21-9 29-17"/>'
            '<path d="M120 100c-13-3-25-9-35-18M120 100c13-3 25-9 35-18"/>'
            '<path d="M120 132c-11-2-22-7-31-14M120 132c11-2 22-7 31-14"/>'
        ),
        2: (  # upright blades
            '<path d="M92 150c-9-29-9-60-4-88"/>'
            '<path d="M106 150c-6-35-4-71 4-105"/>'
            '<path d="M120 150c-1-38 0-79 2-118"/>'
            '<path d="M136 150c6-36 7-73 3-107"/>'
            '<path d="M150 150c9-30 11-62 8-90"/>'
            '<path d="M78 150h84"/>'
        ),
        3: (  # a fern frond
            '<path d="M120 150c0-40-2-85 0-130"/>'
            '<path d="M120 42c-10-5-19-7-28-7M120 42c10-5 19-7 28-7"/>'
            '<path d="M120 68c-12-5-24-8-35-8M120 68c12-5 24-8 35-8"/>'
            '<path d="M120 94c-13-5-26-8-38-8M120 94c13-5 26-8 38-8"/>'
            '<path d="M120 120c-11-4-22-6-32-6M120 120c11-4 22-6 32-6"/>'
        ),
    }[kind]
    return (f'<svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" '
            f'aria-hidden="true">{g}{paths}</g></svg>')


# --- icons, from src/ui/Icon.tsx --------------------------------------------

ICON_PATHS = {
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'rows': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 9H3"/><path d="M21 15H3"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'bookmark': '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
    'sliders': '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
    'alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'calendar': '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
    'place': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    'fertilizer': '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
}


def icon(name: str, size: int = 20) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>')


# --- pieces -----------------------------------------------------------------

def head(title: str, meta: str) -> str:
    return f'<div class="head"><h1>{title}</h1><div class="meta">{meta}</div></div>'


def drawer(name: str, count, warn: bool = False, style: str = '') -> str:
    cls = 'drawer warn' if warn else 'drawer'
    st = f' style="{style}"' if style else ''
    ct = '' if count is None else f'<span class="ct">{count}</span>'
    return f'<div class="{cls}"{st}><span class="nm">{name}</span><span class="rule"></span>{ct}</div>'


def days(n, unit: bool = True) -> str:
    """The DaysSinceWater stack from src/ui/primitives.tsx."""
    if n is None:
        return '<span class="never">never logged</span>'
    thirsty = ' thirsty' if n >= 14 else ''
    u = '<span class="u">days</span>' if unit else ''
    return f'<div class="days{thirsty}"><span class="v">{n}</span>{u}</div>'


def row(name: str, second: str, n, kind: int, thumb: bool = True) -> str:
    t = f'<span class="thumb">{plate(kind)}</span>' if thumb else ''
    s = f'<span class="s">{second}</span>' if second else ''
    return (f'<div class="row">{t}<span class="who"><span class="n">{name}</span>{s}</span>'
            f'{days(n)}</div>')


def done_mark(word: bool = False) -> str:
    """What stands where the day count stood, once a plant has had water today.

    `leaf` because the system already assigns checkmarks to it, and a mark
    rather than a `0` because a column of figures with a few zeroes in it still
    has to be read; a mark is seen.
    """
    w = '<span class="u" style="color:var(--leaf)">today</span>' if word else ''
    style = '' if word else ' style="justify-content:center;height:37px"'
    return (f'<div class="days"{style}>'
            f'<span style="color:var(--leaf);display:flex">{icon("check", 20)}</span>{w}</div>')


def row_done(name: str, second: str = 'species', word: bool = False) -> str:
    sp, pl, d, k = BY[name]
    return ('<div class="row">'
            f'<span class="thumb">{plate(k)}</span>'
            f'<span class="who"><span class="n">{name}</span>'
            f'<span class="s">{sp if second == "species" else pl}</span></span>'
            f'{done_mark(word)}</div>')


def trow(name: str, place: str, n, done: bool = False) -> str:
    """The quiet tail row: a list you are not reading closely."""
    cls = 'trow done' if done else 'trow'
    if done:
        d = f'<span class="d" style="color:var(--leaf)">{icon("check", 16)}</span>'
    elif n is None:
        d = '<span class="d">&mdash;</span>'
    else:
        thirsty = ' thirsty' if n >= 14 else ''
        d = f'<span class="d{thirsty}">{n}</span>'
    p = f'<span class="p">{place}</span>' if place else ''
    return f'<div class="{cls}"><span class="n">{name}</span>{p}{d}</div>'


TABS = f"""<nav class="tabs">
  <span class="tab on">{icon('droplet', 23)}<span class="lbl">Today</span></span>
  <span class="tab">{icon('rows', 23)}<span class="lbl">Collection</span></span>
  <span class="tab"><span class="disc">{icon('plus', 26)}</span><span class="lbl">New</span></span>
  <span class="tab">{icon('bookmark', 23)}<span class="lbl">Wishlist</span></span>
  <span class="tab">{icon('sliders', 23)}<span class="lbl">Settings</span></span>
</nav>"""


def phone(inner: str) -> str:
    return f'<div class="phone"><div class="body">\n{inner}\n</div>\n{TABS}\n</div>'


# --- the collection, as it would really be ----------------------------------
# name, species, place, days since water, which plate

P = [
    ('Wassily',  'Monstera deliciosa',      'Woonkamer',  21, 1),
    ('Olga',     'Calathea orbifolia',      'Woonkamer',  14, 0),
    ('Fluweel',  'Anthurium clarinervium',  'Woonkamer',   9, 1),
    ('Gruyère',  'Monstera adansonii',      'Woonkamer',   6, 0),
    ('Bertha',   'Ficus lyrata',            'Woonkamer',   3, 1),
    ('Kees',     'Alocasia zebrina',        'Keuken',     16, 1),
    ('Sien',     "Philodendron 'Birkin'",   'Keuken',      8, 0),
    ('Dikkie',   'Zamioculcas zamiifolia',  'Keuken',      5, 2),
    ('Nore',     'Hoya carnosa',            'Slaapkamer', None, 3),
    ('Boris',    'Sansevieria trifasciata', 'Slaapkamer', 11, 2),
    ('Miep',     'Epipremnum aureum',       'Slaapkamer',  7, 3),
    ('Toon',     'Scindapsus pictus',       'Slaapkamer',  4, 3),
    ('Hanna',    'Maranta leuconeura',      'Studeer',    12, 0),
    ('Fien',     'Peperomia argyreia',      'Studeer',     6, 3),
    ('Joop',     'Aspidistra elatior',      'Studeer',     2, 2),
    ('Roos',     'Asplenium nidus',         'Badkamer',    5, 3),
    ('Stan',     'Chlorophytum comosum',    'Badkamer',    3, 2),
]

BY = {n: (sp, pl, d, k) for n, sp, pl, d, k in P}


def r(name: str, second: str = 'species', thumb: bool = True) -> str:
    sp, pl, d, k = BY[name]
    return row(name, sp if second == 'species' else pl, d, k, thumb)


def t(name: str, place: bool = False, done: bool = False) -> str:
    sp, pl, d, k = BY[name]
    return trow(name, pl if place else '', d, done)


# --- the sort switch --------------------------------------------------------
# Collection's own SortSwitch, with Today's two orders in it. On the title row
# the "Sort" label is dropped: at 390px the title plus a labelled switch runs to
# within 22px of the margin, and the two chips say what they do without it.

SWITCH_CSS = """
.sw { display: flex; align-items: center; gap: 8px; }
.sw .lb { font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--ink-faint); }
.chipf { display: inline-flex; align-items: center; height: 36px; padding: 0 14px;
  border-radius: 9999px; font-size: 14px; font-weight: 500; white-space: nowrap;
  border: 1px solid var(--line-strong); color: var(--ink-muted); }
.chipf.on { background: var(--ink); color: var(--paper); font-weight: 600;
  border-color: var(--ink); }
.headrow { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.headrow h1 { margin: 0; font-family: var(--display); font-size: 32px; line-height: 36px;
  font-weight: 500; letter-spacing: -0.015em; }
"""


def switch(place: bool, label: bool = False) -> str:
    lb = '<span class="lb">Sort</span>' if label else ''
    return (f'<div class="sw">{lb}'
            f'<span class="chipf{"" if place else " on"}">Thirstiest</span>'
            f'<span class="chipf{" on" if place else ""}">By place</span></div>')


def head_switch(place: bool) -> str:
    """The title row: the switch takes the slot the plant count used to hold."""
    return (f'<div class="headrow"><h1>Today</h1>{switch(place)}</div>')


# --- the screen, in its two orders ------------------------------------------

def ledger() -> str:
    """Thirstiest first, never-logged above it. The place rides under the name,
    because nothing above the row is saying it."""
    order = ['Nore', 'Wassily', 'Kees', 'Olga', 'Hanna', 'Boris',
             'Fluweel', 'Sien', 'Miep', 'Gruyère', 'Fien', 'Roos']
    return phone(
        head_switch(False)
        + '<div style="margin-top:16px;border-top:1px solid var(--line)"></div>'
        + ''.join(r(n, 'place') for n in order)
    )


def by_place() -> str:
    """The same list, cut into rooms. The drawer label carries the place, so the
    row says the species instead — Collection's rule, unchanged."""
    return phone(
        head_switch(True)
        + drawer('Woonkamer', 5)
        + r('Wassily') + r('Olga') + r('Fluweel') + r('Gruyère') + r('Bertha')
        + drawer('Keuken', 3)
        + r('Kees') + r('Sien') + r('Dikkie')
        + drawer('Slaapkamer', 4)
        + r('Nore') + r('Boris')
    )


def mid_round() -> str:
    """The by-place order, halfway through a round.

    Nothing is lifted out and nothing re-labels: the room counts still say what
    is in the room, and a plant that has had water sinks to the foot of its own
    room because it is now on nought days — which is the sort the screen already
    does, not a rule added for this.
    """
    return phone(
        head_switch(True)
        + drawer('Woonkamer', 5)
        + r('Wassily') + r('Olga')
        + row_done('Bertha') + row_done('Fluweel') + row_done('Gruyère')
        + drawer('Keuken', 3)
        + r('Sien') + r('Dikkie') + row_done('Kees')
        + drawer('Slaapkamer', 4)
        + r('Nore') + r('Boris')
    )


# --- the specification sheets ------------------------------------------------

SHEET_CSS = """
.sheet { width: 430px; padding: 28px 20px 32px; background: var(--paper); }
.spec { margin-top: 30px; }
.spec:first-child { margin-top: 0; }
.spec > .cap { margin-bottom: 12px; }
.var { margin-top: 16px; }
.var:first-of-type { margin-top: 10px; }
.var .tag { font-size: 12px; line-height: 16px; color: var(--ink-faint); font-style: italic; font-family: var(--display); }
.frame { border-top: 1px solid var(--line); }
.trow .d { display: flex; align-items: center; justify-content: flex-end; }
.side { display: flex; gap: 28px; align-items: flex-end; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.side .one { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.side .one .tag { font-size: 12px; color: var(--ink-faint); font-style: italic; font-family: var(--display); }
.quiet-line { padding: 22px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-family: var(--display); font-size: 19px; line-height: 26px; color: var(--ink-muted); }
"""


def spec(title: str, cap: str, body: str) -> str:
    return (f'<section class="spec"><div class="note">{title}</div>'
            f'<div class="cap">{cap}</div>{body}</section>')


def var(tag: str, body: str) -> str:
    return f'<div class="var"><div class="tag">{tag}</div><div class="frame">{body}</div></div>'


def pieces() -> str:
    sp, pl, d, k = BY['Fluweel']

    the_row = (
        var('a &mdash; sorted thirstiest: nothing above the row says the place, so the row does',
            r('Fluweel', 'place'))
        + var('b &mdash; grouped by place: the drawer said the room, so the row says the species',
              r('Fluweel'))
        + var('c &mdash; without the photograph, which is what Today ships today',
              row('Fluweel', pl, d, k, thumb=False))
        + var('d &mdash; the half-height row, if a quiet tail is ever wanted',
              trow('Fluweel', pl, d))
    )

    the_number = (
        '<div class="side">'
        f'<div class="one"><span class="tag">stacked</span>{days(9)}</div>'
        f'<div class="one"><span class="tag">stacked, thirsty</span>{days(21)}</div>'
        f'<div class="one"><span class="tag">no unit</span>{days(9, unit=False)}</div>'
        '<div class="one"><span class="tag">inline, as on Collection</span>'
        '<span style="font-family:var(--mono);font-size:14px;color:var(--ink)">9</span></div>'
        '<div class="one"><span class="tag">inline, thirsty</span>'
        '<span style="font-family:var(--mono);font-size:14px;font-weight:600;color:var(--ember)">21</span></div>'
        '</div>'
    )

    never = (
        var('a &mdash; the shipped words, in the serif, where the figure would be',
            r('Nore', 'place'))
        + var('b &mdash; an em dash, which reads as a missing value rather than a fact',
              row('Nore', BY['Nore'][1], -1, BY['Nore'][3]).replace(
                  days(-1), '<span class="never" style="font-style:normal">&mdash;</span>'))
        + var('c &mdash; its own run above everything, because it is a different kind of fact',
              drawer('Never logged', 1) + r('Nore', 'place'))
    )

    the_switch = (
        var('a &mdash; on the title row, unlabelled &mdash; the slot the plant count held',
            f'<div style="padding:12px 0">{head_switch(False)}</div>')
        + var('b &mdash; under the title, labelled, exactly as Collection places it. '
              'Costs 52px before the first plant, and keeps the count.',
              f'<div style="padding:12px 0 14px">{head("Today", "<b>17</b> plants")}'
              f'<div style="margin-top:16px">{switch(False, label=True)}</div></div>')
    )

    marking = (
        var('a &mdash; the mark alone, where the figure was',
            row_done('Gruyère', 'place'))
        + var('b &mdash; the mark over the word, keeping the two-line rhythm of the column',
              row_done('Gruyère', 'place', word=True))
        + var('c &mdash; lifted out into a run of its own at the foot. Then the plant has to '
              'leave the list above, or it is on the page twice &mdash; and in the by-place '
              'order that means &ldquo;Woonkamer 5&rdquo; reads 3 on a watering day.',
              drawer('Watered today', 3)
              + t('Bertha', place=True, done=True) + t('Fluweel', place=True, done=True)
              + t('Gruyère', place=True, done=True))
    )

    body = (
        '<div class="sheet">'
        + spec('The row, in both orders',
               'The switch changes the second line and nothing else: whatever the list is '
               'grouped by never repeats itself inside a row. That is Collection&rsquo;s rule, '
               'and it is the only thing the two orders disagree about.', the_row)
        + spec('The day count',
               'Today is the only screen that reads this number out loud &mdash; Collection '
               'deliberately keeps it quiet. That argues for the stacked figure here, and '
               'against repeating Collection&rsquo;s inline one.', the_number)
        + spec('A plant that was never logged',
               'Not the same fact as &ldquo;a long time ago&rdquo;, and a zero there would be '
               'a lie. It sorts above everything either way; the question is whether it says so.',
               never)
        + spec('Where the switch goes',
               'Two placements. The first drops the plant count, which repeats what the list '
               'already shows and which Collection&rsquo;s header says anyway; the second keeps '
               'it and pays a row for it.', the_switch)
        + spec('What you have already done',
               'Read straight back out of the log, never written from here. A plant watered '
               'today keeps its place and its room; only the figure changes. The third '
               'treatment is the one that was dropped, and the caption says what it costs.',
               marking)
        + '</div>'
    )
    return body


def states() -> str:
    backup = (
        f'<div style="padding:10px 0 14px">{head_switch(False)}</div>'
        '<div class="banner"><span style="color:var(--ember);display:flex">'
        + icon('alert', 16) +
        '</span><span class="tx">No backup for 21 days. Your collection lives only on '
        'this device.</span><span class="btn">Back up</span></div>'
        '<div style="margin-top:16px;border-top:1px solid var(--line)"></div>'
        + r('Nore', 'place') + r('Wassily', 'place')
    )

    nothing = (
        f'<div style="padding:10px 0 14px"><div class="headrow"><h1>Today</h1></div></div>'
        '<div class="empty"><h2>Nothing here yet</h2>'
        '<p>Add your first plant and it will show up here, sorted by how long it has been '
        'since it last had water.</p><span class="go">Add a plant</span></div>'
    )

    body = (
        '<div class="sheet">'
        + spec('The backup line',
               'Unchanged, and in its existing place: under the title row, above the list. '
               'It already knows to stay quiet once sync is configured, and it is the only '
               'warning in the app about losing data.', f'<div>{backup}</div>')
        + spec('No plants at all',
               'The switch is gone with the list &mdash; there is nothing to sort. Its last '
               'sentence still describes the thirstiest order, which is the one that survived.',
               f'<div>{nothing}</div>')
        + '</div>'
    )
    return body


# --- the desktop -------------------------------------------------------------
# name -> the backward-looking rhythm, and the date of the last watering.

# The day of the last watering, derived from the day count so the two can
# never disagree — `formatDayMonth` is Intl {day:'numeric', month:'short'}.
from datetime import date, timedelta

TODAY = date(2026, 9, 7)          # a Sunday
_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def last_water(name: str) -> str:
    d = BY[name][2]
    if d is None:
        return '—'
    when = TODAY - timedelta(days=d)
    return f'{when.day} {_MONTH[when.month - 1]}'


DESKTOP_CSS = """
.desk { display: flex; width: 1440px; height: 900px; overflow: hidden; background: var(--paper); }
.side-nav { width: 248px; flex: none; display: flex; flex-direction: column;
  border-right: 1px solid var(--line); background: var(--surface); padding: 24px 14px; }
.side-nav .mark { padding: 0 10px 24px; font-family: var(--display); font-size: 23px;
  font-weight: 500; letter-spacing: -0.01em; }
.side-nav .item { display: flex; align-items: center; gap: 10px; height: 44px;
  border-radius: 6px; padding: 0 10px; font-size: 15px; font-weight: 500; color: var(--ink-muted); }
.side-nav .item.on { background: var(--leaf-tint); color: var(--leaf); font-weight: 600; }
.side-nav .item .lb { flex: 1; }
.side-nav .item .ct { font-family: var(--mono); font-size: 13px; color: var(--ink-faint); }
.main { flex: 1; min-width: 0; padding: 32px 40px 0; }
.col { width: 1024px; margin: 0 auto; }
.col .head h1 { font-size: 34px; line-height: 38px; }
.cols { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--line-strong);
  padding-bottom: 10px; margin-top: 16px; }
.cols span { flex: none; font-size: 12px; line-height: 16px; font-weight: 600;
  letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-muted); }
.drow { display: flex; align-items: center; gap: 16px; min-height: 44px; padding: 10px 0;
  border-bottom: 1px solid var(--line); }
.drow .cell { flex: none; font-family: var(--mono); font-size: 14px;
  font-variant-numeric: tabular-nums; color: var(--ink-muted); }
.desk .drawer { margin: 24px 0 6px; }
"""


def drow(name: str) -> str:
    """A desktop row in the thirstiest order, so it carries its place."""
    sp, pl, d, k = BY[name]
    last = last_water(name)
    return (
        '<div class="drow">'
        f'<span class="thumb">{plate(k)}</span>'
        f'<span class="who" style="flex:1"><span class="n">{name}</span>'
        f'<span class="s">{sp}</span></span>'
        f'<span class="cell" style="width:180px;font-family:var(--ui)">{pl}</span>'
        f'<span class="cell" style="width:120px">{last}</span>'
        f'<span style="width:64px;display:flex;justify-content:flex-end">{days(d)}</span>'
        '</div>'
    )


def desktop() -> str:
    def nav_item(ic, lb, on, ct):
        cls = 'item on' if on else 'item'
        count = f'<span class="ct">{ct}</span>' if ct else ''
        return (f'<span class="{cls}">{icon(ic, 19)}'
                f'<span class="lb">{lb}</span>{count}</span>')

    nav = ''.join(
        nav_item(ic, lb, on, ct)
        for ic, lb, on, ct in [
            ('droplet', 'Today', True, ''),
            ('rows', 'Collection', False, '17'),
            ('plus', 'New plant', False, ''),
            ('bookmark', 'Wishlist', False, '4'),
            ('sliders', 'Settings', False, ''),
        ]
    )

    # Rhythm is gone. What is left is the plant, where it stands, the day it
    # last had water and how long ago that was — and Place is here only because
    # this is the ungrouped order; switching to By place moves it into the
    # drawer label and drops the column, the same trade Collection makes.
    cols = ('<div class="cols"><span style="width:40px"></span>'
            '<span style="flex:1">Plant</span>'
            '<span style="width:180px">Place</span>'
            '<span style="width:120px">Last water</span>'
            '<span style="width:64px;text-align:right">Days</span></div>')

    order = ['Nore', 'Wassily', 'Kees', 'Olga', 'Hanna', 'Boris', 'Fluweel',
             'Sien', 'Miep', 'Gruyère', 'Fien', 'Dikkie', 'Roos']

    return (
        '<div class="desk">'
        f'<aside class="side-nav"><span class="mark">Florarithm</span>'
        f'<nav style="display:flex;flex-direction:column;gap:2px">{nav}</nav></aside>'
        '<main class="main"><div class="col">'
        '<div class="headrow"><h1 style="font-size:34px;line-height:38px">Today</h1>'
        + switch(False, label=True) +
        '</div>'
        + cols + ''.join(drow(n) for n in order) +
        '</div></main></div>'
    )
