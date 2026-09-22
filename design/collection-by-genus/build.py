#!/usr/bin/env python3
"""
Builds the Collection-by-genus artboards.

One collection, written once below, rendered into every artboard — so the two
drawer-head variants, the phone and the desktop and the dark theme cannot
disagree about a single plant, a single count or a single hairline. Change the
table and rerun; never edit a `.dc.html` by hand.

The plants are the fourteen from `design/collection-redesign`, plus the
Anthurium run and the Philodendrons this sort exists to show. The plates come
from that canvas too (`plates.svg`), so the same fictional plant is drawn the
same way in both places.

Tokens are the ones in `src/styles.css`. Where a value is not a token it is an
optical adjustment on top of the ramp, exactly as the shipped code does.
"""

from pathlib import Path

HERE = Path(__file__).parent
PLATES = (HERE / "plates.svg").read_text()

FONTS = (
    "https://fonts.googleapis.com/css2?"
    "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400"
    "&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
)

LIGHT = """
      --paper:oklch(0.968 0.008 85); --surface:oklch(0.995 0.003 85);
      --sunk:oklch(0.944 0.010 85); --line:oklch(0.886 0.010 80);
      --line-strong:oklch(0.800 0.012 80); --ink:oklch(0.255 0.014 65);
      --ink-muted:oklch(0.510 0.014 68); --ink-faint:oklch(0.655 0.012 72);
      --leaf:oklch(0.455 0.098 152); --leaf-tint:oklch(0.944 0.026 152);
      --water:oklch(0.455 0.104 236); --water-tint:oklch(0.944 0.028 236);
      --ember:oklch(0.520 0.130 47); --ember-tint:oklch(0.948 0.034 47);
      --on-accent:oklch(0.985 0.004 85);
"""

DARK = """
      --paper:oklch(0.190 0.008 80); --surface:oklch(0.238 0.009 80);
      --sunk:oklch(0.155 0.008 80); --line:oklch(0.322 0.010 80);
      --line-strong:oklch(0.405 0.012 80); --ink:oklch(0.945 0.008 85);
      --ink-muted:oklch(0.735 0.012 80); --ink-faint:oklch(0.575 0.012 78);
      --leaf:oklch(0.760 0.110 152); --leaf-tint:oklch(0.300 0.040 152);
      --water:oklch(0.760 0.105 236); --water-tint:oklch(0.305 0.042 236);
      --ember:oklch(0.790 0.120 47); --ember-tint:oklch(0.322 0.048 47);
      --on-accent:oklch(0.180 0.010 80);
"""

CSS = """
      --display:'Newsreader',Georgia,'Times New Roman',serif;
      --ui:system-ui,-apple-system,'Segoe UI',sans-serif;
      --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace;
      --r-card:16px; --r-ctrl:12px;
    }
    body{margin:0;font-family:var(--ui);-webkit-font-smoothing:antialiased;}
    .mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}
    .label{font-size:11.5px;line-height:16px;font-weight:600;letter-spacing:0.09em;
           text-transform:uppercase;color:var(--ink-faint);}

    /* the drawer label above a run: name, rule, count */
    .drawer{display:flex;align-items:center;gap:10px;}
    .rule{flex-grow:1;height:1px;background:var(--line);}
    /* the same drawer with a name in it rather than a category */
    .genus{font-family:var(--display);font-size:19px;line-height:24px;font-weight:500;
           color:var(--ink);letter-spacing:-0.005em;}

    /* the tile */
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
    .tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-card);
          overflow:hidden;display:flex;flex-direction:column;}
    .ph{display:block;width:100%;height:118px;}
    .tb{padding:9px 11px 12px;}
    .tn{font-family:var(--display);font-size:17px;line-height:21px;font-weight:500;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .ts{margin-top:2px;font-size:12.5px;line-height:16px;color:var(--ink-faint);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:16px;}

    /* controls */
    .search{display:flex;align-items:center;gap:9px;height:46px;border-radius:var(--r-ctrl);
            border:1px solid var(--line-strong);background:var(--surface);padding:0 13px;}
    .chip{height:34px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;
          gap:7px;font-family:var(--ui);font-size:13.5px;font-weight:500;color:var(--ink-muted);
          border:1px solid var(--line-strong);background:transparent;cursor:pointer;}
    .chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink);font-weight:600;}

    /* the desktop ledger */
    .row{display:flex;align-items:center;gap:16px;height:62px;border-bottom:1px solid var(--line);}
    .rn{font-family:var(--display);font-size:17.5px;line-height:22px;font-weight:500;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .rs{margin-top:1px;font-size:13px;line-height:17px;color:var(--ink-muted);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:17px;}
    .cell{flex-shrink:0;font-size:14px;color:var(--ink-muted);white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;}
    .num{flex-shrink:0;font-family:var(--mono);font-variant-numeric:tabular-nums;
         font-size:13.5px;text-align:right;color:var(--ink-muted);}

    /* the tab bar */
    .nav{position:absolute;left:0;right:0;bottom:0;background:var(--surface);
         border-top:1px solid var(--line);display:flex;padding:9px 0 12px;overflow:visible;}
    .nv{flex-grow:1;display:flex;flex-direction:column;align-items:center;gap:4px;
        color:var(--ink-faint);font-size:10.5px;}
    .nv.on{color:var(--leaf);font-weight:600;}
"""


def page(body: str, theme: str = LIGHT) -> str:
    return (
        "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n"
        "  <script src=\"./support.js\"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n"
        '  <link rel="stylesheet" href="' + FONTS + '">\n  <style>\n    :root{'
        + theme + CSS + "  </style>\n</helmet>\n" + body + "\n</x-dc>\n</body>\n</html>\n"
    )


# ── The collection ────────────────────────────────────────────────────────────
# name, genus, epithet, place, system, pot (cm), days since water, plate
PLANTS = [
    ("Fluweel", "Anthurium", "clarinervium", "Living room", "Semi-hydro", 15, 6, "anthurium"),
    ("Fluweel II", "Anthurium", "clarinervium", "Living room", "Semi-hydro", 12, 6, "anthurium"),
    ("Sneeuw", "Anthurium", "crystallinum albo", "Study", "Semi-hydro", 12, 9, "anthurium"),
    ("Klein", "Anthurium", "forgetii", "Study", "Semi-hydro", 9, 16, "anthurium"),
    ("Inkt", "Anthurium", "papillilaminum × crystallinum", "Study", "Semi-hydro", 14, 4, "anthurium"),
    ("Vuur", "Anthurium", "(papillilaminum × crystallinum) 'Dark Mama'", "Study", "Semi-hydro", 15, 2, "anthurium"),
    ("Veer", "Anthurium", "veitchii", "Living room", "Semi-hydro", 17, 5, "anthurium"),
    ("Ninja", "Alocasia", "reginula 'Ninja'", "Bedroom", "Semi-hydro", 9, 4, "alocasia"),
    ("Zebra", "Alocasia", "zebrina", "Bedroom", "Semi-hydro", 17, 16, "alocasia"),
    ("Kaas", "Monstera", "adansonii", "Kitchen", "Semi-hydro", 12, 5, "monstera"),
    ("Gruyère", "Monstera", "deliciosa 'Thai Constellation'", "Living room", "Semi-hydro", 21, 8, "monstera"),
    ("Vlek", "Philodendron", "'Birkin'", "Bedroom", "Soil", 15, 7, "philodendron"),
    ("Spies", "Philodendron", "hastatum", "Living room", "Hydro", 14, 3, "philodendron"),
    ("Mos", "Philodendron", "melanochrysum", "Study", "Soil", 17, 11, "philodendron"),
    ("Varen", "Asplenium", "nidus", "Hallway", "Semi-hydro", 15, 5, "fern"),
    ("Spikkel", "Begonia", "maculata", "Kitchen", "Soil", 15, 4, "begonia"),
    ("Maan", "Ctenanthe", "burle-marxii", "Bedroom", "Soil", 15, 7, "none"),
    ("Draak", "Dracaena", "marginata", "Bedroom", "Soil", 21, 12, "dracaena"),
    ("Klimop", "Epipremnum", "aureum", "Kitchen", "Hydro", 14, 3, "pothos"),
    ("Stekel", "Euphorbia", "trigona", "Hallway", "Soil", 17, 29, "euphorbia"),
    ("Reus", "Ficus", "lyrata", "Living room", "Soil", 27, 11, "ficus"),
    ("Spriet", "Hoya", "", "Hallway", "Soil", 9, 12, "none"),
    ("Pepernoot", "Peperomia", "argyreia", "Kitchen", "Soil", 12, 9, "peperomia"),
    ("Kurk", "Rhaphidophora", "tetrasperma", "Hallway", "Hydro", 12, 3, "rhaphidophora"),
    ("Slaapkop", "Sansevieria", "trifasciata", "Bedroom", "Soil", 19, 23, "sansevieria"),
]

THIRSTY_AFTER_DAYS = 14

NAME, GENUS, EPITHET, PLACE, SYSTEM, POT, DAYS, PLATE = range(8)


def epithet_key(plant) -> tuple:
    """Sorted by the epithet, with the punctuation that is not part of a name
    stripped out first — so `(papillilaminum × crystallinum) 'Dark Mama'` files
    under `papillilaminum`, directly after the cross it was selected out of, and
    `'Birkin'` files under B. A plant identified no further than its genus has
    no epithet to sort on and goes last, on its name."""
    epithet = plant[EPITHET].lstrip("(").lstrip("'").lower()
    return (epithet == "", epithet, plant[NAME].lower())


def by_genus(plants):
    """Genera alphabetically; inside one, by epithet."""
    order = sorted({p[GENUS] for p in plants})
    return [(g, sorted([p for p in plants if p[GENUS] == g], key=epithet_key)) for g in order]


def species(plant) -> str:
    """The whole name, as `formatSpecies` writes it."""
    return " ".join(part for part in (plant[GENUS], plant[EPITHET]) if part)


# ── Pieces ────────────────────────────────────────────────────────────────────

def plate(name: str, cls: str = "", style: str = "") -> str:
    return (
        f'<svg class="{cls}" viewBox="0 0 100 76" preserveAspectRatio="xMidYMid slice" '
        f'style="{style}"><use href="#pl-{name}" width="100" height="76" /></svg>'
    )


def drawer(name: str, count: int, serif: bool, margin: str) -> str:
    """The run's head. `serif` is the whole question this canvas asks: a place
    is a drawer in a cabinet and gets the cabinet's uppercase label; a genus is
    a name, and the app sets names in Newsreader."""
    head = (
        f'<span class="genus">{name}</span>'
        if serif
        else f'<span class="label">{name}</span>'
    )
    return (
        f'<div class="drawer" style="margin:{margin}">{head}<span class="rule"></span>'
        f'<span class="mono" style="font-size:12px;color:var(--ink-faint)">{count}</span></div>'
    )


def tile(plant, secondary: str) -> str:
    return (
        '<div class="tile"><div style="position:relative">'
        + plate(plant[PLATE], cls="ph")
        + f'</div><div class="tb"><div class="tn">{plant[NAME]}</div>'
        f'<div class="ts">{secondary}</div></div></div>'
    )


def grid(plants, secondary_of, style: str = "") -> str:
    tiles = "".join(tile(p, secondary_of(p)) for p in plants)
    return f'<div class="grid" style="{style}">{tiles}</div>'


def row(plant, secondary: str, show_place: bool) -> str:
    days = plant[DAYS]
    thirsty = days >= THIRSTY_AFTER_DAYS
    day_style = (
        "color:var(--ember);font-weight:600" if thirsty else "color:var(--ink);font-weight:500"
    )
    place = (
        f'<span class="cell" style="width:128px">{plant[PLACE]}</span>' if show_place else ""
    )
    return (
        '<div class="row">'
        '<span style="flex-shrink:0;width:40px;height:40px;border-radius:6px;overflow:hidden;'
        'display:block;background:var(--sunk)">'
        + plate(plant[PLATE], style="width:100%;height:100%;display:block")
        + '</span><div style="flex-grow:1;min-width:0">'
        f'<div class="rn">{plant[NAME]}</div><div class="rs">{secondary}</div></div>'
        f'<div style="display:flex;align-items:center;gap:32px">{place}'
        f'<span class="cell" style="width:104px">{plant[SYSTEM]}</span>'
        f'<span class="num" style="width:44px">{plant[POT]}</span>'
        f'<span class="num" style="width:64px;{day_style}">{days}</span></div></div>'
    )


COLUMNS = (
    '<div style="display:flex;align-items:center;gap:16px;padding:0 0 10px;'
    'border-bottom:1px solid var(--line-strong)">'
    '<span style="flex-shrink:0;width:40px"></span>'
    '<span class="label" style="flex-grow:1;min-width:0;color:var(--ink-muted)">Plant</span>'
    '<div style="display:flex;align-items:center;gap:32px">'
    '<span class="label" style="width:128px;color:var(--ink-muted)">Place</span>'
    '<span class="label" style="width:104px;color:var(--ink-muted)">System</span>'
    '<span class="label" style="width:44px;text-align:right;color:var(--ink-muted)">Pot</span>'
    '<span class="label" style="width:64px;text-align:right;color:var(--ink-muted)">Days</span>'
    "</div></div>"
)


def icon(d: str, stroke: str = "currentColor", size: int = 23, extra: str = "") -> str:
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" '
        f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" '
        f'style="display:block;flex-shrink:0;{extra}">{d}</svg>'
    )


DROPLET = '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />'
ROWS = '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M21 9H3" /><path d="M21 15H3" />'
BOOKMARK = '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />'
SLIDERS = '<path d="M10 5H3" /><path d="M12 19H3" /><path d="M14 3v4" /><path d="M16 17v4" /><path d="M21 12H3" /><path d="M21 19h-5" /><path d="M21 5h-7" /><path d="M8 10v4" />'
PLUS = '<path d="M5 12h14" /><path d="M12 5v14" />'
SEARCH = '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />'
CHEVRON = '<path d="m9 18 6-6-6-6" />'

TAB_BAR = (
    '<div class="nav">'
    '<div class="nv">' + icon(DROPLET, "var(--ink-faint)") + "<span>Today</span></div>"
    '<div class="nv on">' + icon(ROWS, "var(--leaf)") + "<span>Collection</span></div>"
    '<div class="nv" style="color:var(--leaf)">'
    '<span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;'
    'margin-top:-17px;border-radius:999px;background:var(--leaf);color:var(--on-accent)">'
    + icon(PLUS, "currentColor", 25)
    + '</span><span style="font-weight:500">New</span></div>'
    '<div class="nv">' + icon(BOOKMARK, "var(--ink-faint)") + "<span>Wishlist</span></div>"
    '<div class="nv">' + icon(SLIDERS, "var(--ink-faint)") + "<span>Settings</span></div>"
    "</div>"
)


def sidebar_stop(label: str, glyph: str, count: str = "", active: bool = False) -> str:
    colour = "var(--leaf)" if active else "var(--ink-muted)"
    ground = "background:var(--leaf-tint);" if active else ""
    weight = "600" if active else "500"
    tail = (
        f'<span class="mono" style="font-size:13px;color:{colour}">{count}</span>' if count else ""
    )
    return (
        f'<div style="display:flex;align-items:center;gap:10px;height:44px;border-radius:6px;'
        f'padding:0 10px;{ground}color:{colour};font-size:15px;font-weight:{weight}">'
        + icon(glyph, colour, 19)
        + f'<span style="flex-grow:1">{label}</span>{tail}</div>'
    )


SIDEBAR = (
    '<div style="width:248px;flex-shrink:0;background:var(--surface);border-right:1px solid '
    'var(--line);padding:24px 14px;display:flex;flex-direction:column;gap:2px">'
    '<span style="padding:0 10px 22px;font-family:var(--display);font-size:23px;font-weight:500;'
    'letter-spacing:-0.01em">Florarithm</span>'
    + sidebar_stop("Today", DROPLET)
    + sidebar_stop("Collection", ROWS, "25", active=True)
    + sidebar_stop("Wishlist", BOOKMARK, "7")
    + sidebar_stop("New plant", PLUS)
    + sidebar_stop("Settings", SLIDERS)
    + "</div>"
)


def counts_link(font_size: int) -> str:
    """Left exactly as it ships: the plants, what was grown here, and the way
    through to Milestones. The genera are not added — the sort below already
    says how many there are, run by run."""
    return (
        f'<div style="display:flex;align-items:center;gap:4px;font-size:{font_size}px;'
        'color:var(--leaf)"><span><span class="mono">25</span> plants · '
        '<span class="mono">4</span> grown here</span>'
        + icon(CHEVRON, "var(--leaf)", 16)
        + "</div>"
    )


def sort_chips(gap: int = 8) -> str:
    return (
        f'<div style="display:flex;align-items:center;gap:{gap}px">'
        '<span class="label" style="margin-right:1px">Sort</span>'
        '<button type="button" class="chip">By place</button>'
        '<button type="button" class="chip on">By genus</button>'
        '<button type="button" class="chip">A&#8211;Z</button></div>'
    )


PHONE_HEADER = (
    '<div style="padding:22px 16px 0">'
    '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">'
    '<h1 style="margin:0;font-family:var(--display);font-size:32px;line-height:36px;'
    'font-weight:500;letter-spacing:-0.015em">Collection</h1>'
    + counts_link(13)
    + "</div>"
    '<div class="search" style="margin-top:16px">'
    + icon(SEARCH, "var(--ink-faint)", 18)
    + '<span style="font-size:15px;color:var(--ink-faint)">Name, species or place</span></div>'
    '<div style="margin-top:12px">' + sort_chips() + "</div></div>"
)


def phone(list_html: str, theme: str = LIGHT) -> str:
    return page(
        '<div style="position:relative;width:390px;height:844px;background:var(--paper);'
        'color:var(--ink);overflow:hidden">'
        + PLATES
        + list_html
        + TAB_BAR
        + "</div>",
        theme,
    )


def desktop(list_html: str, height: int = 1290) -> str:
    return page(
        f'<div style="display:flex;width:1440px;height:{height}px;background:var(--paper);'
        'color:var(--ink);overflow:hidden;font-family:var(--ui)">'
        + PLATES
        + SIDEBAR
        + '<div style="flex-grow:1;min-width:0;padding:32px 40px;overflow:hidden">'
        '<div style="max-width:1024px;margin:0 auto">'
        '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">'
        '<h1 style="margin:0;font-family:var(--display);font-size:34px;line-height:38px;'
        'font-weight:500;letter-spacing:-0.015em">Collection</h1>' + counts_link(13) + "</div>"
        '<div style="display:flex;align-items:center;gap:14px;margin-top:20px">'
        '<div class="search" style="width:300px">'
        + icon(SEARCH, "var(--ink-faint)", 18)
        + '<span style="font-size:15px;color:var(--ink-faint)">Name, species or place</span></div>'
        '<div style="display:flex;gap:8px"><button type="button" class="chip on">All</button>'
        '<button type="button" class="chip">Hydro</button>'
        '<button type="button" class="chip">Semi-hydro</button>'
        '<button type="button" class="chip">Soil</button></div>'
        '<div style="flex-grow:1"></div>' + sort_chips() + "</div>"
        '<div style="margin-top:26px">' + COLUMNS + list_html + "</div></div></div></div>"
    )


# ── The artboards ─────────────────────────────────────────────────────────────

RUNS = by_genus(PLANTS)
MULTI = [(g, members) for g, members in RUNS if len(members) > 1]
SINGLE = [(g, members) for g, members in RUNS if len(members) == 1]
ALONE = [members[0] for _, members in SINGLE]

EPITHET_OF = lambda p: p[EPITHET]
SPECIES_OF = lambda p: species(p)


def phone_list(serif: bool) -> str:
    """The top of the list: the first two runs, the second one cut by the
    bottom edge the way the collection always is."""
    out = [PHONE_HEADER, '<div style="padding:0 16px">']
    for index, (genus, members) in enumerate(MULTI[:2]):
        margin = "20px 0 10px" if index == 0 else "22px 0 10px"
        out.append(drawer(genus, len(members), serif, margin))
        out.append(grid(members, EPITHET_OF))
    out.append("</div>")
    return "".join(out)


def tail_list(serif: bool, collected: bool) -> str:
    """The foot of the same list, where a collection stops being runs and
    becomes one of everything. Scrolled: the last run is cut by the top edge."""
    out = ['<div style="padding:0 16px;margin-top:-108px">']
    genus, members = MULTI[-1]
    out.append(drawer(genus, len(members), serif, "0 0 10px"))
    out.append(grid(members, EPITHET_OF))

    if collected:
        # The one drawer that keeps the cabinet label even in the serif variant:
        # "One of each" is a category, not a name, and the serif is reserved for
        # things somebody named. It is also why the tiles under it carry the
        # whole species again — the label above them is no longer saying the
        # genus, so the genus goes back in the line.
        out.append(drawer("One of each", len(ALONE), False, "22px 0 10px"))
        out.append(grid(ALONE, SPECIES_OF))
    else:
        for genus, members in SINGLE:
            out.append(drawer(genus, 1, serif, "22px 0 10px"))
            out.append(grid(members, EPITHET_OF))
    out.append("</div>")
    return "".join(out)


def desktop_list(serif: bool) -> str:
    out = []
    for index, (genus, members) in enumerate(MULTI):
        out.append(drawer(genus, len(members), serif, "22px 0 6px" if index else "18px 0 6px"))
        for plant in members:
            out.append(row(plant, plant[EPITHET], show_place=True))
    return "".join(out)


ARTBOARDS = {
    "Serif.dc.html": phone(phone_list(serif=True)),
    "Label.dc.html": phone(phone_list(serif=False)),
    "Tail.dc.html": phone(tail_list(serif=True, collected=False)),
    "Rest.dc.html": phone(tail_list(serif=True, collected=True)),
    "Dark.dc.html": phone(phone_list(serif=True), DARK),
    "DesktopSerif.dc.html": desktop(desktop_list(serif=True)),
    "DesktopLabel.dc.html": desktop(desktop_list(serif=False)),
}


if __name__ == "__main__":
    for filename, html in ARTBOARDS.items():
        (HERE / filename).write_text(html)
        print(f"{filename}  {len(html):>6} bytes")
    print()
    for genus, members in RUNS:
        print(f"  {genus:<14} {len(members)}  " + ", ".join(p[NAME] for p in members))
