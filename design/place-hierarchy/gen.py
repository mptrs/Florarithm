# Generates the five .dc.html artboards for the place-hierarchy study.
# Every value below is lifted from the app's own source: tokens from
# src/styles.css, geometry from src/ui/rows.tsx, src/ui/plantPicture.tsx,
# src/ui/primitives.tsx. Only the treatment of the place varies between files.

PLATE = ('<svg class="plate" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
  '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.5">'
  '<path d="M120 148c-26 0-46-22-46-52 0-34 22-62 46-84 24 22 46 50 46 84 0 30-20 52-46 52Z"></path>'
  '<path d="M120 148V22"></path>'
  '<path d="M120 60c-10-6-20-10-32-11M120 60c10-6 20-10 32-11"></path>'
  '<path d="M120 92c-13-7-26-11-40-12M120 92c13-7 26-11 40-12"></path>'
  '<path d="M120 124c-11-6-22-9-34-10M120 124c11-6 22-9 34-10"></path>'
  '</g></svg>')

PIN = ('<svg class="pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>'
  '<circle cx="12" cy="10" r="3"></circle></svg>')

ZZZ = ('<span class="doze" role="img" aria-label="Dormant">'
  '<span class="z z1">z</span><span class="z z2">z</span><span class="z z3">z</span></span>')

CSS = """
    :root {
      /* src/styles.css, light arm of every light-dark() pair. */
      --paper: oklch(0.968 0.008 85);
      --surface: oklch(0.995 0.003 85);
      --sunk: oklch(0.944 0.01 85);
      --line: oklch(0.886 0.01 80);
      --line-strong: oklch(0.8 0.012 80);
      --ink: oklch(0.255 0.014 65);
      --ink-muted: oklch(0.51 0.014 68);
      --ink-faint: oklch(0.655 0.012 72);
      --ember: oklch(0.52 0.13 47);
      --leaf: oklch(0.455 0.098 152);
      --floating: oklch(0.995 0.003 85 / 0.9);
      --display: 'Newsreader', Georgia, 'Times New Roman', serif;
      --ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
      --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
    }

    body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--ui); }
    a { color: var(--leaf); text-decoration: none; }
    a:hover { color: oklch(0.405 0.098 152); }

    .screen { padding: 18px 16px 24px; }

    /* DrawerLabel — src/ui/rows.tsx */
    .drawer { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; }
    .drawer + .drawer { margin-top: 26px; }
    .drawer-name {
      font-size: 0.75rem; line-height: 1rem; font-weight: 600;
      letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-faint);
    }
    .drawer-rule { height: 1px; flex: 1; background: var(--line); }
    .drawer-count { font-family: var(--mono); font-size: 0.75rem; line-height: 1rem; color: var(--ink-faint); }

    /* PlantTile — src/ui/plantPicture.tsx */
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
    .tile {
      display: flex; flex-direction: column; overflow: hidden;
      border-radius: 16px; border: 1px solid var(--line); background: var(--surface);
    }
    .tile-pic { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--sunk); }
    .plate { display: block; width: 100%; height: 100%; color: var(--line-strong); }
    .tile-strip { padding: 8px 12px 12px; }
    .tile-head { display: flex; align-items: baseline; gap: 4px; }
    .tile-name {
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: var(--display); font-size: 1.0625rem; line-height: 1.3125rem; font-weight: 500;
    }
    .tile-species {
      margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 0.8125rem; line-height: 1rem; color: var(--ink-muted);
    }

    /* RowLink — src/ui/rows.tsx; thumb + DaysSinceWater — src/ui/primitives.tsx */
    .row {
      display: flex; align-items: center; gap: 16px; min-height: 44px;
      padding: 10px; border-bottom: 1px solid var(--line);
    }
    .thumb { width: 40px; height: 40px; flex: none; overflow: hidden; border-radius: 6px; background: var(--sunk); }
    .row-text { display: flex; min-width: 0; flex: 1; flex-direction: column; }
    .row-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: var(--display); font-size: 1.09375rem; line-height: 1.375rem; font-weight: 500;
    }
    .row-sub {
      display: flex; align-items: baseline; min-width: 0;
      font-size: 0.8125rem; line-height: 1.0625rem; color: var(--ink-muted);
    }
    .sp { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .days { display: flex; flex: none; flex-direction: column; align-items: flex-end; gap: 1px; min-width: 64px; }
    .days-n { font-family: var(--mono); font-size: 1.375rem; line-height: 1.5rem; font-weight: 500; color: var(--ink); }
    .days-u { font-size: 0.6875rem; line-height: 0.75rem; color: var(--ink-faint); }
    .thirsty .days-n { color: var(--ember); font-weight: 600; }
    .thirsty .days-u { color: var(--ember); }

    /* The dormancy mark — src/ui/Dozing.tsx */
    .doze { display: inline-flex; align-items: flex-end; gap: 1px; font-family: var(--display);
            font-size: 0.6875rem; line-height: 1; color: var(--ink-faint); }
    .z { display: inline-block; animation: doze 2.8s cubic-bezier(0.2, 0.8, 0.24, 1) infinite; }
    .z1 { font-size: 0.55em; }
    .z2 { font-size: 0.75em; animation-delay: 0.35s; }
    .z3 { font-size: 1em; animation-delay: 0.7s; }
    @keyframes doze {
      0%   { opacity: 0; transform: translate(0, 0.15rem) scale(0.8); }
      25%  { opacity: 1; }
      100% { opacity: 0; transform: translate(0.35rem, -0.85rem) scale(1.1); }
    }
    @media (prefers-reduced-motion: reduce) { .z { animation: none; opacity: 1; transform: none; } }

    /* --- the treatments under study ------------------------------------- */

    /* Now: a fainter, smaller run of the same prose as the species. */
    .pl-prose { font-size: 0.75rem; line-height: 1rem; color: var(--ink-faint); }
    .pl-prose-inline { flex: none; font-size: 0.75rem; color: var(--ink-faint); }

    /* Label register: the type the app already uses to name a place. */
    .pl-label {
      font-size: 0.6875rem; line-height: 1rem; font-weight: 600;
      letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-faint);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .row-sub .pl-label { flex: none; margin-left: 10px; }
    .tile-strip .pl-label { margin-top: 3px; display: block; }

    /* Own lane: a chip on the picture, and a right-hand lane on the row. */
    .pl-chip {
      position: absolute; bottom: 8px; left: 8px;
      border-radius: 999px; background: var(--floating);
      padding: 3px 9px; font-size: 0.6875rem; line-height: 1rem; font-weight: 600;
      color: var(--ink-muted);
    }
    .pl-lane {
      flex: none; width: 84px; text-align: right;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 0.75rem; color: var(--ink-faint);
    }

    /* Pin: the same glyph the form uses over "Where it lives". */
    .pl-pin { display: flex; align-items: center; gap: 4px; color: var(--ink-faint);
              font-size: 0.75rem; line-height: 1rem; }
    .row-sub .pl-pin { flex: none; margin-left: 10px; }
    .tile-strip .pl-pin { margin-top: 3px; }
    .pin { width: 11px; height: 11px; flex: none; }
"""

# name, species, place, days, thirsty, dormant
TILES = [
    ("Gruyère", "Monstera deliciosa", "Woonkamer", None, False, False),
    ("Nore", "Alocasia zebrina", "Studeerkamer", None, False, False),
    ("Winterslaap", "Caladium albo", "Slaapkamer", None, False, True),
    ("Wolk", "Calathea orbifolia", "Slaapkamer", None, False, False),
]
ROWS = [
    ("Wolk", "Calathea orbifolia", "Slaapkamer", 12, True, False),
    ("Gruyère", "Monstera deliciosa", "Woonkamer", 7, False, False),
    ("Nore", "Alocasia zebrina", "Studeerkamer", 4, False, False),
]


def tile(d, name, species, place, dormant):
    overlay = '<span class="pl-chip">%s</span>' % place if d == "lane" else ""
    head = '<span class="tile-name">%s</span>%s' % (name, ZZZ if dormant else "")
    if d == "now":
        line = '<div class="pl-prose">%s</div>' % place
    elif d == "label":
        line = '<div class="pl-label">%s</div>' % place
    elif d == "pin":
        line = '<div class="pl-pin">%s<span>%s</span></div>' % (PIN, place)
    else:
        line = ""
    return ('      <a class="tile" href="#">\n'
            '        <div class="tile-pic">%s%s</div>\n'
            '        <div class="tile-strip">\n'
            '          <div class="tile-head">%s</div>\n'
            '          <div class="tile-species">%s</div>\n'
            '%s'
            '        </div>\n'
            '      </a>\n' % (PLATE, overlay, head, species,
                              ("          %s\n" % line) if line else ""))


def row(d, name, species, place, days, thirsty):
    if d == "now":
        sub = '<span class="sp">%s</span><span class="pl-prose-inline">&nbsp;· %s</span>' % (species, place)
    elif d == "label":
        sub = '<span class="sp">%s</span><span class="pl-label">%s</span>' % (species, place)
    elif d == "pin":
        sub = '<span class="sp">%s</span><span class="pl-pin">%s<span>%s</span></span>' % (species, PIN, place)
    else:
        sub = '<span class="sp">%s</span>' % species
    lane = '<span class="pl-lane">%s</span>' % place if d == "lane" else ""
    return ('      <a class="row%s" href="#">\n'
            '        <span class="thumb">%s</span>\n'
            '        <span class="row-text">\n'
            '          <span class="row-name">%s</span>\n'
            '          <span class="row-sub">%s</span>\n'
            '        </span>\n'
            '%s'
            '        <span class="days"><span class="days-n">%d</span><span class="days-u">days</span></span>\n'
            '      </a>\n' % (" thirsty" if thirsty else "", PLATE, name, sub,
                              ("        %s\n" % lane) if lane else "", days))


def build(d, comment):
    tiles = "".join(tile(d, n, s, p, dm) for n, s, p, _, _, dm in TILES)
    rows = "".join(row(d, n, s, p, days, th) for n, s, p, days, th, _ in ROWS)
    return """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap">
  <style>%s  </style>
</helmet>
<!-- %s -->
<div class="screen">
  <div class="drawer">
    <span class="drawer-name">Collection &mdash; A&ndash;Z</span>
    <span class="drawer-rule"></span>
    <span class="drawer-count">4</span>
  </div>
  <div class="grid">
%s  </div>

  <div class="drawer">
    <span class="drawer-name">Today &mdash; thirstiest</span>
    <span class="drawer-rule"></span>
    <span class="drawer-count">3</span>
  </div>
  <div>
%s  </div>
</div>
</x-dc>
</body>
</html>
""" % (CSS, comment, tiles, rows)


FILES = {
    # Main is the decision: the place is not shown on a phone at all.
    "Main.dc.html": ("none", "Chosen and shipped: the place is not shown on a phone; the drawer label carries it."),
    "Before.dc.html": ("now", "What this replaced: the place as the same prose as the species, one step smaller and fainter."),
    "LabelRegister.dc.html": ("label", "Explored: the place in the app's own uppercase, tracked place type."),
    "OwnLane.dc.html": ("lane", "Explored: the place leaves the text — a chip on the picture, a fixed lane on the row."),
    "Marker.dc.html": ("pin", "Explored: the place keeps its prose but gains the pin glyph from 'Where it lives'."),
}

for fname, (d, comment) in FILES.items():
    open(fname, "w").write(build(d, comment))
    print("wrote", fname)
