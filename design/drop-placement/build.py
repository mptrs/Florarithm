"""
Three placements for the plant page's drop button on desktop.

Every measurement here is lifted from the running app, not eyeballed: the
sidebar is 248px (`w-62`), `main` pads 40px (`md:px-10`) around a 1024px
centred column (`max-w-5xl`), the hero is 288px tall (`md:h-72`) with a 12px
radius, the care column is 336px (`lg:w-[21rem]`) beside a 32px gap, and the
type ramp and palette are the resolved `@theme` tokens from `src/styles.css`.
"""

import pathlib

C = {
    "paper": "oklch(0.968 0.008 85)",
    "surface": "oklch(0.995 0.003 85)",
    "sunk": "oklch(0.944 0.01 85)",
    "line": "oklch(0.886 0.01 80)",
    "lineStrong": "oklch(0.8 0.012 80)",
    "ink": "oklch(0.255 0.014 65)",
    "muted": "oklch(0.51 0.014 68)",
    "faint": "oklch(0.655 0.012 72)",
    "leaf": "oklch(0.455 0.098 152)",
    "leafTint": "oklch(0.944 0.026 152)",
    "water": "oklch(0.455 0.104 236)",
    "waterTint": "oklch(0.944 0.028 236)",
    "onAccent": "oklch(0.985 0.004 85)",
    "waterDeep": "oklch(0.405 0.104 236)",
}

MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace"
DISPLAY = "'Newsreader', Georgia, 'Times New Roman', serif"
SHADOW_MD = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
SHADOW_LG = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"

ICONS = {
    "droplet": '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    "flask": '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
    "sprout": '<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/><path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/><path d="M5 21h14"/>',
    "place": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    "qr": '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    "back": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "edit": '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    "chevron": '<path d="m6 9 6 6 6-6"/>',
    "more": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "rows": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "bookmark": '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    "sliders": '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
}


def icon(name, size=20, stroke=1.8):
    return (
        '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">%s</svg>'
        % (size, size, stroke, ICONS[name])
    )


def nav_item(label, name, active=False, count=None):
    if active:
        tone = "background:%s;color:%s;font-weight:600;" % (C["leafTint"], C["leaf"])
        count_colour = C["leaf"]
    else:
        tone = "color:%s;font-weight:500;" % C["muted"]
        count_colour = C["faint"]
    tail = ""
    if count is not None:
        tail = '<span style="font-family:%s;font-size:0.8125rem;color:%s">%s</span>' % (
            MONO, count_colour, count,
        )
    return (
        '<div style="display:flex;align-items:center;gap:10px;height:44px;border-radius:6px;'
        'padding:0 10px;font-size:0.9375rem;%s">%s<span style="flex:1">%s</span>%s</div>'
        % (tone, icon(name, 19), label, tail)
    )


def sidebar(foot=""):
    items = [
        nav_item("Today", "droplet"),
        nav_item("Collection", "rows", active=True, count="12"),
        nav_item("New plant", "plus"),
        nav_item("Wishlist", "bookmark", count="0"),
        nav_item("Settings", "sliders"),
    ]
    return (
        '<aside style="display:flex;flex-direction:column;width:248px;flex-shrink:0;'
        'border-right:1px solid %s;background:%s;padding:24px 14px">'
        '<span style="padding:0 10px 24px;font-family:%s;font-size:1.4375rem;font-weight:500;'
        'letter-spacing:-0.01em;color:%s">Florarithm</span>'
        '<nav style="display:flex;flex-direction:column;gap:2px">%s</nav>%s</aside>'
        % (C["line"], C["surface"], DISPLAY, C["ink"], "".join(items), foot)
    )


def hero_button(name, size=40):
    return (
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:%dpx;'
        'height:%dpx;border-radius:9999px;background:%s;color:%s;box-shadow:%s;flex-shrink:0">%s</span>'
        % (size, size, C["surface"], C["ink"], SHADOW_MD, icon(name, 19))
    )


def place_chip():
    return (
        '<span style="display:inline-flex;align-items:center;gap:6px;border-radius:9999px;'
        'background:%s;padding:8px 14px;font-size:0.875rem;font-weight:600;color:%s;box-shadow:%s">'
        '<span style="color:%s;display:inline-flex">%s</span>Keuken</span>'
        % (C["surface"], C["ink"], SHADOW_MD, C["leaf"], icon("place", 16))
    )


def drop(size=64, extra=""):
    return (
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:%dpx;'
        'height:%dpx;border-radius:9999px;background:%s;color:%s;box-shadow:%s;flex-shrink:0;%s">%s</span>'
        % (size, size, C["water"], C["onAccent"], SHADOW_LG, extra, icon("droplet", round(size * 0.47)))
    )


def ghost(dx, dy, size, name):
    """A fanned option drawn dashed, so the reach the fan needs is visible at rest."""
    return (
        '<span style="position:absolute;left:%dpx;top:%dpx;transform:translate(-50%%,-50%%);'
        'display:inline-flex;align-items:center;justify-content:center;width:%dpx;height:%dpx;'
        'border-radius:9999px;border:1.5px dashed %s;color:%s;opacity:0.6">%s</span>'
        % (dx, dy, size, size, C["lineStrong"], C["faint"], icon(name, round(size * 0.44)))
    )


def care_row(name, tone, label, detail, value, last=False):
    tint = {"water": C["waterTint"], "leaf": C["leafTint"]}[tone]
    colour = {"water": C["water"], "leaf": C["leaf"]}[tone]
    border = "" if last else "border-bottom:1px solid %s;" % C["line"]
    det = ""
    if detail:
        det = '<div style="margin-top:1px;font-size:0.8125rem;color:%s">%s</div>' % (C["faint"], detail)
    return (
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 0;%s">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;'
        'border-radius:9999px;background:%s;color:%s;flex-shrink:0">%s</span>'
        '<div style="min-width:0;flex:1"><div style="font-size:0.9375rem;font-weight:500">%s</div>%s</div>'
        '<div style="font-family:%s;font-size:0.8125rem;color:%s">%s</div></div>'
        % (border, tint, colour, icon(name, 19), label, det, MONO, C["muted"], value)
    )


def entry_row(label, detail, date, last=False):
    border = "" if last else "border-bottom:1px solid %s;" % C["line"]
    det = ""
    if detail:
        det = '<div style="margin-top:1px;font-size:0.8125rem;line-height:1.125rem;color:%s">%s</div>' % (
            C["muted"], detail,
        )
    return (
        '<div style="display:flex;align-items:center;gap:14px;padding:12px 18px;%s">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;'
        'border-radius:9999px;background:%s;color:%s;flex-shrink:0">%s</span>'
        '<div style="min-width:0;flex:1"><div style="font-size:0.9375rem;font-weight:500">%s</div>%s</div>'
        '<span style="font-family:%s;font-size:0.75rem;color:%s">%s</span></div>'
        % (border, C["waterTint"], C["water"], icon("droplet", 17), label, det, MONO, C["faint"], date)
    )


def card(inner, pad="0 18px"):
    return (
        '<div style="border:1px solid %s;border-radius:12px;background:%s;padding:%s">%s</div>'
        % (C["line"], C["surface"], pad, inner)
    )


def group_label(text, top=28):
    return (
        '<div style="margin-top:%dpx;margin-bottom:10px;font-size:0.75rem;line-height:1rem;'
        'letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">%s</div>'
        % (top, C["faint"], text)
    )


def page(hero_extra="", title_extra="", title_after="", record_extra="", sidebar_foot="", root_extra=""):
    """The desktop plant page at 1440x900, with slots for whichever placement is being shown."""
    care = card(
        care_row("droplet", "water", "Last watered", "every 8 days · 7–8", "6 days ago")
        + care_row("flask", "leaf", "Last fertilised", None, "never")
        + care_row("sprout", "leaf", "Last repot", None, "never", last=True),
    )
    details = card(
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 0">'
        '<span style="color:%s;display:inline-flex">%s</span>'
        '<span style="font-size:0.9375rem">14 cm · Soil</span></div>' % (C["faint"], icon("sprout", 19)),
    )
    history = card(
        entry_row("Water", None, "2 Sept")
        + entry_row("Water", None, "25 Aug")
        + entry_row("Water", None, "18 Aug", last=True),
        pad="0",
    )

    return (
        '<div style="position:relative;display:flex;width:1440px;height:900px;background:%s;'
        'color:%s;font-family:system-ui,-apple-system,sans-serif;font-size:1rem;line-height:1.5rem;'
        'overflow:hidden;%s">'
        '%s'
        '<main style="position:relative;flex:1;min-width:0;padding:32px 40px">'
        '<div style="position:relative;max-width:1024px;margin:0 auto">'

        # hero
        '<div style="position:relative;height:288px;border-radius:12px;background:%s;overflow:hidden">'
        '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style="width:100%%;height:100%%">'
        '<g fill="none" stroke="%s" stroke-width="2">'
        '<path d="M200 20c60 60 60 200 0 260-60-60-60-200 0-260z"/><path d="M200 30v250"/>'
        '<path d="M200 110c-30-10-55-5-70 10"/><path d="M200 110c30-10 55-5 70 10"/>'
        '<path d="M200 175c-30-10-55-5-70 10"/><path d="M200 175c30-10 55-5 70 10"/>'
        '</g></svg>'
        '<div style="position:absolute;left:16px;right:16px;top:16px;display:flex;justify-content:space-between">'
        '%s%s</div>'
        '<div style="position:absolute;left:16px;bottom:16px;display:flex;align-items:center;gap:8px">'
        '%s%s</div>'
        '%s</div>'

        # title row
        '<div style="position:relative;margin-top:24px;display:flex;align-items:flex-start;'
        'justify-content:space-between;gap:12px">'
        '<h1 style="margin:0;font-family:%s;font-size:2.5rem;line-height:2.6875rem;font-weight:500;'
        'letter-spacing:-0.025em">Gruyère</h1>'
        '<div style="display:flex;align-items:center;gap:8px">%s'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;'
        'border-radius:6px;color:%s">%s</span>%s</div></div>'
        '<p style="margin:6px 0 0;font-size:1.0625rem;line-height:1.5rem;color:%s">Monstera deliciosa</p>'

        # two columns
        '<div style="position:relative;display:flex;align-items:flex-start;gap:32px;margin-top:20px">'
        '<div style="order:1;min-width:0;flex:1">%s%s</div>'
        '<div style="order:2;width:336px;flex-shrink:0">%s%s%s%s</div>'
        '</div>'
        '%s'
        '</div></main></div>'
        % (
            C["paper"], C["ink"], root_extra,
            sidebar(sidebar_foot),
            C["sunk"], C["lineStrong"],
            hero_button("back"), hero_button("edit"),
            hero_button("qr"), place_chip(),
            hero_extra,
            DISPLAY,
            title_extra, C["muted"], icon("link", 20), title_after, C["muted"],
            history,
            '<p style="margin:14px 2px 0;font-size:0.8125rem;line-height:1.125rem;color:%s">'
            '3 entries — drag one left to remove it, right to change it.</p>' % C["faint"],
            group_label("Care", 0), care, group_label("Details"), details,
            record_extra,
        )
    )


DOC = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <style>
    body { margin: 0; background: PAPER; }
    a { color: LEAF; }
    a:hover { color: INK; }
  </style>
</helmet>
CONTENT
</x-dc>
</body>
</html>
"""


def write(name, content):
    doc = DOC.replace("CONTENT", content).replace("PAPER", C["paper"]).replace("LEAF", C["leaf"]).replace("INK", C["ink"])
    pathlib.Path(name).write_text(doc)
    print("wrote", name, len(doc), "bytes")


# --- Main: on the title row -------------------------------------------------
# The drop joins the row that already carries this plant's identity and its
# link button. Fan opens down and left, into the record it writes to.
main_fan = (
    '<span style="position:absolute;right:0;top:0;width:64px;height:64px;pointer-events:none">'
    + ghost(32, 100, 54, "flask")
    + ghost(-41, 68, 64, "droplet")
    + ghost(-66, -2, 46, "more")
    + "</span>"
)
write(
    "Main.dc.html",
    page(title_extra='<span style="position:relative;display:inline-flex">' + drop(56) + main_fan + "</span>"),
)

# --- In the photograph ------------------------------------------------------
# Docked into the hero's own lower-right corner, where the plant's picture is.
photo_fan = ghost(-105, -68, 54, "flask") + ghost(-178, -100, 64, "droplet") + ghost(-203, -30, 46, "more")
write(
    "InThePhotograph.dc.html",
    page(
        hero_extra='<div style="position:absolute;right:16px;bottom:16px">'
        + '<span style="position:relative;display:inline-flex">' + drop(64) + photo_fan + "</span></div>",
    ),
)

# --- At the foot of the sidebar --------------------------------------------
# Out of the content entirely; the fan opens up into the sidebar's own space.
side_fan = ghost(74, -68, 54, "flask") + ghost(147, -36, 64, "droplet") + ghost(172, 34, 46, "more")
write(
    "InTheSidebar.dc.html",
    page(
        sidebar_foot='<div style="margin-top:auto;padding-top:14px;border-top:1px solid %s">'
        '<div style="display:flex;align-items:center;gap:10px">'
        '<span style="position:relative;display:inline-flex">%s%s</span>'
        '<span style="font-size:0.9375rem;font-weight:500;color:%s">Log activity</span>'
        "</div></div>" % (C["line"], drop(56), side_fan, C["muted"]),
    ),
)

def split_button():
    """
    The desktop convention for one main action with variants: a filled primary
    segment, a hairline, and a caret that drops the rest. 48px and a 6px radius
    are the app's own control height and `rounded-md`; the divider is
    `--color-water-deep`, the token the button already uses for its hover.
    """
    return (
        '<span style="position:relative;display:inline-flex;align-items:stretch;height:48px;'
        'border-radius:6px;overflow:hidden;background:%s;color:%s;box-shadow:%s">'
        '<span style="display:inline-flex;align-items:center;gap:8px;padding:0 16px;font-size:1rem;'
        'font-weight:500">%sWater</span>'
        '<span style="width:1px;background:%s"></span>'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px">%s</span>'
        '</span>'
        % (C["water"], C["onAccent"], SHADOW_MD, icon("droplet", 20), C["waterDeep"], icon("chevron", 20))
    )


def menu_ghost():
    """Where the caret opens, drawn dashed like the fans on the other boards."""
    rows = ""
    for name, label, last in (("flask", "Watered with fertiliser", False), ("plus", "Log something else", True)):
        border = "" if last else "border-bottom:1px dashed %s;" % C["line"]
        rows += (
            '<div style="display:flex;align-items:center;gap:12px;height:52px;padding:0 16px;%s'
            'font-size:0.9375rem;font-weight:500;color:%s">%s%s</div>' % (border, C["faint"], icon(name, 19), label)
        )
    return (
        '<div style="position:absolute;right:0;top:56px;width:236px;border:1.5px dashed %s;'
        'border-radius:12px;opacity:0.7">%s</div>' % (C["lineStrong"], rows)
    )


write(
    "SplitButton.dc.html",
    page(
        title_after='<span style="position:relative;display:inline-flex">' + split_button() + menu_ghost() + "</span>",
    ),
)
