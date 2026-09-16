"""
Sparring board: what if fertiliser is always in the water?

Then "watered" and "watered with fertiliser" are the same thing, and the drop
only has one watering to offer. Four ways to give that one action to the
thumb, the log sheet with one watering circle, where the habit is switched
on, and the desktop title row.

Tokens, sizes and icons are lifted from `src/styles.css`, `src/ui/Icon.tsx`,
`src/ui/ActionDial.tsx`, `src/ui/Sheet.tsx`, `src/screens/LogSheet.tsx` and
`src/layout/AppShell.tsx`. The desktop page is reused from `../drop-placement`.
"""

import json
import pathlib

HERE = pathlib.Path(__file__).parent

# --- the desktop page, borrowed ---------------------------------------------
src = (HERE.parent / "drop-placement" / "build.py").read_text()
src = src.split("# --- Main: on the title row")[0]
src = src.replace('+ care_row("flask", "leaf", "Last fertilised", None, "never")\n', "")
ns = {"__file__": str(HERE / "borrowed.py")}
exec(src, ns)
C, MONO, DISPLAY, SHADOW_MD, SHADOW_LG, DOC = (
    ns["C"], ns["MONO"], ns["DISPLAY"], ns["SHADOW_MD"], ns["SHADOW_LG"], ns["DOC"],
)
C["scrim"] = "oklch(0.255 0.014 65 / 0.45)"
C["floating"] = "oklch(0.995 0.003 85 / 0.9)"
SANS = "system-ui,-apple-system,sans-serif"

ICONS = dict(ns["ICONS"])
ICONS.update({
    "pot": ICONS["sprout"],
    "home": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "leaf": '<path d="M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20"/><path d="M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13"/>',
    "bloom": '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>',
    "note": '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    "image": '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    "close": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "calendar": '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
    "edit": '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
    "sync": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
})


def icon(name, size=20, stroke=1.8):
    return (
        '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" style="display:block">%s</svg>'
        % (size, size, stroke, ICONS[name])
    )


def circle(size, bg, fg, name, shadow=SHADOW_LG, extra=""):
    return (
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:%dpx;height:%dpx;'
        'border-radius:9999px;background:%s;color:%s;box-shadow:%s;flex-shrink:0;%s">%s</span>'
        % (size, size, bg, fg, shadow, extra, icon(name, round(size * 0.46)))
    )


def at(cx, cy, inner, size):
    """Absolutely place something by its centre, in phone coordinates."""
    return '<div style="position:absolute;left:%dpx;top:%dpx;width:%dpx;height:%dpx">%s</div>' % (
        cx - size / 2, cy - size / 2, size, size, inner,
    )


# --- the phone plant page ---------------------------------------------------
W, H = 390, 844
DROP_CX, DROP_CY = W - 16 - 32, H - 108 - 32  # right-4, bottom-[5.875rem] over the safe area


def floating_button(name):
    return (
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;'
        'border-radius:9999px;background:%s;color:%s;box-shadow:%s">%s</span>'
        % (C["floating"], C["ink"], SHADOW_MD, icon(name, 19))
    )


def hero():
    return (
        '<div style="position:absolute;left:0;top:0;width:%dpx;height:340px;background:%s;overflow:hidden">'
        '<svg viewBox="0 0 390 340" style="position:absolute;inset:0;width:100%%;height:100%%">'
        '<g fill="none" stroke="%s" stroke-width="2">'
        '<path d="M195 40c60 60 60 200 0 260-60-60-60-200 0-260z"/><path d="M195 50v250"/>'
        '<path d="M195 130c-30-10-55-5-70 10"/><path d="M195 130c30-10 55-5 70 10"/>'
        '<path d="M195 195c-30-10-55-5-70 10"/><path d="M195 195c30-10 55-5 70 10"/></g></svg>'
        '<div style="position:absolute;left:16px;right:16px;top:16px;display:flex;justify-content:space-between">%s%s</div>'
        '<div style="position:absolute;left:16px;bottom:36px;display:flex;align-items:center;gap:8px">%s'
        '<span style="display:inline-flex;align-items:center;gap:6px;border-radius:9999px;background:%s;'
        'padding:8px 14px;font-size:0.875rem;font-weight:600;color:%s;box-shadow:%s">'
        '<span style="color:%s;display:inline-flex">%s</span>Keuken</span></div></div>'
        % (
            W, C["sunk"], C["lineStrong"], floating_button("back"), floating_button("edit"),
            floating_button("qr"), C["floating"], C["ink"], SHADOW_MD, C["leaf"], icon("place", 16),
        )
    )


def care_row(name, tint, colour, label, detail, value, last=False, right=None):
    border = "" if last else "border-bottom:1px solid %s;" % C["line"]
    det = '<div style="margin-top:1px;font-size:0.8125rem;color:%s">%s</div>' % (C["faint"], detail) if detail else ""
    tail = right or '<div style="font-family:%s;font-size:0.875rem;color:%s">%s</div>' % (MONO, C["muted"], value)
    return (
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 0;%s">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;'
        'border-radius:9999px;background:%s;color:%s;flex-shrink:0">%s</span>'
        '<div style="min-width:0;flex:1"><div style="font-size:0.9375rem;font-weight:500">%s</div>%s</div>%s</div>'
        % (border, tint, colour, icon(name, 19), label, det, tail)
    )


def care_card(watered_row=None):
    watered = watered_row or care_row(
        "droplet", C["waterTint"], C["water"], "Last watered", "every 8 days · 7–8", "6 days ago",
    )
    return (
        '<div style="margin-top:14px;border:1px solid %s;border-radius:12px;background:%s;padding:0 18px">%s%s</div>'
        % (C["line"], C["surface"], watered,
           care_row("pot", C["leafTint"], C["leaf"], "Last repot", None, "never", last=True))
    )


def nav(plants=True):
    items = [("home", "Today", False), ("rows", "Plants", plants), ("plus", "New", None), ("bookmark", "Wishlist", False), ("sliders", "Settings", not plants)]
    out = ""
    for name, label, active in items:
        if active is None:
            glyph = '<span style="margin-top:-18px;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:9999px;background:%s;color:%s">%s</span>' % (C["leaf"], C["onAccent"], icon(name, 26))
            colour = C["leaf"]
        else:
            glyph = icon(name, 23)
            colour = C["leaf"] if active else C["faint"]
        weight = "font-weight:600;" if active else ""
        out += (
            '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding-bottom:10px;color:%s">'
            '%s<span style="font-size:0.6875rem;line-height:1rem;%s">%s</span></div>' % (colour, glyph, weight, label)
        )
    return (
        '<div style="position:absolute;left:0;right:0;bottom:0;display:flex;border-top:1px solid %s;'
        'background:%s;padding-top:10px;padding-bottom:22px">%s</div>' % (C["line"], C["surface"], out)
    )


def phone(care=None, over="", sheet=""):
    return (
        '<div style="position:relative;width:%dpx;height:%dpx;overflow:hidden;background:%s;color:%s;'
        'font-family:%s;font-size:1rem;line-height:1.5rem">'
        '%s'
        '<div style="position:absolute;left:0;right:0;top:316px;bottom:0;border-radius:28px 28px 0 0;background:%s;padding:20px 16px 0">'
        '<h1 style="margin:0;font-family:%s;font-size:2.5rem;line-height:2.6875rem;font-weight:500;letter-spacing:-0.025em">Gruyère</h1>'
        '<p style="margin:-4px 0 0;font-size:1.0625rem;line-height:1.5rem;color:%s">Monstera deliciosa</p>'
        '<div style="margin-top:20px;display:flex;border-bottom:1px solid %s">'
        '<div style="flex:1;height:48px;display:flex;align-items:center;justify-content:center;border-bottom:2px solid %s;margin-bottom:-1px;font-weight:600;color:%s">Care</div>'
        '<div style="flex:1;height:48px;display:flex;align-items:center;justify-content:center;font-weight:500;color:%s">History</div></div>'
        '%s</div>'
        '%s%s%s</div>'
        % (W, H, C["paper"], C["ink"], SANS, hero(), C["paper"], DISPLAY, C["muted"], C["line"],
           C["leaf"], C["leaf"], C["muted"], care or care_card(), nav(), over, sheet)
    )


def scrim(z=""):
    return '<div style="position:absolute;inset:0;background:%s;backdrop-filter:blur(4px)%s"></div>' % (C["scrim"], z)


# --- A. the fan, down to two -----------------------------------------------
fan_two = phone(over=(
    scrim()
    + at(DROP_CX - 73, DROP_CY - 68, circle(64, C["water"], C["onAccent"], "droplet"), 64)
    + at(DROP_CX - 98, DROP_CY + 2, circle(46, C["ink"], C["paper"], "more"), 46)
    + at(DROP_CX, DROP_CY, circle(64, C["water"], C["onAccent"], "droplet"), 64)
))

# --- B. one tap pours --------------------------------------------------------
one_tap = phone(
    care=care_card(care_row("droplet", C["waterTint"], C["water"], "Last watered", "every 8 days · 7–8", "today")),
    over=(
        at(DROP_CX - 32 - 12 - 23, DROP_CY, circle(46, C["ink"], C["paper"], "more", shadow=SHADOW_MD), 46)
        + at(DROP_CX, DROP_CY, circle(64, C["water"], C["onAccent"], "droplet"), 64)
        # the splash, frozen mid-flight
        + "".join(
            at(DROP_CX + dx, DROP_CY + dy, '<span style="display:block;width:%dpx;height:%dpx;border-radius:9999px;background:%s;opacity:0.75"></span>' % (s, s, C["water"]), s)
            for dx, dy, s in ((-44, -40, 9), (-8, -58, 7), (30, -46, 8), (-56, -6, 6), (40, -14, 6))
        )
        + at(DROP_CX, DROP_CY, '<span style="display:block;width:96px;height:96px;border-radius:9999px;border:2px solid %s;opacity:0.35"></span>' % C["water"], 96)
    ),
)

# --- C. hold to pour ---------------------------------------------------------
ring = (
    '<svg width="84" height="84" viewBox="0 0 84 84" style="display:block;transform:rotate(-90deg)">'
    '<circle cx="42" cy="42" r="39" fill="none" stroke="%s" stroke-width="4"/>'
    '<circle cx="42" cy="42" r="39" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" '
    'stroke-dasharray="245" stroke-dashoffset="80"/></svg>' % (C["waterTint"], C["water"])
)
hint = (
    '<div style="position:absolute;right:16px;top:%dpx;display:flex;align-items:center;gap:8px;'
    'border-radius:10px;background:%s;padding:8px 12px;box-shadow:%s;font-size:0.875rem;font-weight:600;color:%s">'
    '<span style="color:%s;display:inline-flex">%s</span>Hold to water</div>'
    % (DROP_CY - 32 - 26 - 40, C["surface"], SHADOW_LG, C["ink"], C["water"], icon("droplet", 16))
)
hold = phone(over=(
    at(DROP_CX, DROP_CY, ring, 84)
    + at(DROP_CX, DROP_CY, circle(64, C["water"], C["onAccent"], "droplet", extra="transform:scale(0.94)"), 64)
    + hint
))

# --- D. the button sits by the fact it changes --------------------------------
water_button = (
    '<span style="display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border-radius:6px;'
    'background:%s;color:%s;font-size:0.9375rem;font-weight:500;box-shadow:%s">%sWater</span>'
    % (C["water"], C["onAccent"], SHADOW_MD, icon("droplet", 18))
)
in_card = phone(
    care=care_card(care_row(
        "droplet", C["waterTint"], C["water"], "Last watered",
        '<span style="font-family:%s;color:%s">6 days ago</span> · every 8 days' % (MONO, C["muted"]),
        None, right=water_button,
    )),
    over=at(DROP_CX + 4, DROP_CY + 4, circle(56, C["ink"], C["paper"], "plus"), 56),
)


# --- the log sheet -----------------------------------------------------------
FILL = {"water": (C["water"], C["onAccent"]), "leaf": (C["leaf"], C["onAccent"]), "ink": (C["ink"], C["paper"])}


def action(name, tone, label):
    bg, fg = FILL[tone]
    return (
        '<div style="display:flex;flex-direction:column;align-items:center;gap:10px">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;'
        'border-radius:9999px;background:%s;color:%s;box-shadow:%s">%s</span>'
        '<span style="font-size:0.8125rem;line-height:1.125rem;font-weight:500">%s</span></div>'
        % (bg, fg, SHADOW_MD, icon(name, 26), label)
    )


def group(label, actions, first=False):
    border = "" if first else "border-top:1px solid %s;padding-top:16px;" % C["line"]
    return (
        '<div style="margin-top:20px;%s">'
        '<div style="font-size:0.75rem;line-height:1rem;letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">%s</div>'
        '<div style="margin-top:12px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));row-gap:20px;column-gap:12px">%s</div></div>'
        % (border, C["faint"], label, "".join(action(*a) for a in actions))
    )


def chip(name, text):
    return (
        '<span style="display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:9999px;'
        'border:1px solid %s;background:%s;font-size:0.875rem;font-weight:500;color:%s">'
        '<span style="color:%s;display:inline-flex">%s</span>%s</span>'
        % (C["line"], C["surface"], C["ink"], C["faint"], icon(name, 16), text)
    )


def sheet(groups_html, top):
    return (
        '<div style="position:absolute;left:0;right:0;top:%dpx;bottom:0;background:%s;border-top:1px solid %s;'
        'border-radius:26px 26px 0 0;padding:10px 20px 0">'
        '<div style="margin:0 auto;width:36px;height:4px;border-radius:9999px;background:%s"></div>'
        '<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">'
        '<span style="width:44px;height:44px"></span>'
        '<h2 style="margin:0;font-family:%s;font-size:1.625rem;line-height:2rem;font-weight:500">Log activity</h2>'
        '<span style="width:44px;height:44px;margin-right:-10px;display:inline-flex;align-items:center;justify-content:center;color:%s">%s</span></div>'
        '<div style="margin-top:12px;display:flex;justify-content:center;gap:8px">%s%s</div>'
        '%s</div>'
        % (top, C["surface"], C["line"], C["lineStrong"], DISPLAY, C["muted"], icon("close", 22),
           chip("calendar", "Today"), chip("image", "Photo"), groups_html)
    )


PLANT = [("leaf", "leaf", "New leaf"), ("bloom", "leaf", "Blooming"), ("pot", "leaf", "Repot")]
WRITTEN = [("note", "ink", "Note"), ("image", "ink", "Photo")]

sheet_alone = phone(over=scrim(), sheet=sheet(
    group("Watering", [("droplet", "water", "Water")], first=True)
    + group("The plant", PLANT) + group("Written down", WRITTEN),
    top=196,
))

sheet_merged = phone(over=scrim(), sheet=sheet(
    group("You did", [("droplet", "water", "Water"), ("pot", "leaf", "Repot")], first=True)
    + group("The plant did", PLANT[:2]) + group("Written down", WRITTEN),
    top=196,
))


# --- settings: where the habit lives ----------------------------------------
def section(name, title, body):
    return (
        '<div style="display:flex;flex-direction:column;gap:16px">'
        '<div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid %s;padding-bottom:10px">'
        '<span style="color:%s;display:inline-flex">%s</span>'
        '<h2 style="margin:0;font-family:%s;font-size:1.3125rem;line-height:1.75rem;font-weight:500">%s</h2></div>%s</div>'
        % (C["line"], C["faint"], icon(name, 19), DISPLAY, title, body)
    )


toggle_row = (
    '<div style="display:flex;align-items:flex-start;gap:16px">'
    '<div style="flex:1;min-width:0">'
    '<div style="font-size:1rem;font-weight:500">Fertiliser goes in every watering</div>'
    '<p style="margin:4px 0 0;font-size:0.9375rem;line-height:1.5rem;color:%s;text-wrap:pretty">'
    'Watering is one button, and every watering counts as fed. Turn it off the day that stops being true — '
    'what you already logged stays as it was.</p></div>'
    '<span style="margin-top:2px;flex-shrink:0;position:relative;width:50px;height:30px;border-radius:9999px;background:%s">'
    '<span style="position:absolute;right:3px;top:3px;width:24px;height:24px;border-radius:9999px;background:%s;box-shadow:%s"></span></span></div>'
    % (C["muted"], C["leaf"], C["surface"], SHADOW_MD)
)

settings = (
    '<div style="position:relative;width:%dpx;height:%dpx;overflow:hidden;background:%s;color:%s;font-family:%s;'
    'font-size:1rem;line-height:1.5rem">'
    '<div style="padding:24px 16px 0;display:flex;flex-direction:column;gap:40px">'
    '<h1 style="margin:0;font-family:%s;font-size:2.125rem;line-height:2.375rem;font-weight:500;letter-spacing:-0.015em">Settings</h1>'
    '%s%s</div>%s</div>'
    % (W, H, C["paper"], C["ink"], SANS, DISPLAY,
       section("droplet", "Care", toggle_row),
       section("sync", "Sync", '<p style="margin:0;font-size:0.9375rem;color:%s">Synced 2 minutes ago</p>' % C["muted"]),
       nav(plants=False))
)


# --- desktop: two plain buttons instead of a split ---------------------------
def desk_buttons():
    return (
        '<span style="display:inline-flex;gap:8px">'
        '<span style="display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-radius:6px;'
        'background:%s;color:%s;font-size:1rem;font-weight:500;box-shadow:%s">%sWater</span>'
        '<span style="display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-radius:6px;'
        'border:1px solid %s;background:%s;color:%s;font-size:1rem;font-weight:500">%sLog activity</span></span>'
        % (C["water"], C["onAccent"], SHADOW_MD, icon("droplet", 20), C["lineStrong"], C["surface"], C["ink"], icon("plus", 20))
    )


desktop = ns["page"](title_after=desk_buttons())


# --- round two: the log sheet, now that water is one press ------------------
ICONS.update({
    "link": ICONS["link"],
    "chevronRight": '<path d="m9 18 6-6-6-6"/>',
    "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
})


def title_icons():
    """The name's row as it now ships: the tag link, and Log activity as a quiet more."""
    btn = ('<span style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;'
           'border-radius:6px;color:%s">%s</span>')
    return ('<div style="position:absolute;right:16px;top:338px;display:flex;gap:8px">%s%s</div>'
            % (btn % (C["muted"], icon("link", 20)), btn % (C["ink"], icon("more", 22))))


def phone2(over="", sheet_html="", care=None):
    return phone(care=care, over=title_icons() + over, sheet=sheet_html)


def sheet_frame(top, body, chips=True):
    date = '<div style="margin-top:12px;display:flex;justify-content:center;gap:8px">%s%s</div>' % (
        chip("calendar", "Today"), chip("image", "Add a photo")) if chips else ""
    return (
        '<div style="position:absolute;left:0;right:0;top:%dpx;bottom:0;background:%s;border-top:1px solid %s;'
        'border-radius:26px 26px 0 0;padding:10px 20px 0">'
        '<div style="margin:0 auto;width:36px;height:4px;border-radius:9999px;background:%s"></div>'
        '<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">'
        '<span style="width:44px;height:44px"></span>'
        '<h2 style="margin:0;font-family:%s;font-size:1.625rem;line-height:2rem;font-weight:500">Log activity</h2>'
        '<span style="width:44px;height:44px;margin-right:-10px;display:inline-flex;align-items:center;justify-content:center;color:%s">%s</span></div>'
        '%s%s</div>'
        % (top, C["surface"], C["line"], C["lineStrong"], DISPLAY, C["muted"], icon("close", 22), date, body)
    )


LEAF = ("leaf", "leaf", "New leaf")
BLOOM = ("bloom", "leaf", "Blooming")
REPOT = ("pot", "leaf", "Repot")
NOTE = ("note", "ink", "Note")
PHOTO = ("image", "ink", "Photo")
WATER = ("droplet", "water", "Water")

# 1. Same sheet, water last and demoted to "another day".
earlier = (
    '<div style="margin-top:20px;border-top:1px solid %s;padding-top:14px;display:flex;align-items:center;gap:14px;height:48px">'
    '<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9999px;background:%s;color:%s">%s</span>'
    '<span style="flex:1;font-size:0.9375rem;font-weight:500">Watered on another day</span>'
    '<span style="color:%s;display:inline-flex">%s</span></div>'
    % (C["line"], C["waterTint"], C["water"], icon("droplet", 19), C["faint"], icon("chevronRight", 20))
)
water_last = phone2(over=scrim(), sheet_html=sheet_frame(
    270, group("The plant", [LEAF, BLOOM, REPOT], first=True) + group("Written down", [NOTE, PHOTO]) + earlier))

# 2. One grid, no group labels, in the order you reach for them.
grid_one = phone2(over=scrim(), sheet_html=sheet_frame(
    452,
    '<div style="margin-top:24px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));row-gap:20px;column-gap:12px">%s</div>'
    % "".join(action(*a) for a in (LEAF, BLOOM, PHOTO, REPOT, NOTE, WATER)),
))


# 3. A list, each row saying what it will ask for.
def list_row(name, tint, colour, label, hint, last=False):
    border = "" if last else "border-bottom:1px solid %s;" % C["line"]
    return (
        '<div style="display:flex;align-items:center;gap:14px;min-height:60px;%s">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9999px;background:%s;color:%s;flex-shrink:0">%s</span>'
        '<div style="flex:1;min-width:0"><div style="font-size:0.9375rem;font-weight:500">%s</div>'
        '<div style="font-size:0.8125rem;line-height:1.125rem;color:%s">%s</div></div>'
        '<span style="color:%s;display:inline-flex">%s</span></div>'
        % (border, tint, colour, icon(name, 19), label, C["faint"], hint, C["faint"], icon("chevronRight", 20))
    )


as_list = phone2(over=scrim(), sheet_html=sheet_frame(
    236,
    '<div style="margin-top:14px">%s</div>' % "".join([
        list_row("leaf", C["leafTint"], C["leaf"], "New leaf", "One tap, logged"),
        list_row("bloom", C["leafTint"], C["leaf"], "Blooming", "One tap, logged"),
        list_row("pot", C["leafTint"], C["leaf"], "Repot", "Pot size, medium, why"),
        list_row("note", C["sunk"], C["ink"], "Note", "Anything worth remembering"),
        list_row("image", C["sunk"], C["ink"], "Photo", "Just a picture"),
        list_row("droplet", C["waterTint"], C["water"], "Watered on another day", "For the day you forgot to log it", last=True),
    ]),
))


# 4. New: the photograph leads, and you say what is in it.
def tag(label, name, on=False):
    style = ("background:%s;color:%s;border:1px solid %s;" % (C["leaf"], C["onAccent"], C["leaf"]) if on
             else "background:%s;color:%s;border:1px solid %s;" % (C["surface"], C["ink"], C["lineStrong"]))
    return ('<span style="display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:9999px;'
            'font-size:0.9375rem;font-weight:500;%s">%s%s</span>' % (style, icon("check" if on else name, 16), label))


photo_first = phone2(over=scrim(), sheet_html=sheet_frame(
    150,
    '<div style="margin-top:16px;height:250px;border-radius:16px;background:%s;position:relative;overflow:hidden">'
    '<svg viewBox="0 0 350 250" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%%;height:100%%">'
    '<g fill="none" stroke="%s" stroke-width="2"><path d="M175 30c50 50 50 170 0 210-50-40-50-160 0-210z"/><path d="M175 40v200"/>'
    '<path d="M235 80c30-30 70-30 90-10-20 30-60 40-90 10z"/></g></svg>'
    '<span style="position:absolute;right:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;'
    'border-radius:6px;background:%s;font-size:0.875rem;font-weight:600;box-shadow:%s">%sRetake</span></div>'
    '<div style="margin-top:20px;font-size:0.75rem;line-height:1rem;letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">What does it show?</div>'
    '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">%s%s%s%s</div>'
    '<div style="margin-top:20px;display:flex;align-items:center;justify-content:center;height:48px;border-radius:6px;background:%s;'
    'color:%s;font-size:1rem;font-weight:500">Log new leaf with photo</div>'
    '<div style="margin-top:14px;text-align:center;font-size:0.875rem;color:%s">No photo? <span style="color:%s;font-weight:500">Log without one</span></div>'
    % (C["sunk"], C["lineStrong"], C["floating"], SHADOW_MD, icon("camera", 16), C["faint"],
       tag("New leaf", "leaf", on=True), tag("Blooming", "bloom"), tag("Repot", "pot"), tag("Just the plant", "image"),
       C["leaf"], C["onAccent"], C["muted"], C["leaf"]),
    chips=False,
))


# 5. New: say it in a sentence, and the sheet reads it back.
def heard(name, tint, colour, label, detail):
    return (
        '<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid %s">'
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:%s;color:%s">%s</span>'
        '<div style="flex:1"><div style="font-size:0.9375rem;font-weight:500">%s</div>'
        '<div style="font-size:0.8125rem;line-height:1.125rem;color:%s">%s</div></div>'
        '<span style="color:%s;display:inline-flex">%s</span></div>'
        % (C["line"], tint, colour, icon(name, 17), label, C["muted"], detail, C["faint"], icon("close", 18))
    )


say_it = phone2(over=scrim(), sheet_html=sheet_frame(
    196,
    '<div style="margin-top:16px;min-height:96px;border:1px solid %s;border-radius:6px;background:%s;padding:12px 14px;'
    'font-size:1.0625rem;line-height:1.625rem">New leaf unfurling, and repotted into 17 cm with pon<span style="display:inline-block;width:2px;height:20px;vertical-align:-4px;background:%s;margin-left:1px"></span></div>'
    '<div style="margin-top:20px;font-size:0.75rem;line-height:1rem;letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">Will be logged</div>'
    '<div style="margin-top:4px">%s%s</div>'
    '<div style="margin-top:20px;display:flex;align-items:center;justify-content:center;height:48px;border-radius:6px;background:%s;'
    'color:%s;font-size:1rem;font-weight:500">Log 2 entries</div>'
    '<div style="margin-top:14px;display:flex;justify-content:center;gap:20px;font-size:0.875rem;color:%s">'
    '<span>Or pick:</span><span style="color:%s;font-weight:500">New leaf</span><span style="color:%s;font-weight:500">Blooming</span>'
    '<span style="color:%s;font-weight:500">Repot</span><span style="color:%s;font-weight:500">Photo</span></div>'
    % (C["lineStrong"], C["surface"], C["leaf"], C["faint"],
       heard("leaf", C["leafTint"], C["leaf"], "New leaf", "unfurling"),
       heard("pot", C["leafTint"], C["leaf"], "Repot", "? → 17 cm · Pon"),
       C["leaf"], C["onAccent"], C["faint"], C["leaf"], C["leaf"], C["leaf"], C["leaf"]),
))

# --- round three: photo first, as whole flows --------------------------------
INK_DEEP = "oklch(0.185 0.014 65)"
PHOTO_BG = "oklch(0.82 0.035 120)"


def photo_art(w, h, extra=""):
    """A stand-in photograph: flat shapes, clearly a picture and clearly not a real one."""
    return (
        '<svg viewBox="0 0 390 340" preserveAspectRatio="xMidYMid slice" width="%d" height="%d" style="display:block;%s">'
        '<rect width="390" height="340" fill="%s"/>'
        '<rect x="0" y="250" width="390" height="90" fill="oklch(0.74 0.03 90)"/>'
        '<path d="M170 300h60l-8 40h-44z" fill="oklch(0.6 0.07 45)"/>'
        '<g fill="oklch(0.5 0.09 150)">'
        '<path d="M200 300c-10-60-70-90-120-80 10 50 60 90 120 80z"/>'
        '<path d="M200 300c0-80 40-140 100-150 10 70-40 140-100 150z"/>'
        '<path d="M200 300c-20-90-10-160 30-200 30 60 10 150-30 200z" fill="oklch(0.44 0.09 150)"/>'
        '<path d="M228 120c10-20 30-30 50-28-4 22-26 34-50 28z" fill="oklch(0.66 0.1 140)"/></g></svg>'
        % (w, h, extra, PHOTO_BG)
    )


def tap(cx, cy):
    """Where the finger goes in this frame."""
    return at(cx, cy, '<span style="display:block;width:52px;height:52px;border-radius:9999px;'
                      'background:oklch(0.455 0.098 152 / 0.18);border:2px solid %s"></span>' % C["leaf"], 52)


def hero_with(photo=False, pill=True):
    art = photo_art(W, 340) if photo else (
        '<svg viewBox="0 0 390 340" style="position:absolute;inset:0;width:100%%;height:100%%"><g fill="none" stroke="%s" stroke-width="2">'
        '<path d="M195 40c60 60 60 200 0 260-60-60-60-200 0-260z"/><path d="M195 50v250"/></g></svg>' % C["lineStrong"])
    pill_html = (
        '<div style="position:absolute;left:0;right:0;top:92px;display:flex;justify-content:center">'
        '<span style="display:inline-flex;align-items:center;gap:8px;border-radius:9999px;background:%s;padding:10px 16px;'
        'font-size:0.875rem;font-weight:600;color:%s;box-shadow:%s">%sPhotograph this plant</span></div>'
        % (C["floating"], C["ink"], SHADOW_MD, icon("image", 17))) if pill and not photo else ""
    return (
        '<div style="position:absolute;left:0;top:0;width:%dpx;height:340px;background:%s;overflow:hidden">%s%s'
        '<div style="position:absolute;left:16px;right:16px;top:16px;display:flex;justify-content:space-between">%s%s</div>'
        '<div style="position:absolute;left:16px;bottom:36px;display:flex;align-items:center;gap:8px">%s'
        '<span style="display:inline-flex;align-items:center;gap:6px;border-radius:9999px;background:%s;padding:8px 14px;'
        'font-size:0.875rem;font-weight:600;color:%s;box-shadow:%s"><span style="color:%s;display:inline-flex">%s</span>Keuken</span></div></div>'
        % (W, C["sunk"], art, pill_html, floating_button("back"), floating_button("edit"), floating_button("qr"),
           C["floating"], C["ink"], SHADOW_MD, C["leaf"], icon("place", 16))
    )


def thumb(size=34):
    return ('<span style="display:block;width:%dpx;height:%dpx;border-radius:9999px;overflow:hidden;flex-shrink:0">%s</span>'
            % (size, size, photo_art(size * 2, size * 2, "width:%dpx;height:%dpx" % (size, size))))


def entry(lead, title, detail, date, last=False):
    border = "" if last else "border-bottom:1px solid %s;" % C["line"]
    det = ('<div style="font-size:0.8125rem;line-height:1.125rem;color:%s">%s</div>' % (C["muted"], detail)) if detail else ""
    return ('<div style="display:flex;align-items:center;gap:14px;padding:12px 18px;%s">%s'
            '<div style="flex:1;min-width:0"><div style="font-size:0.9375rem;font-weight:500">%s</div>%s</div>'
            '<span style="font-family:%s;font-size:0.75rem;color:%s">%s</span></div>'
            % (border, lead, title, det, MONO, C["faint"], date))


def chip_lead(name, tint, colour):
    return ('<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;'
            'background:%s;color:%s;flex-shrink:0">%s</span>' % (tint, colour, icon(name, 17)))


def history(first_row):
    rows = first_row + entry(chip_lead("droplet", C["waterTint"], C["water"]), "Water", None, "16 Sept") \
        + entry(chip_lead("droplet", C["waterTint"], C["water"]), "Water", None, "9 Sept", last=True)
    filt = lambda t, on: ('<span style="display:inline-flex;align-items:center;height:34px;padding:0 12px;border-radius:9999px;font-size:0.8125rem;font-weight:500;%s">%s</span>'
                          % (("background:%s;color:%s" % (C["ink"], C["paper"])) if on else ("border:1px solid %s;color:%s" % (C["line"], C["muted"])), t))
    return ('<div style="margin-top:16px;display:flex;gap:8px">%s%s%s</div>'
            '<div style="margin-top:20px;font-size:0.75rem;line-height:1rem;letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">September 2026</div>'
            '<div style="margin-top:8px;border:1px solid %s;border-radius:12px;background:%s;overflow:hidden">%s</div>'
            % (filt("Everything", True), filt("Notable", False), filt("Waterings", False), C["faint"], C["line"], C["surface"], rows))


def page3(tab="care", photo=False, pill=True, body=None, over="", top_sheet="", icons=None, drop=None, navbar=None, extra=""):
    care_on = tab == "care"
    tabs = ('<div style="margin-top:20px;display:flex;border-bottom:1px solid %s">'
            '<div style="flex:1;height:48px;display:flex;align-items:center;justify-content:center;%s">Care</div>'
            '<div style="flex:1;height:48px;display:flex;align-items:center;justify-content:center;%s">History</div></div>'
            % (C["line"],
               ("border-bottom:2px solid %s;margin-bottom:-1px;font-weight:600;color:%s" % (C["leaf"], C["leaf"])) if care_on else ("font-weight:500;color:%s" % C["muted"]),
               ("border-bottom:2px solid %s;margin-bottom:-1px;font-weight:600;color:%s" % (C["leaf"], C["leaf"])) if not care_on else ("font-weight:500;color:%s" % C["muted"])))
    content = body if body is not None else care_card()
    return (
        '<div style="position:relative;width:%dpx;height:%dpx;overflow:hidden;background:%s;color:%s;font-family:%s;font-size:1rem;line-height:1.5rem">'
        '%s<div style="position:absolute;left:0;right:0;top:316px;bottom:0;border-radius:28px 28px 0 0;background:%s;padding:20px 16px 0">'
        '<h1 style="margin:0;font-family:%s;font-size:2.5rem;line-height:2.6875rem;font-weight:500;letter-spacing:-0.025em">Gruyère</h1>'
        '<p style="margin:-4px 0 0;font-size:1.0625rem;line-height:1.5rem;color:%s">Monstera deliciosa</p>%s%s%s</div>'
        '%s%s%s%s%s</div>'
        % (W, H, C["paper"], C["ink"], SANS, hero_with(photo, pill), C["paper"], DISPLAY, C["muted"], tabs, content, extra,
           title_icons() if icons is None else icons,
           nav() if navbar is None else navbar,
           at(DROP_CX, DROP_CY, circle(64, C["water"], C["onAccent"], "droplet"), 64) if drop is None else drop,
           over, top_sheet)
    )


def camera(caption=""):
    return (
        '<div style="position:relative;width:%dpx;height:%dpx;overflow:hidden;background:%s;font-family:%s">'
        '<div style="position:absolute;left:0;right:0;top:60px;height:560px;overflow:hidden">%s</div>'
        '<div style="position:absolute;left:0;right:0;bottom:60px;display:flex;align-items:center;justify-content:space-between;padding:0 32px">'
        '<span style="width:60px;font-size:1rem;color:oklch(0.95 0 0)">Cancel</span>'
        '<span style="width:76px;height:76px;border-radius:9999px;border:4px solid oklch(0.97 0 0);display:flex;align-items:center;justify-content:center">'
        '<span style="width:60px;height:60px;border-radius:9999px;background:oklch(0.97 0 0)"></span></span>'
        '<span style="width:60px"></span></div>%s%s</div>'
        % (W, H, INK_DEEP, SANS, photo_art(W, 560, "width:390px;height:560px"),
           '<div style="position:absolute;left:0;right:0;top:20px;text-align:center;font-size:0.8125rem;color:oklch(0.8 0 0)">The phone&#39;s own camera</div>',
           caption)
    )


def tags(selected=None, items=(("New leaf", "leaf"), ("Blooming", "bloom"), ("Repot", "pot"), ("Just a photo", "image"))):
    return '<div style="display:flex;flex-wrap:wrap;gap:8px">%s</div>' % "".join(tag(l, n, on=(l == selected)) for l, n in items)


def label_small(text, top=20):
    return ('<div style="margin-top:%dpx;font-size:0.75rem;line-height:1rem;letter-spacing:0.09em;font-weight:600;text-transform:uppercase;color:%s">%s</div>'
            % (top, C["faint"], text))


def primary(text, colour=None, top=20):
    return ('<div style="margin-top:%dpx;display:flex;align-items:center;justify-content:center;height:48px;border-radius:6px;background:%s;'
            'color:%s;font-size:1rem;font-weight:500">%s</div>' % (top, colour or C["leaf"], C["onAccent"], text))


new_leaf_row = entry(thumb(), "New leaf", None, "Today")
result = page3(tab="history", photo=True, body=history(new_leaf_row))

# A · the camera from the sheet --------------------------------------------------
a1 = page3(over=tap(346, 363))
a2 = phone2(over=scrim(), sheet_html=sheet_frame(
    236,
    '<div style="margin-top:16px;height:200px;border-radius:16px;border:1.5px dashed %s;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:%s">'
    '%s<span style="font-size:1rem;font-weight:500;color:%s">Take a photo</span><span style="font-size:0.8125rem">then say what it shows</span></div>'
    '<div style="margin-top:18px;text-align:center;font-size:0.875rem;color:%s">Nothing to photograph?</div>'
    '<div style="margin-top:10px;display:flex;justify-content:center;gap:8px">%s</div>'
    % (C["lineStrong"], C["sunk"], C["muted"], icon("camera", 32), C["ink"], C["muted"],
       "".join(tag(l, n) for l, n in (("Note", "note"), ("Repot", "pot"), ("Water", "droplet")))),
    chips=False,
) + tap(195, 422))
a3 = camera(tap(195, 746))
a4 = phone2(over=scrim(), sheet_html=sheet_frame(
    150,
    '<div style="margin-top:16px;height:250px;border-radius:16px;overflow:hidden;position:relative">%s'
    '<span style="position:absolute;right:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:6px;background:%s;font-size:0.875rem;font-weight:600;box-shadow:%s">%sRetake</span></div>'
    '%s<div style="margin-top:12px">%s</div>%s'
    % (photo_art(350, 250, "width:350px;height:250px"), C["floating"], SHADOW_MD, icon("camera", 16),
       label_small("What does it show?"), tags("New leaf"), primary("Log new leaf")),
    chips=False,
) + tap(195, 666))

# B · straight from the hero ---------------------------------------------------
b1 = page3(over=tap(195, 112))
b2 = camera(tap(195, 746))
b3 = (
    '<div style="position:relative;width:%dpx;height:%dpx;overflow:hidden;background:%s;color:%s;font-family:%s;font-size:1rem;line-height:1.5rem">'
    '<div style="position:absolute;left:0;top:0;width:390px;height:470px">%s</div>'
    '<div style="position:absolute;left:16px;right:16px;top:16px;display:flex;justify-content:space-between">%s'
    '<span style="display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:9999px;background:%s;box-shadow:%s;font-size:0.875rem;font-weight:600">%sRetake</span></div>'
    '<div style="position:absolute;left:0;right:0;top:446px;bottom:0;border-radius:28px 28px 0 0;background:%s;padding:24px 16px 0">'
    '<h2 style="margin:0;font-family:%s;font-size:1.625rem;line-height:2rem;font-weight:500">What does it show?</h2>'
    '<div style="margin-top:14px">%s</div>'
    '<div style="margin-top:18px;display:flex;align-items:center;gap:12px;min-height:44px">'
    '<span style="width:24px;height:24px;border-radius:6px;background:%s;color:%s;display:inline-flex;align-items:center;justify-content:center">%s</span>'
    '<span style="font-size:0.9375rem">Use as Gruyère&#39;s photo</span></div>'
    '%s</div>%s</div>'
    % (W, H, C["paper"], C["ink"], SANS, photo_art(390, 470, "width:390px;height:470px"),
       floating_button("close"), C["floating"], SHADOW_MD, icon("camera", 16), C["paper"], DISPLAY,
       tags("Blooming"), C["leaf"], C["onAccent"], icon("check", 16), primary("Log blooming", top=16), tap(195, 706))
)
b4 = page3(tab="history", photo=True, body=history(entry(thumb(), "Blooming", None, "Today")))


# C · log first, say what it was after ------------------------------------------
def ask_card(title, sub, chips_html):
    return ('<div style="position:absolute;left:12px;right:12px;bottom:192px;border-radius:16px;background:%s;box-shadow:%s;border:1px solid %s;padding:14px 16px">'
            '<div style="display:flex;align-items:center;gap:12px">%s<div style="flex:1"><div style="font-size:0.9375rem;font-weight:600">%s</div>'
            '<div style="font-size:0.8125rem;line-height:1.125rem;color:%s">%s</div></div><span style="color:%s">%s</span></div>'
            '<div style="margin-top:12px">%s</div></div>'
            % (C["surface"], SHADOW_LG, C["line"], thumb(40), title, C["muted"], sub, C["faint"], icon("close", 18), chips_html))


c1 = page3(over=tap(195, 112))
c2 = camera(tap(195, 746))
c3 = page3(tab="history", photo=True, body=history(entry(thumb(), "Photo", None, "Today")),
           over=ask_card("Photo logged", "Anything in it worth noting?", tags(None, (("New leaf", "leaf"), ("Blooming", "bloom"), ("Repot", "pot")))) + tap(78, 618))
c4 = page3(tab="history", photo=True, body=history(entry(thumb(), "New leaf", "with photo", "Today")))

# D · the shipped grid, with a photo slot on top --------------------------------
GRID5 = (LEAF, BLOOM, REPOT, NOTE, WATER)


def grid_sheet(slot, hint, top=300):
    return sheet_frame(
        top,
        slot + hint +
        '<div style="margin-top:18px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));row-gap:20px;column-gap:12px">%s</div>'
        % "".join(action(*a) for a in GRID5),
        chips=False,
    )


slot_empty = ('<div style="margin-top:16px;display:flex;gap:10px">'
              '<div style="flex:1;height:64px;border-radius:12px;border:1.5px dashed %s;background:%s;display:flex;align-items:center;gap:12px;padding:0 16px;color:%s">'
              '%s<span style="font-size:0.9375rem;font-weight:500;color:%s">Take a photo first</span></div>'
              '<div style="width:112px;height:64px;border-radius:12px;border:1px solid %s;display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.875rem;font-weight:500;color:%s">%sToday</div></div>'
              % (C["lineStrong"], C["sunk"], C["muted"], icon("camera", 22), C["ink"], C["line"], C["ink"], icon("calendar", 16)))
slot_full = ('<div style="margin-top:16px;display:flex;gap:10px">'
             '<div style="flex:1;height:64px;border-radius:12px;border:1px solid %s;background:%s;display:flex;align-items:center;gap:12px;padding:0 8px">'
             '<span style="width:48px;height:48px;border-radius:8px;overflow:hidden">%s</span>'
             '<span style="flex:1;font-size:0.9375rem;font-weight:500">Photo attached</span><span style="color:%s;padding-right:6px">%s</span></div>'
             '<div style="width:112px;height:64px;border-radius:12px;border:1px solid %s;display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.875rem;font-weight:500;color:%s">%sToday</div></div>'
             % (C["line"], C["surface"], photo_art(48, 48, "width:48px;height:48px"), C["faint"], icon("close", 18), C["line"], C["ink"], icon("calendar", 16)))
hint_full = ('<div style="margin-top:14px;text-align:center;font-size:0.875rem;color:%s">Tap what it shows · <span style="color:%s;font-weight:500">Just the photo</span></div>'
             % (C["muted"], C["leaf"]))

d1 = phone2(over=scrim(), sheet_html=grid_sheet(slot_empty, "", top=380) + tap(134, 498))
d2 = camera(tap(195, 746))
d3 = phone2(over=scrim(), sheet_html=grid_sheet(slot_full, hint_full, top=346) + tap(74, 578))
d4 = result

round_three = [
    ("A1.dc.html", "A1 · Tap …", a1), ("A2.dc.html", "A2 · The sheet opens on the camera", a2),
    ("A3.dc.html", "A3 · Take it", a3), ("A4.dc.html", "A4 · Say what it shows", a4), ("A5.dc.html", "A5 · Logged, with the photo", result),
    ("B1.dc.html", "B1 · Tap the photo pill on the hero", b1), ("B2.dc.html", "B2 · Take it", b2),
    ("B3.dc.html", "B3 · Full-screen review", b3), ("B4.dc.html", "B4 · Logged; the plant wears it", b4),
    ("C1.dc.html", "C1 · Tap the photo pill", c1), ("C2.dc.html", "C2 · Take it — it is logged now", c2),
    ("C3.dc.html", "C3 · Optional: what was it?", c3), ("C4.dc.html", "C4 · The row upgrades in place", c4),
    ("D1.dc.html", "D1 · Grid sheet, photo slot on top", d1), ("D2.dc.html", "D2 · Take it", d2),
    ("D3.dc.html", "D3 · Same circles, now with the photo", d3), ("D4.dc.html", "D4 · Logged, with the photo", d4),
]

# --- round four: A's camera, round two's grid, and the date ---------------------
ICONS.update({"chevronDown": '<path d="m6 9 6 6 6-6"/>', "chevronLeft": '<path d="m15 18-6-6 6-6"/>'})


def date_chip(text):
    return ('<div style="margin-top:12px;display:flex;justify-content:center">'
            '<span style="display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:9999px;border:1px solid %s;background:%s;'
            'font-size:0.875rem;font-weight:500;color:%s"><span style="color:%s;display:inline-flex">%s</span>%s<span style="color:%s;display:inline-flex">%s</span></span></div>'
            % (C["line"], C["sunk"], C["ink"], C["muted"], icon("calendar", 16), text, C["muted"], icon("chevronDown", 16)))


def sheet4(top, title, body, back=False):
    left = ('<span style="width:44px;height:44px;margin-left:-10px;display:inline-flex;align-items:center;justify-content:center;color:%s">%s</span>'
            % (C["muted"], icon("back", 21))) if back else '<span style="width:44px;height:44px"></span>'
    return (
        '<div style="position:absolute;left:0;right:0;top:%dpx;bottom:0;background:%s;border-top:1px solid %s;border-radius:26px 26px 0 0;padding:10px 20px 0">'
        '<div style="margin:0 auto;width:36px;height:4px;border-radius:9999px;background:%s"></div>'
        '<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">%s'
        '<h2 style="margin:0;font-family:%s;font-size:1.625rem;line-height:2rem;font-weight:500">%s</h2>'
        '<span style="width:44px;height:44px;margin-right:-10px;display:inline-flex;align-items:center;justify-content:center;color:%s">%s</span></div>%s</div>'
        % (top, C["surface"], C["line"], C["lineStrong"], left, DISPLAY, title, C["muted"], icon("close", 22), body)
    )


def grid(actions):
    return ('<div style="margin-top:20px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));row-gap:20px;column-gap:12px">%s</div>'
            % "".join(action(*a) for a in actions))


camera_tile = ('<div style="margin-top:16px;height:170px;border-radius:16px;border:1.5px dashed %s;background:%s;display:flex;flex-direction:column;'
               'align-items:center;justify-content:center;gap:8px;color:%s">%s<span style="font-size:1rem;font-weight:500;color:%s">Take a photo</span>'
               '<span style="font-size:0.8125rem">or tap below to log without one</span></div>'
               % (C["lineStrong"], C["sunk"], C["muted"], icon("camera", 30), C["ink"]))
photo_tile = ('<div style="margin-top:16px;height:200px;border-radius:16px;overflow:hidden;position:relative">%s'
              '<span style="position:absolute;right:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:6px;'
              'background:%s;font-size:0.875rem;font-weight:600;box-shadow:%s">%sRetake</span></div>'
              '<div style="margin-top:14px;text-align:center;font-size:0.875rem;color:%s">Tap what it shows</div>'
              % (photo_art(350, 200, "width:350px;height:200px"), C["floating"], SHADOW_MD, icon("camera", 16), C["muted"]))

BEFORE = (LEAF, BLOOM, REPOT, NOTE, WATER)
AFTER = (LEAF, BLOOM, REPOT, NOTE, WATER, ("image", "ink", "Photo only"))


def calendar():
    head = "".join('<div style="padding:6px 0;text-align:center;font-family:%s;font-size:0.6875rem;letter-spacing:0.06em;color:%s">%s</div>'
                   % (MONO, C["faint"], d) for d in "MTWTFSS")
    cells = '<span></span>'  # 1 Sept 2026 is a Tuesday
    for d in range(1, 31):
        if d == 12:
            style = "background:%s;color:%s;font-weight:600" % (C["ink"], C["paper"])
        elif d > 16:
            style = "color:%s;opacity:0.4" % C["faint"]
        else:
            style = "color:%s" % C["ink"]
        cells += ('<span style="display:flex;align-items:center;justify-content:center;height:40px;border-radius:8px;font-family:%s;font-size:0.9375rem;%s">%d</span>'
                  % (MONO, style, d))
    chip2 = lambda t: ('<span style="display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:9999px;border:1px solid %s;font-size:0.875rem;font-weight:500;color:%s">%s</span>'
                       % (C["line"], C["muted"], t))
    return (
        '<div style="margin-top:16px;display:flex;justify-content:center;gap:8px">%s%s</div>'
        '<div style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;height:44px">'
        '<span style="color:%s;display:inline-flex">%s</span><span style="font-family:%s;font-size:1.1875rem;font-weight:500">September 2026</span>'
        '<span style="color:%s;opacity:0.3;display:inline-flex">%s</span></div>'
        '<div style="margin-top:4px;display:grid;grid-template-columns:repeat(7, minmax(0, 1fr))">%s</div>'
        '<div style="display:grid;grid-template-columns:repeat(7, minmax(0, 1fr));gap:2px">%s</div>'
        '<div style="margin-top:16px;display:flex;align-items:center;justify-content:center;height:48px;border-radius:6px;background:%s;color:%s;font-size:1rem;font-weight:500">Use this date</div>'
        % (chip2("Today"), chip2("Yesterday"), C["muted"], icon("chevronLeft", 21), DISPLAY, C["muted"], icon("chevronRight", 21),
           head, cells, C["ink"], C["paper"])
    )


e1 = page3(over=tap(350, 362))
e2 = phone2(over=scrim(), sheet_html=sheet4(296, "Log activity", date_chip("Today") + camera_tile + grid(BEFORE)) + tap(195, 396))
e3 = phone2(over=scrim(), sheet_html=sheet4(300, "When?", calendar(), back=True) + tap(295, 580))
e4 = phone2(over=scrim(), sheet_html=sheet4(296, "Log activity", date_chip("12 Sept") + camera_tile + grid(BEFORE)) + tap(195, 515))
e5 = camera(tap(195, 746))
e6 = phone2(over=scrim(), sheet_html=sheet4(238, "Log activity", date_chip("12 Sept") + photo_tile + grid(AFTER)) + tap(74, 650))


def history_dated(new_row):
    water = lambda d, last=False: entry(chip_lead("droplet", C["waterTint"], C["water"]), "Water", None, d, last)
    filt = lambda t, on: ('<span style="display:inline-flex;align-items:center;height:34px;padding:0 12px;border-radius:9999px;font-size:0.8125rem;font-weight:500;%s">%s</span>'
                          % (("background:%s;color:%s" % (C["ink"], C["paper"])) if on else ("border:1px solid %s;color:%s" % (C["line"], C["muted"])), t))
    return ('<div style="margin-top:16px;display:flex;gap:8px">%s%s%s</div>%s'
            '<div style="margin-top:8px;border:1px solid %s;border-radius:12px;background:%s;overflow:hidden">%s%s%s</div>'
            % (filt("Everything", True), filt("Notable", False), filt("Waterings", False), label_small("September 2026"),
               C["line"], C["surface"], water("16 Sept"), new_row, water("9 Sept", True)))


e7 = page3(tab="history", photo=True, body=history_dated(
    '<div style="background:%s">%s</div>' % (C["leafTint"], entry(thumb(), "New leaf", None, "12 Sept"))))

round_four = [
    ("E1.dc.html", "1 · Tap …", e1),
    ("E2.dc.html", "2 · Date, camera, grid — tap the date", e2),
    ("E3.dc.html", "3 · The day it happened", e3),
    ("E4.dc.html", "4 · Back, dated — tap the camera", e4),
    ("E5.dc.html", "5 · Take it", e5),
    ("E6.dc.html", "6 · Same grid, now with the photo", e6),
    ("E7.dc.html", "7 · Filed on 12 Sept, with the photo", e7),
]

# --- round five: where Log activity lives on a phone ---------------------------
def link_only():
    return ('<div style="position:absolute;right:16px;top:338px;display:flex"><span style="display:inline-flex;align-items:center;justify-content:center;'
            'width:48px;height:48px;border-radius:6px;color:%s">%s</span></div>' % (C["muted"], icon("link", 20)))


water_drop = at(DROP_CX, DROP_CY, circle(64, C["water"], C["onAccent"], "droplet"), 64)

# V1 · as built
v1 = page3()

# V2 · a second, smaller button stacked above the drop
v2 = page3(icons=link_only(), drop=water_drop + at(DROP_CX, DROP_CY - 32 - 14 - 24, circle(48, C["surface"], C["ink"], "plus", shadow=SHADOW_LG), 48))

# V3 · a bar over the tab bar: Log activity spelled out, the drop at its end
bar = ('<div style="position:absolute;left:16px;right:16px;bottom:108px;display:flex;align-items:center;gap:12px">'
       '<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:6px;border:1px solid %s;'
       'background:%s;box-shadow:%s;font-size:1rem;font-weight:500;color:%s">%sLog activity</div>%s</div>'
       % (C["lineStrong"], C["surface"], SHADOW_LG, C["ink"], icon("plus", 20), circle(64, C["water"], C["onAccent"], "droplet")))
v3 = page3(icons=link_only(), drop=bar)

# V4 · the name's row, spelled out
log_btn = ('<div style="position:absolute;right:16px;top:340px;display:flex;align-items:center;gap:4px">'
           '<span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;color:%s">%s</span>'
           '<span style="display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border-radius:6px;border:1px solid %s;'
           'background:%s;font-size:0.9375rem;font-weight:500;color:%s">%sLog</span></div>'
           % (C["muted"], icon("link", 20), C["lineStrong"], C["surface"], C["ink"], icon("plus", 18)))
v4 = page3(icons=log_btn)


# V5 · the tab bar's own + means "log to this plant" while you are on one
def nav_log():
    items = [("home", "Today", False), ("rows", "Plants", True), ("plus", "Log", None), ("bookmark", "Wishlist", False), ("sliders", "Settings", False)]
    out = ""
    for name, label, active in items:
        if active is None:
            glyph = ('<span style="margin-top:-18px;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:9999px;background:%s;color:%s">%s</span>'
                     % (C["ink"], C["paper"], icon(name, 26)))
            colour = C["ink"]
        else:
            glyph = icon(name, 23)
            colour = C["leaf"] if active else C["faint"]
        weight = "font-weight:600;" if active or active is None else ""
        out += ('<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding-bottom:10px;color:%s">'
                '%s<span style="font-size:0.6875rem;line-height:1rem;%s">%s</span></div>' % (colour, glyph, weight, label))
    return ('<div style="position:absolute;left:0;right:0;bottom:0;display:flex;border-top:1px solid %s;background:%s;padding-top:10px;padding-bottom:22px">%s</div>'
            % (C["line"], C["surface"], out))


v5 = page3(icons=link_only(), navbar=nav_log())


# V6 · a strip of the log's own circles on the Care tab
def mini(name, tone, label):
    bg, fg = FILL[tone]
    return ('<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:62px;flex-shrink:0">'
            '<span style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:9999px;background:%s;color:%s;box-shadow:%s">%s</span>'
            '<span style="font-size:0.75rem;line-height:1rem;font-weight:500">%s</span></div>' % (bg, fg, SHADOW_MD, icon(name, 21), label))


strip = ('<div style="margin-top:16px;display:flex;justify-content:space-between">%s</div>'
         % ( "".join(mini(*a) for a in (("camera", "ink", "Photo"), LEAF, BLOOM, REPOT, NOTE))))
v6 = page3(icons=link_only(), body=strip + care_card())

round_five = [
    ("V1.dc.html", "1 · As built: … beside the link", v1),
    ("V2.dc.html", "2 · Stacked above the drop", v2),
    ("V3.dc.html", "3 · A bar: Log activity + the drop", v3),
    ("V4.dc.html", "4 · Spelled out on the name’s row", v4),
    ("V5.dc.html", "5 · The tab bar’s + becomes Log", v5),
    ("V6.dc.html", "6 · The circles, on the Care tab", v6),
]

# --- write -------------------------------------------------------------------
def write(name, content):
    doc = DOC.replace("CONTENT", content).replace("PAPER", C["paper"]).replace("LEAF", C["leaf"]).replace("INK", C["ink"])
    (HERE / name).write_text(doc)
    print("wrote", name, len(doc))


boards = [
    ("Main.dc.html", "A · Fan of two", fan_two),
    ("OneTap.dc.html", "B · One tap pours", one_tap),
    ("Hold.dc.html", "C · Hold to pour", hold),
    ("InTheCard.dc.html", "D · Water beside Last watered", in_card),
    ("SheetAlone.dc.html", "Log sheet · Water on its own", sheet_alone),
    ("SheetMerged.dc.html", "Log sheet · Water joins Repot", sheet_merged),
    ("Settings.dc.html", "Settings · the habit switch", settings),
    ("Desktop.dc.html", "Desktop · two plain buttons", desktop),
]
round_two = [
    ("LogWaterLast.dc.html", "1 · Water last, as “another day”", water_last),
    ("LogGrid.dc.html", "2 · One grid, no groups", grid_one),
    ("LogList.dc.html", "3 · A list that says what it asks", as_list),
    ("LogPhotoFirst.dc.html", "4 · New: the photo leads", photo_first),
    ("LogSayIt.dc.html", "5 · New: say it in a sentence", say_it),
]
for name, _, content in boards + round_two + round_three + round_four + round_five:
    write(name, content)

layout = []
for i, (name, title, _) in enumerate(boards[:4]):
    layout.append({"file": name, "title": title, "x": i * 490, "y": 0, "w": W, "h": H})
for i, (name, title, _) in enumerate(boards[4:7]):
    layout.append({"file": name, "title": title, "x": i * 490, "y": 1064, "w": W, "h": H})
layout.append({"file": "Desktop.dc.html", "title": boards[7][1], "x": 0, "y": 2128, "w": 1440, "h": 900})
for entry in layout:
    entry["page"] = "one-press"
for i, (name, title, _) in enumerate(round_two):
    layout.append({"file": name, "title": title, "page": "log-sheet", "x": i * 490, "y": 0, "w": W, "h": H})

notes = [
    ("impact", -300, 0, 240,
     "What changes if fertiliser is always in the water\n\n"
     "• Data: nothing new. Every watering is stored with fertilized: true, so the history stays true if the habit ever stops.\n"
     "• Care: the Last fertilised row goes — it would always say the same as Last watered.\n"
     "• History: “with fertiliser” disappears from every row; it would be on all of them.\n"
     "• Same-day fold: pressing water after fertiliser no longer means anything, so that half of the rule goes quiet.\n"
     "• Log sheet and split button lose their Fertiliser option."),
    ("a", 0, -150, 390, "A · Smallest change. Still two taps, as decided. But a fan of two is half an arc — the question is whether it still needs to fan at all."),
    ("b", 490, -150, 390, "B · Drop waters on tap; the ink chip beside it opens the sheet. One tap, like you asked. Cost: it undoes the deliberate two taps, and a mis-tap means swiping the row away (no undo)."),
    ("c", 980, -150, 390, "C · Hold ~0.5 s and the ring fills, then it pours. A plain tap opens the sheet. One motion, still deliberate. Cost: a hidden gesture — needs the hint the first few times."),
    ("d", 1470, -150, 390, "D · Water lives next to the fact it changes; the corner button is just “log”. Cost: only on the Care tab, and mid-screen instead of under the thumb."),
    ("sheet", 0, 914, 880, "Log sheet · With Fertiliser gone, Watering is a group of one. Left keeps it anyway; right folds Water in with Repot as things you did."),
    ("set", 980, 914, 390, "Settings · One switch, collection-wide. Per plant would be possible, but you described a habit, not a plant."),
    ("desk", 0, 2008, 900, "Desktop · A split button with one item behind its caret is a menu for nothing. Two plain buttons instead: Water, and Log activity."),
]
annotations = [{"id": i, "x": x, "y": y, "w": w, "text": t, "page": "one-press"} for i, x, y, w, t in notes]
notes2 = [
    ("ls-intro", -300, 0, 240,
     "Log activity, round two\n\nWater is one press on the drop now, so the sheet is for everything else. Water stays reachable for one reason: the day you forgot to log it.\n\nThe three I made in the app’s own language come first. The last two are new ideas."),
    ("ls-1", 0, -150, 390, "1 · The sheet you have, with the plant first and Water turned into one quiet row at the foot: “Watered on another day”. Cost: still three groups to scan."),
    ("ls-2", 490, -150, 390, "2 · Six circles, no labels over them, in the order you reach for them. Half the height. Cost: loses the did / the plant did / written-down reading."),
    ("ls-3", 980, -150, 390, "3 · Rows that say what each one will ask for — a repot asks three things, a new leaf asks nothing. Cost: taller, and less of a gesture than tapping a circle."),
    ("ls-4", 1470, -150, 390, "4 · New. You are usually stood in front of the plant because something happened. The camera opens first; you tag what the photo shows, and it logs as that entry with the picture. Cost: a note or a repot without a photo is one step further."),
    ("ls-5", 1960, -150, 390, "5 · New. Type or dictate one sentence; the sheet reads it back as entries before anything is logged, and you remove what it got wrong. The in-browser model the name dice already uses could do the reading. Cost: the most to build, and it has to be right often enough to trust."),
]
for col, (name, title, _) in enumerate(round_five):
    layout.append({"file": name, "title": title, "page": "log-placement", "x": col * 490, "y": 0, "w": W, "h": H})
annotations += [{"id": i, "x": x, "y": -150, "w": 390, "page": "log-placement", "text": t} for i, x, t in (
    ("lp-1", 0, "1 · As built. Quiet and out of the way — too far out of the way: it reads as a menu for the plant, not as the second thing you do here."),
    ("lp-2", 490, "2 · A 48 px + right above the drop, in the same thumb reach. Water stays biggest and closest to the corner. Cost: two floating buttons over the record."),
    ("lp-3", 980, "3 · One bar over the tab bar: Log activity written out, the drop at its end. The most obvious of the six. Cost: the widest thing floating over the page."),
    ("lp-4", 1470, "4 · “+ Log” as a real button on the name’s row. Visible the moment the page opens. Cost: top of the screen, out of thumb reach."),
    ("lp-5", 1960, "5 · New. On a plant page the tab bar’s centre button logs to this plant (ink, “Log”); everywhere else it stays New plant. No new button at all. Cost: the same place meaning two things."),
    ("lp-6", 2450, "6 · New. The log’s own circles sit on the Care tab, one tap straight into the right entry. Cost: only on Care, and it makes that tab busier."),
)]
annotations.append({"id": "lp-intro", "x": -300, "y": 0, "w": 240, "page": "log-placement", "text": "Where Log activity lives on a phone\n\nWater is first: the drop stays where it is, the biggest thing under the thumb. Log is second — it should be findable without hunting, but never compete with the drop."})
for col, (name, title, _) in enumerate(round_four):
    layout.append({"file": name, "title": title, "page": "photo-grid", "x": col * 490, "y": 0, "w": W, "h": H})
annotations += [
    {"id": "pg-intro", "x": -300, "y": 0, "w": 240, "page": "photo-grid", "text": "A + 2, with the date\n\nOne sheet: the date on top, the camera under it, the grid under that.\n\n• Without a photo it works exactly as now: tap a circle and it is logged on the chosen day.\n• With a photo, the same circles log that entry with the photo attached, and a sixth circle, Photo only, appears in the spot the old Photo button had.\n• The date sits first because it applies to everything below it, photo included.\n\nThe Add a photo chip and the Photo circle both go: the camera tile replaces them."},
    {"id": "pg-q", "x": 0, "y": 924, "w": 880, "page": "photo-grid", "text": "Open questions\n• A photo taken today but logged for 12 Sept: file it on the picked day (as drawn), or keep the photo’s own date?\n• Should the photo from a New leaf or Blooming also become the plant’s photo, the way a photograph already does?"},
]
rows3 = {"A": 0, "B": 1, "C": 2, "D": 3}
for name, title, _ in round_three:
    row, col = rows3[name[0]], int(name[1]) - 1
    layout.append({"file": name, "title": title, "page": "photo-first", "x": col * 490, "y": row * 1100, "w": W, "h": H})
notes3 = [
    ("pf-a", -300, 0, 240, "A · The sheet opens on the camera\n\nThe … opens a sheet whose first question is a photo; the other things sit underneath as small chips. After the shutter you tag what the photo shows and log it.\n\nFor: one place for everything, closest to what you have.\nAgainst: five steps for a new leaf, and a Note now sits behind “Nothing to photograph?”."),
    ("pf-b", -300, 1100, 240, "B · Straight from the hero\n\nThe “Photograph this plant” pill already sits on the photograph. It goes to the camera, then a full-screen review where you say what it shows and whether it becomes the plant’s photo.\n\nFor: the photo lands where photos live; no … needed.\nAgainst: once a plant has a photo the pill is gone, so it needs another home on the hero."),
    ("pf-c", -300, 2200, 240, "C · Log first, ask after\n\nThe shutter logs a Photo entry straight away. A card offers New leaf, Blooming, Repot; tap one and the same row becomes that entry with the photo. Ignore it and it stays a photo.\n\nFor: fewest taps; nothing is lost if you walk away.\nAgainst: a card that asks something after the fact, every time."),
    ("pf-d", -300, 3300, 240, "D · The grid you now have, with a photo slot\n\nThe shipped grid, minus its Photo circle: the “Add a photo” chip grows into a slot on top. Take one, and any circle logs that entry with it; “Just the photo” logs it bare.\n\nFor: smallest step from what is built; photo stays optional.\nAgainst: the photo is still a detour rather than the lead."),
]
annotations += [{"id": i, "x": x, "y": y, "w": w, "text": t, "page": "photo-first"} for i, x, y, w, t in notes3]
annotations += [{"id": i, "x": x, "y": y, "w": w, "text": t, "page": "log-sheet"} for i, x, y, w, t in notes2]

(HERE / "canvas.json").write_text(json.dumps({"pages": [{"id": "log-placement", "name": "Log placement"}, {"id": "photo-grid", "name": "Photo + grid"}, {"id": "photo-first", "name": "Photo first — flows"}, {"id": "log-sheet", "name": "Log activity"}, {"id": "one-press", "name": "Water, one press"}], "artboards": layout, "annotations": annotations, "launch": {"view": "canvas", "page": "log-placement"}}, indent=2))
print("wrote canvas.json")
