#!/usr/bin/env python3
"""
Builds the plant-form artboards: adding a plant and editing one, on desktop.

A fresh canvas. Three directions that disagree about what the form *is*:

  1. The label   — one sheet, written like a herbarium label, the same surface
                   for a blank plant and a known one.
  2. The page    — no edit screen at all; the plant page is edited where it is
                   read, a part at a time in a sheet, and New is only what a
                   plant needs to exist.
  3. The index   — the record's parts listed with what each holds, one part's
                   fields open beside them.

Every artboard is a 1440 × 900 window. The plants, glyphs and controls are
written once below; change them here and rerun, never edit a `.dc.html`.
Tokens are the ones in `src/styles.css`.
"""

from pathlib import Path
import html as _html
import json
import re

HERE = Path(__file__).parent
PLATES = (HERE / "plates.svg").read_text()

FONTS = (
    "https://fonts.googleapis.com/css2?"
    "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400"
    "&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
)

TOKENS = """
      --paper:oklch(0.968 0.008 85); --surface:oklch(0.995 0.003 85);
      --sunk:oklch(0.944 0.010 85); --line:oklch(0.886 0.010 80);
      --line-strong:oklch(0.800 0.012 80); --ink:oklch(0.255 0.014 65);
      --ink-muted:oklch(0.510 0.014 68); --ink-faint:oklch(0.655 0.012 72);
      --leaf:oklch(0.455 0.098 152); --leaf-tint:oklch(0.944 0.026 152);
      --water:oklch(0.455 0.104 236); --water-tint:oklch(0.944 0.028 236);
      --ember:oklch(0.520 0.130 47); --ember-tint:oklch(0.948 0.034 47);
      --on-accent:oklch(0.985 0.004 85);
      --scrim:oklch(0.255 0.014 65 / 0.45);
      --display:'Newsreader',Georgia,'Times New Roman',serif;
      --ui:system-ui,-apple-system,'Segoe UI',sans-serif;
      --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace;
"""

CSS = """
    *{box-sizing:border-box;}
    body{margin:0;font-family:var(--ui);-webkit-font-smoothing:antialiased;}
    .mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}
    svg.i{flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.8;
          stroke-linecap:round;stroke-linejoin:round;}
    .plate{display:block;width:100%;height:100%;}

    /* the window and its rail */
    .app{display:flex;width:1440px;height:900px;overflow:hidden;position:relative;
         background:var(--paper);color:var(--ink);}
    .rail{width:80px;flex-shrink:0;height:100%;background:var(--surface);
          border-right:1px solid var(--line);display:flex;flex-direction:column;
          align-items:center;padding-top:24px;}
    .mark{font-family:var(--display);font-size:26px;line-height:32px;font-weight:500;padding-bottom:24px;}
    .nv{width:64px;height:56px;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:4px;color:var(--ink-faint);font-size:11px;line-height:14px;font-weight:500;}
    .nv.on{color:var(--leaf);font-weight:600;}
    .disc{width:40px;height:40px;border-radius:999px;background:var(--leaf);
          color:var(--on-accent);display:flex;align-items:center;justify-content:center;}
    .nv.plain .disc{background:transparent;color:var(--ink-faint);}
    main{flex:1;min-width:0;height:100%;overflow:hidden;padding:32px 48px 0;position:relative;}

    h1{margin:0;font-family:var(--display);font-size:32px;line-height:36px;font-weight:500;letter-spacing:-0.015em;}
    .back{width:44px;height:44px;margin-left:-12px;display:flex;align-items:center;justify-content:center;color:var(--ink-muted);}
    .label{font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted);}
    .faint{color:var(--ink-faint);}
    .muted{color:var(--ink-muted);}
    .hint{font-size:13px;line-height:20px;color:var(--ink-muted);}

    /* the app's own boxed field */
    .f{display:flex;flex-direction:column;gap:8px;min-width:0;}
    .c{height:48px;border:1px solid var(--line-strong);border-radius:4px;background:var(--surface);
       padding:0 14px 0 16px;display:flex;align-items:center;gap:10px;font-size:16px;white-space:nowrap;overflow:hidden;}
    .c .v{flex:1;overflow:hidden;text-overflow:ellipsis;}
    .c .ph{flex:1;color:var(--ink-faint);overflow:hidden;text-overflow:ellipsis;}
    .c .u{color:var(--ink-faint);font-size:14px;}
    .c svg{color:var(--ink-muted);}
    .c.focus{border-color:var(--leaf);box-shadow:0 0 0 1px var(--leaf);}
    .row{display:flex;gap:12px;}
    .stack{display:flex;flex-direction:column;gap:24px;}

    .seg{display:flex;height:48px;border:1px solid var(--line-strong);border-radius:4px;overflow:hidden;}
    .seg span{flex:1;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;
              color:var(--ink-muted);border-left:1px solid var(--line-strong);}
    .seg span:first-child{border-left:0;}
    .seg span.on{background:var(--ink);color:var(--paper);font-weight:600;}
    .chip{height:44px;padding:0 16px;border-radius:999px;display:inline-flex;align-items:center;
          font-size:15px;font-weight:500;color:var(--ink-muted);border:1px solid var(--line-strong);}
    .chip.on{background:var(--water);color:var(--on-accent);border-color:var(--water);font-weight:600;}
    .chips{display:flex;gap:8px;flex-wrap:wrap;}
    .tog{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:16px;}
    .sw{width:52px;height:32px;border-radius:999px;background:var(--line-strong);padding:4px;display:flex;flex-shrink:0;}
    .sw i{width:24px;height:24px;border-radius:999px;background:var(--surface);}
    .sw.on{background:var(--leaf);} .sw.on i{transform:translateX(20px);}
    .check{height:44px;display:flex;align-items:center;gap:12px;font-size:16px;}
    .box{width:22px;height:22px;border-radius:4px;border:1.5px solid var(--line-strong);background:var(--surface);flex-shrink:0;}
    .dice{width:48px;height:48px;flex-shrink:0;border-radius:6px;border:1px solid var(--line-strong);
          display:flex;align-items:center;justify-content:center;color:var(--leaf);}

    .btn{height:48px;padding:0 18px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;
         gap:8px;font-size:16px;font-weight:500;white-space:nowrap;}
    .btn.accent{background:var(--leaf);color:var(--on-accent);}
    .btn.outline{border:1px solid var(--line-strong);color:var(--ink);}
    .btn.quiet{color:var(--ink-muted);padding:0 12px;}
    .danger{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:500;color:var(--ember);}

    .sh{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px;color:var(--ink-faint);}
    .sh h2{margin:0;font-family:var(--display);font-size:21px;line-height:28px;font-weight:500;color:var(--ink);}

    /* ── 1 · the label ─────────────────────────────────────────────── */
    .sheet{background:var(--surface);border:1px solid var(--line-strong);border-radius:3px;padding:7px;}
    .sheet-in{border:1px solid var(--line);border-radius:1px;padding:28px 36px 30px;}
    .stamp{font-family:var(--mono);font-size:15px;font-weight:500;letter-spacing:0.1em;}
    .stamp b{font-weight:500;color:var(--ink-faint);}
    .mount{border:1px solid var(--line);background:var(--sunk);border-radius:2px;overflow:hidden;}
    /* a blank on the label: a line to write on, not a box */
    .ln{display:flex;align-items:flex-end;gap:8px;border-bottom:1px solid var(--line-strong);
        padding:0 2px 7px;min-width:0;white-space:nowrap;overflow:hidden;}
    .ln .v{flex:1;overflow:hidden;text-overflow:ellipsis;}
    .ln .ph{flex:1;color:var(--ink-faint);overflow:hidden;text-overflow:ellipsis;}
    .ln svg{color:var(--ink-faint);margin-bottom:2px;}
    .ln.big{font-family:var(--display);font-size:34px;line-height:40px;font-weight:500;letter-spacing:-0.015em;padding-bottom:6px;}
    .ln.mid{font-family:var(--display);font-size:22px;line-height:28px;font-weight:500;}
    .ln.sm{font-size:16px;line-height:22px;}
    .ln.focus{border-bottom:2px solid var(--leaf);padding-bottom:6px;}
    .cap{font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-faint);}
    .ltab{display:grid;grid-template-columns:118px minmax(0,1fr);column-gap:20px;row-gap:22px;align-items:end;}
    .ltab .k{font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;
             color:var(--ink-faint);padding-bottom:9px;}
    .opt{font-size:14px;color:var(--ink-muted);display:inline-flex;align-items:center;gap:6px;padding-bottom:8px;}
    .opt .dot{width:14px;height:14px;border-radius:999px;border:1.5px solid var(--line-strong);}
    .opt.on{color:var(--ink);font-weight:600;}
    .opt.on .dot{border:4px solid var(--ink);}

    /* ── 2 · the page ──────────────────────────────────────────────── */
    .scrim{position:absolute;inset:0;background:var(--scrim);}
    .panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:600px;
           background:var(--surface);border-radius:16px;box-shadow:0 24px 64px oklch(0.2 0.02 65 / 0.28);
           padding:28px 32px 28px;}
    .panel h3{margin:0;font-family:var(--display);font-size:26px;line-height:32px;font-weight:500;}
    .card{background:var(--surface);border:1px solid var(--line);border-radius:16px;}
    .pen{width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:var(--ink-faint);}
    .drow{display:flex;align-items:center;gap:12px;min-height:44px;font-size:15px;line-height:20px;}
    .drow svg{color:var(--ink-faint);}
    .drow.add{color:var(--leaf);font-weight:500;}
    .drow.add svg{color:var(--leaf);}
    .hrow{display:flex;align-items:center;gap:16px;height:56px;border-bottom:1px solid var(--line);font-size:15px;}
    .logdisc{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);width:56px;height:56px;border-radius:999px;
             background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;
             box-shadow:0 0 0 6px var(--paper);}
    .edchip{position:absolute;right:12px;top:12px;height:36px;padding:0 12px;border-radius:999px;background:oklch(0.995 0.003 85 / 0.9);
            display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink);}
    .tile{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;}

    /* ── 2, further: the page's sheets in the label's hand ─────────── */
    .lpanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:680px;
            background:var(--surface);border-radius:16px;box-shadow:0 24px 64px oklch(0.2 0.02 65 / 0.28);padding:8px;}
    .lpanel .in{border:1px solid var(--line);border-radius:10px;padding:22px 30px 26px;}
    .lhead{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;
           border-bottom:1px solid var(--line);margin-bottom:22px;}
    .lhead h3{margin:0;font-family:var(--display);font-size:24px;line-height:30px;font-weight:500;display:flex;align-items:center;gap:10px;}
    .lhead h3 svg{color:var(--ink-faint);}
    .lf{display:flex;flex-direction:column;gap:6px;min-width:0;}
    .lfoot{margin-top:28px;display:flex;align-items:center;gap:12px;}
    .thumbs{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
    .th{aspect-ratio:1;border-radius:10px;overflow:hidden;border:2px solid transparent;background:var(--sunk);
        display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:var(--ink-muted);}
    .th.on{border-color:var(--leaf);}
    .th svg{display:block;width:100%;height:100%;}

    /* the app's Sheet from md */
    .scrim.blur{backdrop-filter:blur(4px);}
    .sheetp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:512px;max-height:792px;
            background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 24px 24px;}
    .shd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 8px;}
    .shd h2{margin:0;font-family:var(--display);font-size:26px;line-height:32px;font-weight:500;}
    .shb{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink-muted);}
    .shb:first-child{margin-left:-12px;} .shb:last-child{margin-right:-12px;}
    .btn.solid{background:var(--ink);color:var(--paper);}
    .codeline{display:flex;align-items:baseline;gap:8px;margin-bottom:14px;}
    .swap{margin-top:20px;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;
          background:var(--sunk);font-size:14px;line-height:20px;color:var(--ink-muted);}
    .swap svg{color:var(--ink-faint);}
    .datechip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;
              border:1px solid var(--line-strong);font-size:14px;font-weight:500;color:var(--ink);}

    /* the suggest list, hung from a line exactly as it hangs from a box */
    .pop{position:absolute;left:0;top:calc(100% + 4px);z-index:5;width:420px;background:var(--surface);
         border:1px solid var(--line);border-radius:12px;padding:4px 0;box-shadow:0 12px 32px oklch(0.2 0.02 65 / 0.16);}
    .pg{padding:12px 16px 4px;font-size:11px;line-height:16px;font-weight:600;letter-spacing:0.09em;
        text-transform:uppercase;color:var(--ink-faint);}
    .po{display:flex;align-items:center;gap:12px;padding:8px 16px;min-height:48px;}
    .po.on{background:var(--sunk);}
    .po .pv{font-family:var(--display);font-size:18px;line-height:22px;font-weight:500;}
    .po .pv.it{font-style:italic;}
    .po .pv b{font-weight:600;}
    .po .pd{font-size:13px;line-height:18px;color:var(--ink-muted);}
    .po .pm{margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--ink-faint);flex-shrink:0;}
    .po .thumb{width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0;}
    .psep{height:1px;background:var(--line);margin:4px 0;}

    /* ── 3 · the index ─────────────────────────────────────────────── */
    .idx{display:flex;flex-direction:column;}
    .ir{display:flex;gap:14px;padding:16px 18px;border-radius:12px;align-items:flex-start;}
    .ir svg{color:var(--ink-faint);margin-top:4px;}
    .ir .t{font-family:var(--display);font-size:20px;line-height:26px;font-weight:500;}
    .ir .s{margin-top:2px;font-size:14px;line-height:20px;color:var(--ink-muted);}
    .ir .s.none{color:var(--ink-faint);font-style:italic;font-family:var(--display);font-size:15px;}
    .ir.on{background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);}
    .ir.on svg{color:var(--leaf);}
    .ir .tick{margin-left:auto;color:var(--leaf);}
"""


def page(body: str) -> str:
    return (
        "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n"
        "  <script src=\"./support.js\"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n"
        f'  <link rel="stylesheet" href="{FONTS}">\n  <style>\n    :root{{{TOKENS}    }}\n{CSS}  </style>\n'
        "</helmet>\n" + PLATES + body + "\n</x-dc>\n</body>\n</html>\n"
    )


# ── Glyphs: Lucide ───────────────────────────────────────────────────────────

G = {
    "back": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "tag": '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    "place": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    "receipt": '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    "scissors": '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    "calendar": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    "down": '<path d="m6 9 6 6 6-6"/>',
    "left": '<path d="m15 18-6-6 6-6"/>',
    "right": '<path d="m9 18 6-6-6-6"/>',
    "dice": '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "close": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "drop": '<path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z"/>',
    "rows": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    "sliders": '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    "pen": '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    "trash": '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    "image": '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "ruler": '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    "layers": '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "sprout": '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
}


def ic(name, size=19, style=""):
    return f'<svg class="i" width="{size}" height="{size}" viewBox="0 0 24 24" style="{style}">{G[name]}</svg>'


def plate(genus, crop="xMidYMid"):
    kind = {"Philodendron": "philodendron", "Monstera": "monstera", "Anthurium": "anthurium",
            "Alocasia": "alocasia", "Ficus": "ficus", "Begonia": "begonia", "Peperomia": "peperomia"}.get(genus, "none")
    return (f'<svg class="plate" viewBox="0 0 100 76" preserveAspectRatio="{crop} slice">'
            f'<use href="#pl-{kind}" width="100" height="76"/></svg>')


# ── The two plants ───────────────────────────────────────────────────────────
# Vilt is half typed in: what it is, its name and its room. Gruyère has been
# in the collection since March 2024 and is opened to be corrected.

VILT = dict(
    genus="Philodendron", species="gloriosum", cultivar="", variegation="None", name="Vilt",
    place="Study", system="Soil", pot="", medium="", source="", price="", how="",
    since="Today", parent="", code="", status="",
)
GRUYERE = dict(
    genus="Monstera", species="deliciosa", cultivar="'Thai Constellation'", variegation="None",
    name="Gruyère", place="Living room", system="Semi-hydro", pot="21", medium="Pon",
    source="Plantje.nl", price="65,00", how="", since="3 Mar 2024", parent="", code="MON-8F3A",
    status="Active",
)


def species(d):
    return " ".join(x for x in (d["genus"], d["species"], d["cultivar"]) if x)


def prefix(d):
    src = "".join(ch for ch in (d["genus"] or d["name"]) if ch.isalnum())
    return src[:3].upper().ljust(3, "X") if src else "···"


# ── Shared pieces ────────────────────────────────────────────────────────────

def rail(active="new"):
    def item(glyph, word, key):
        if key == "new":
            cls = "nv on" if active == "new" else "nv plain"
            return f'<div class="{cls}"><span class="disc">{ic("plus", 20)}</span><span>{word}</span></div>'
        return f'<div class="nv{" on" if active == key else ""}">{ic(glyph, 22)}<span>{word}</span></div>'
    return ('<aside class="rail"><span class="mark">F</span>' + item("drop", "Today", "today")
            + item("rows", "Collection", "collection") + '<div style="height:6px"></div>'
            + item("plus", "New", "new") + '<div style="height:6px"></div>'
            + item("bookmark", "Wishlist", "wishlist") + item("sliders", "Settings", "settings") + "</aside>")


def window(body, active="new"):
    return f'<div class="app">{rail(active)}<main>{body}</main></div>'


def box(label, value="", ph="", kind="suggest", unit=None, width=None, focus=False):
    style = f"width:{width}px;flex-shrink:0;" if width else "flex:1;"
    lead = ic("calendar", 18) if kind == "date" else ""
    mono = " mono" if kind == "number" else ""
    text = f'<span class="v{mono}">{value}</span>' if value else f'<span class="ph">{ph}</span>'
    tail = f'<span class="u">{unit}</span>' if kind == "number" else (ic("down", 18) if kind != "text" else "")
    lab = f'<span class="label">{label}</span>' if label else ""
    return f'<div class="f" style="{style}">{lab}<div class="c{" focus" if focus else ""}">{lead}{text}{tail}</div></div>'


def seg(value, options=("Hydro", "Semi-hydro", "Soil")):
    return '<div class="seg">' + "".join(f'<span class="{"on" if o == value else ""}">{o}</span>' for o in options) + "</div>"


def chips(value, options):
    return '<div class="chips">' + "".join(f'<span class="chip{" on" if o == value else ""}">{o}</span>' for o in options) + "</div>"


def buttons(edit, wish=False, full=False):
    label, glyph = ("Save", "check") if edit else (("Add to wishlist" if wish else "Add to the collection"), "plus")
    grow = "flex:1;" if full else ""
    return (f'<span class="btn accent" style="{grow}">{ic(glyph, 19)}{label}</span>'
            f'<span class="btn outline">{ic("close", 18)}Cancel</span>')


# ══ 1 · The label ════════════════════════════════════════════════════════════

def ln(value="", ph="", size="sm", kind="suggest", unit="", focus=False, style=""):
    text = f'<span class="v">{value}</span>' if value else f'<span class="ph">{ph}</span>'
    tail = ""
    if kind == "suggest":
        tail = ic("down", 16)
    elif kind == "date":
        tail = ic("calendar", 16)
    elif kind == "number" and unit:
        tail = f'<span class="faint" style="font-size:14px">{unit}</span>'
    mono = ' mono' if kind == "number" else ""
    if mono and value:
        text = f'<span class="v mono">{value}</span>'
    return f'<div class="ln {size}{" focus" if focus else ""}" style="{style}">{text}{tail}</div>'


def opts(value, options):
    return ('<div style="display:flex;gap:18px">'
            + "".join(f'<span class="opt{" on" if o == value else ""}"><span class="dot"></span>{o}</span>' for o in options)
            + "</div>")


def label_sheet(d, edit):
    no = (f'<span class="stamp">{d["code"]}</span>' if edit
          else f'<span class="stamp">{prefix(d)}-<b>····</b></span>')
    stamp_note = "on the sticker" if edit else "drawn when you add it"
    photo = (
        '<div style="width:236px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">'
        f'<div class="mount" style="height:300px">{plate(d["genus"])}</div>'
        + ('<div style="display:flex;justify-content:space-between;align-items:center">'
           '<span class="hint">Newest photograph</span>'
           f'<span style="font-size:14px;font-weight:500;color:var(--leaf)">Choose another</span></div>'
           if edit else
           '<span class="hint">The genus plate, until the first photograph in the log.</span>')
        + "</div>"
    )
    head = (
        '<div style="display:flex;justify-content:space-between;align-items:baseline;'
        'padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:22px">'
        '<span class="cap">Florarithm · a plant in the collection</span>'
        f'<span style="display:flex;align-items:baseline;gap:10px"><span class="cap">No.</span>{no}'
        f'<span class="hint faint" style="color:var(--ink-faint)">{stamp_note}</span></span></div>'
    )
    names = (
        '<div style="display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:16px">'
        f'<div style="display:flex;flex-direction:column;gap:6px">{ln(d["genus"], "Genus", "big")}<span class="cap">Genus</span></div>'
        f'<div style="display:flex;flex-direction:column;gap:6px">{ln(d["species"], "species", "big")}<span class="cap">Species · or a × cross</span></div>'
        "</div>"
        '<div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,1fr);gap:16px;margin-top:18px">'
        f'<div style="display:flex;flex-direction:column;gap:6px">{ln(d["cultivar"], "cultivar", "mid")}<span class="cap">Cultivar</span></div>'
        f'<div style="display:flex;flex-direction:column;gap:6px">{ln(d["variegation"], "", "mid")}<span class="cap">Variegation</span></div>'
        '<div style="display:flex;flex-direction:column;gap:6px">'
        f'<div style="display:flex;gap:8px;align-items:flex-end">{ln(d["name"], "a name", "mid", kind="text", style="flex:1")}'
        f'<span style="color:var(--leaf);padding-bottom:8px">{ic("dice", 20)}</span></div><span class="cap">Called</span></div>'
        "</div>"
    )
    facts = (
        '<div class="ltab" style="margin-top:30px">'
        '<span class="k">Kept in</span>'
        f'<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end">'
        f'{ln(d["place"], "a room")}{opts(d["system"], ("Hydro", "Semi-hydro", "Soil"))}</div>'
        '<span class="k">Pot</span>'
        f'<div style="display:grid;grid-template-columns:110px minmax(0,1fr);gap:24px;align-items:end">'
        f'{ln(d["pot"], "", kind="number", unit="cm")}{ln(d["medium"], "medium")}</div>'
        '<span class="k">From</span>'
        f'<div style="display:grid;grid-template-columns:minmax(0,1fr) 120px auto;gap:24px;align-items:end">'
        f'{ln(d["source"], "a shop or a person")}{ln(d["price"], "", kind="number", unit="€")}'
        f'{opts(d["how"], ("Trade", "Gift"))}</div>'
        '<span class="k">Since</span>'
        f'<div style="display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;align-items:end">'
        f'{ln(d["since"], "", kind="date")}'
        '<span class="opt"><span class="box" style="width:16px;height:16px"></span>From tissue culture</span></div>'
        '<span class="k">Propagated from</span>'
        f'{ln(d["parent"], "not one of yours")}'
        "</div>"
    )
    return (
        '<div class="sheet"><div class="sheet-in">' + head
        + f'<div style="display:flex;gap:40px">{photo}<div style="flex:1;min-width:0">{names}{facts}</div></div>'
        + "</div></div>"
    )


def label_screen(d, edit=False):
    title = f'Edit {d["name"]}' if edit else "New plant"
    top = (
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">'
        f'<span class="back">{ic("back", 22)}</span><h1 style="flex:1">{title}</h1>'
        + ("" if edit else
           '<div class="seg" style="width:240px;height:40px;margin-right:16px"><span class="on">A plant</span><span>A wish</span></div>')
        + f'<div style="display:flex;gap:12px">{buttons(edit)}</div></div>'
    )
    foot = ""
    if edit:
        foot = (
            '<div style="margin-top:20px;display:flex;align-items:center;gap:28px">'
            '<span class="label">Status</span>'
            + opts("Active", ("Active", "Dormant", "Died", "Given away"))
            + f'<span style="margin-left:auto" class="danger">{ic("trash", 17)}Delete this plant for good</span></div>'
        )
    return window(top + label_sheet(d, edit) + foot, active="collection" if edit else "new")


# ══ 2 · The page ═════════════════════════════════════════════════════════════

def collection_behind():
    """What New opens over: the collection, as it is."""
    tiles = ""
    for genus, name, sp in (("Monstera", "Gruyère", "deliciosa 'Thai Constellation'"), ("Anthurium", "Fluweel", "clarinervium"),
                            ("Alocasia", "Ninja", "reginula 'Ninja'"), ("Ficus", "Reus", "lyrata"),
                            ("Begonia", "Spikkel", "maculata"), ("Peperomia", "Pepernoot", "argyreia"),
                            ("Philodendron", "Mos", "melanochrysum"), ("Monstera", "Kaas", "adansonii")):
        tiles += (f'<div class="tile"><div style="height:150px">{plate(genus)}</div>'
                  f'<div style="padding:10px 14px 14px"><div style="font-family:var(--display);font-size:18px;font-weight:500">{name}</div>'
                  f'<div class="hint">{genus} {sp}</div></div></div>')
    return (
        '<div style="display:flex;align-items:baseline;justify-content:space-between"><h1>Collection</h1>'
        '<span class="hint">64 plants · 13 rooms</span></div>'
        f'<div class="c" style="margin-top:20px;width:420px">{ic("search", 18)}<span class="ph">Name, species, place or system</span></div>'
        f'<div style="margin-top:28px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">{tiles}</div>'
    )


def new_panel(d):
    return (
        '<div class="panel">'
        '<div style="display:flex;justify-content:space-between;align-items:center">'
        '<h3>New plant</h3><div class="seg" style="width:220px;height:40px"><span class="on">A plant</span><span>A wish</span></div></div>'
        '<p class="hint" style="margin:6px 0 22px">What it is, what it is called and where it stands. The rest goes on its page, whenever you have it.</p>'
        '<div class="stack">'
        f'<div class="row">{box("Genus", d["genus"])}{box("Species", d["species"])}</div>'
        f'<div class="row">{box("Cultivar", d["cultivar"], "Ninja")}{box("Variegation", d["variegation"], kind="select", width=180)}</div>'
        f'<div class="f"><span class="label">Name</span><div class="row" style="gap:8px">{box("", d["name"], "Gruyère", kind="text")}'
        f'<span class="dice">{ic("dice", 20)}</span></div></div>'
        f'{box("Place", d["place"], "Pick one, or type a new place", focus=True)}'
        "</div>"
        f'<div style="margin-top:28px;display:flex;gap:12px">{buttons(False, full=True)}</div>'
        "</div>"
    )


def plant_page(d, fresh=False):
    """The plant page as it ships from `lg`: name and history on the left, the
    photograph and the record on the right. Each part of the record gets a pen."""
    tag = (f'<div class="hint" style="margin-top:8px;display:flex;gap:14px">'
           f'<span class="mono" style="letter-spacing:0.08em">{d["code"] or prefix(d) + "-3C1E"}</span>'
           f'<span>{d["place"]}</span><span>{d["system"]}</span></div>')
    if fresh:
        history = ('<div class="card" style="margin-top:20px;padding:22px 24px">'
                   '<div style="font-family:var(--display);font-size:19px;font-weight:500">Nothing logged yet</div>'
                   '<p class="hint" style="margin:6px 0 0">The first watering, a photograph or a note starts the history.</p></div>')
    else:
        rows = (("drop", "Watered", "2 days ago", "Thu 23 Oct"), ("drop", "Watered", "", "Fri 17 Oct"),
                ("sprout", "New leaf", "the fourth this year", "Mon 13 Oct"), ("drop", "Watered", "", "Sat 11 Oct"),
                ("image", "Photo", "", "Sat 11 Oct"), ("drop", "Watered", "", "Sun 5 Oct"), ("layers", "Repotted", "into 21 cm, pon", "Wed 1 Oct"))
        history = '<div style="margin-top:20px">' + "".join(
            f'<div class="hrow">{ic(g, 18, "color:var(--ink-faint)")}<span style="flex:1">{t}'
            f'<span class="muted"> {n}</span></span><span class="mono muted" style="font-size:13px">{when}</span></div>'
            for g, t, n, when in rows) + "</div>"

    def part(title, rows, pen=True):
        return (f'<div style="margin-top:22px"><div style="display:flex;align-items:center;justify-content:space-between">'
                f'<span class="label">{title}</span>' + (f'<span class="pen">{ic("pen", 15)}</span>' if pen else "")
                + f'</div><div style="margin-top:4px">{rows}</div></div>')

    def drow(glyph, text, add=False):
        return f'<div class="drow{" add" if add else ""}">{ic("plus" if add else glyph, 18)}<span>{text}</span></div>'

    lives = (drow("place", f'{d["place"]} · {d["system"]}')
             + (drow("ruler", f'{d["pot"]} cm · {d["medium"]}') if d["pot"] else drow("", "Add pot size and medium", add=True)))
    came = (drow("receipt", f'{d["source"]} · <span class="mono">€{d["price"]}</span>') if d["source"] else drow("", "Add where it came from", add=True))
    came += drow("calendar", f'Since <span class="mono">{"25 Oct 2026" if fresh else d["since"]}</span>')
    care = ('<div class="card" style="margin-top:44px;padding:6px 18px">'
            + drow("drop", "Never watered" if fresh else "Watered 2 days ago · usually every 6")
            + "</div>")
    left = (
        f'<span class="back">{ic("back", 22)}</span>'
        '<div style="display:flex;align-items:flex-start;gap:10px;margin-top:6px">'
        f'<div style="flex:1"><div style="font-family:var(--display);font-size:40px;line-height:43px;font-weight:500;letter-spacing:-0.025em">{d["name"]}</div>'
        f'<div style="font-size:17px;line-height:24px" class="muted">{species(d)}</div>{tag}</div>'
        f'<span class="pen" style="margin-top:6px">{ic("pen", 16)}</span></div>'
        '<div class="sh" style="margin-top:36px"><h2>History</h2></div>' + history
    )
    right = (
        '<div style="position:relative;height:268px;border-radius:16px;overflow:hidden" class="card">'
        f'{plate(d["genus"])}<span class="edchip">{ic("image", 14)}Photo</span></div>'
        '<div style="position:relative;height:0"><span class="logdisc" style="bottom:-28px">' + ic("plus", 24) + "</span></div>"
        + care + part("Where it lives", lives) + part("Where it came from", came)
        + ("" if fresh else
           '<div style="margin-top:36px;padding-top:16px;border-top:1px solid var(--line)">'
           f'<span class="danger" style="font-size:14px">{ic("trash", 16)}Delete this plant for good</span></div>')
    )
    return (
        '<div style="display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:32px;align-items:start">'
        f'<div>{left}</div><div>{right}</div></div>'
    )


def lives_panel(d):
    return (
        '<div class="panel" style="width:560px">'
        f'<div style="display:flex;align-items:center;gap:10px">{ic("place", 20, "color:var(--ink-faint)")}<h3>Where it lives</h3></div>'
        f'<p class="hint" style="margin:4px 0 22px">{d["name"]} · {species(d)}</p>'
        '<div class="stack">'
        f'{box("Place", d["place"])}'
        f'<div class="f"><span class="label">System</span>{seg(d["system"])}</div>'
        f'<div class="row">{box("Pot size", d["pot"], kind="number", unit="cm", width=128)}{box("Medium", d["medium"], focus=True)}</div>'
        "</div>"
        f'<div style="margin-top:28px;display:flex;gap:12px">{buttons(True, full=True)}</div>'
        "</div>"
    )


def page_new(d):
    return window(collection_behind() + '<div class="scrim"></div>' + new_panel(d), active="new")


def page_added(d):
    return window(plant_page(d, fresh=True), active="collection")


def page_edit(d):
    return window(plant_page(d) + '<div class="scrim"></div>' + lives_panel(d), active="collection")


# ══ 3 · The index ════════════════════════════════════════════════════════════

def index_rows(d, edit, active):
    parts = [
        ("tag", "What it is", f'{species(d)} · {d["name"]}' if d["genus"] else ""),
        ("place", "Where it lives", " · ".join(x for x in (d["place"], d["system"], f'{d["pot"]} cm' if d["pot"] else "", d["medium"]) if x)),
        ("receipt", "Where it came from", " · ".join(x for x in (d["source"], f'€{d["price"]}' if d["price"] else "", d["how"]) if x)
         + ((" · since " + d["since"]) if d["source"] else "")),
        ("scissors", "Family", d["parent"] or ""),
    ]
    if edit:
        parts += [("image", "Photo", "The newest"), ("clock", "Status", d["status"])]
    out = ""
    for glyph, title, summary in parts:
        on = title == active
        done = bool(summary) and not on
        s = (f'<div class="s">{summary}</div>' if summary
             else f'<div class="s none">{"Not propagated from one of yours" if title == "Family" else "Nothing yet"}</div>')
        out += (f'<div class="ir{" on" if on else ""}">{ic(glyph, 20)}<div style="flex:1;min-width:0">'
                f'<div class="t">{title}</div>{s}</div>'
                + (f'<span class="tick">{ic("check", 18)}</span>' if done and not edit else "")
                + (f'<span style="margin-left:auto;color:var(--ink-faint);margin-top:4px">{ic("right", 18)}</span>' if not on and edit else "")
                + "</div>")
    return out


def index_screen(d, edit=False):
    title = f'Edit {d["name"]}' if edit else "New plant"
    code = (f'<div class="mono" style="font-size:13px;letter-spacing:0.08em;color:var(--ink-faint);margin-top:2px">{d["code"]}</div>'
            if edit else "")
    if edit:
        active = "Where it came from"
        detail = (
            f'<div class="sh">{ic("receipt", 20)}<h2>Where it came from</h2></div>'
            '<div class="stack" style="margin-top:12px">'
            f'<div class="row">{box("From whom", d["source"])}{box("Price", d["price"], kind="number", unit="€", width=150, focus=True)}</div>'
            f'<div class="f"><span class="label">Not bought</span>{chips(d["how"], ("Trade", "Gift"))}</div>'
            f'{box("In the collection since", d["since"], kind="date", width=240)}'
            '<div class="check"><span class="box"></span><span>From tissue culture</span></div>'
            "</div>"
        )
        foot = f'<div style="margin-top:36px;display:flex;gap:12px">{buttons(True)}</div>'
    else:
        active = "Where it lives"
        detail = (
            f'<div class="sh">{ic("place", 20)}<h2>Where it lives</h2></div>'
            '<div class="stack" style="margin-top:12px">'
            f'{box("Place", d["place"])}'
            f'<div class="f"><span class="label">System</span>{seg(d["system"])}</div>'
            f'<div class="row">{box("Pot size", d["pot"], kind="number", unit="cm", width=128, focus=True)}'
            f'{box("Medium", d["medium"], "Pick one, or type a new medium")}</div>'
            "</div>"
        )
        foot = (
            '<div style="margin-top:36px;display:flex;align-items:center;gap:12px">'
            f'<span class="btn outline">Next: where it came from {ic("right", 18)}</span>'
            '<span class="hint" style="margin-left:8px">Add is there the whole time. The parts below can wait.</span></div>'
        )
    left = (
        '<div style="width:420px;flex-shrink:0;display:flex;flex-direction:column;height:836px">'
        f'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:22px"><span class="back" style="margin-top:-4px">{ic("back", 22)}</span>'
        f'<div><h1>{title}</h1>{code}</div></div>'
        + ("" if edit else '<div class="seg" style="height:40px;margin:0 0 18px"><span class="on">A plant</span><span>A wish</span></div>')
        + f'<div class="idx">{index_rows(d, edit, active)}</div>'
        + ("" if edit else f'<div style="margin-top:auto;padding:20px 0 32px;display:flex;gap:12px">{buttons(False, full=True)}</div>')
        + "</div>"
    )
    right = (
        '<div style="flex:1;min-width:0;display:flex;gap:40px;padding-top:4px">'
        f'<div style="flex:1;min-width:0;max-width:600px">{detail}{foot}</div>'
        f'<div style="width:220px;flex-shrink:0"><div class="card" style="height:220px;overflow:hidden">{plate(d["genus"])}</div>'
        f'<div style="margin-top:12px;font-family:var(--display);font-size:22px;font-weight:500">{d["name"]}</div>'
        f'<div class="hint">{species(d)}</div></div>'
        "</div>"
    )
    return window(f'<div style="display:flex;gap:56px">{left}{right}</div>', active="collection" if edit else "new")



# ══ 2, further: the page, in the sheet that already exists ═══════════════════
# `src/ui/Sheet.tsx` as it ships from `md`: a 512px panel, 12px corners, a
# hairline, the scrim with a blur behind it, the title centred in Newsreader
# between an optional Back on the left and ✕ on the right. No Cancel button:
# ✕, Esc and the scrim close it. One full-width solid button at the foot, as
# "Log repot" and "Save note" are. What changes is only what is inside it.

def lf(cap, inner):
    return f'<div class="lf">{inner}<span class="cap">{cap}</span></div>'


def sheet(title, body, back=False):
    left = (f'<span class="shb">{ic("left", 23)}</span>' if back else '<span class="shb"></span>')
    return (
        '<div class="sheetp">'
        f'<div class="shd">{left}<h2>{title}</h2><span class="shb">{ic("close", 22)}</span></div>'
        f'{body}</div>'
    )


def over(page_html, panel):
    return page_html + '<div class="scrim blur"></div>' + panel


def code_line(d):
    if d["code"]:
        return ('<div class="codeline"><span class="cap">No.</span>'
                f'<span class="stamp">{d["code"]}</span><span class="hint faint">on the sticker</span></div>')
    return ('<div class="codeline"><span class="cap">No.</span>'
            f'<span class="stamp">{prefix(d)}-<b>····</b></span><span class="hint faint">drawn when you add it</span></div>')


def names_block(d, genus_line=None, cross=False, pop=""):
    """Genus over the species, each on its own line. A sheet is 464px inside;
    side by side, a genus and a species at the label's size did not fit, and a
    cross never would. Stacked, a species and a cross are the same layout."""
    g = genus_line or ln(d["genus"], "Genus", "big")
    epithet = d["cross"] if cross else d["species"]
    ep_line = (f'<div class="ln big" style="font-size:24px;line-height:30px;white-space:normal"><span class="v" style="white-space:normal">{epithet}</span></div>'
               if cross else ln(epithet, "species", "big"))
    return (
        f'<div style="position:relative">{lf("Genus", g)}{pop}</div>'
        f'<div style="margin-top:16px">{lf("Cross · parents joined by ×" if cross else "Species · or a × cross", ep_line)}</div>'
        '<div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,0.65fr);gap:16px;margin-top:16px">'
        + lf("Cultivar", ln(d["cultivar"], "cultivar", "mid"))
        + lf("Variegation", ln(d["variegation"], "", "mid"))
        + "</div>"
        f'<div style="margin-top:16px">'
        + lf("Called", f'<div style="display:flex;gap:10px;align-items:flex-end">{ln(d["name"], "a name", "mid", kind="text", style="flex:1")}'
                       f'<span style="color:var(--leaf);padding-bottom:8px">{ic("dice", 20)}</span></div>')
        + "</div>"
    )


def block(label, kind="solid", glyph=""):
    g = ic(glyph, 19) if glyph else ""
    return f'<span class="btn {kind}" style="width:100%">{g}{label}</span>'


def further_new(d, genus_line=None, pop=""):
    body = (
        '<div class="seg" style="height:40px;margin:4px 0 16px"><span class="on">A plant</span><span>A wish</span></div>'
        + code_line(d)
        + names_block(d, genus_line=genus_line, pop=pop)
        + f'<div style="margin-top:16px">{lf("Kept in", ln(d["place"], "a room", focus=not pop))}</div>'
        + f'<div style="margin-top:12px">{opts(d["system"], ("Hydro", "Semi-hydro", "Soil"))}</div>'
        + f'<div style="margin-top:22px">{block("Add to the collection", "accent", "plus")}</div>'
        + '<p class="hint" style="margin:10px 0 0;text-align:center">Pot, medium and where it came from go on its page.</p>'
    )
    return window(over(collection_behind(), sheet("New plant", body)), active="new")


def further_what(d, cross=False):
    body = (
        code_line(d) + names_block(d, cross=cross)
        + '<div style="margin-top:20px"><span class="cap">Status</span>'
        + f'<div style="margin-top:6px">{opts("Active", ("Active", "Dormant", "Died", "Given away"))}</div></div>'
        + f'<div style="margin-top:22px">{block("Save", "accent", "check")}</div>'
    )
    page_d = dict(d, species=d["cross"]) if cross else d
    return window(over(plant_page(page_d), sheet("What it is", body)), active="collection")


def further_lives(d):
    body = (
        lf("Kept in", ln(d["place"], "a room"))
        + f'<div style="margin-top:12px">{opts(d["system"], ("Hydro", "Semi-hydro", "Soil"))}</div>'
        + '<div style="display:grid;grid-template-columns:110px minmax(0,1fr);gap:20px;margin-top:20px">'
        + lf("Pot", ln(d["pot"], "", kind="number", unit="cm")) + lf("Medium", ln(d["medium"], "medium", focus=True))
        + "</div>"
        + '<div class="swap">'
        f'{ic("layers", 18)}<span style="flex:1">Moved it into a new pot? Log it as a repot, so it stays in the history.</span>'
        f'<span style="color:var(--leaf);font-weight:600;display:flex;align-items:center;gap:2px">Repot{ic("right", 16)}</span></div>'
        + f'<div style="margin-top:20px">{block("Save", "accent", "check")}</div>'
    )
    return window(over(plant_page(d), sheet("Where it lives", body)), active="collection")


def further_repot(d):
    """The Repot sheet that already exists, in the same hand, reached from the
    line above: Back returns to Where it lives, as a swapped sheet does."""
    body = (
        f'<div class="datechip">{ic("calendar", 16)}Today</div>'
        '<p class="hint" style="margin:14px 0 18px">Repotting changes the plant itself, not just the log: '
        'the system, pot size and medium below become the plant\'s.</p>'
        + opts("Semi-hydro", ("Hydro", "Semi-hydro", "Soil"))
        + '<div style="display:grid;grid-template-columns:110px 110px;gap:20px;margin-top:20px">'
        + lf("From", ln("21", "", kind="number", unit="cm")) + lf("To", ln("", "", kind="number", unit="cm", focus=True))
        + "</div>"
        + f'<div style="margin-top:16px">{lf("Medium", ln("Pon", "medium"))}</div>'
        + f'<div style="margin-top:16px">{lf("Why", ln("", "Roots through the bottom", kind="text"))}</div>'
        + f'<div style="margin-top:22px">{block("Log repot", "accent", "check")}</div>'
    )
    return window(over(plant_page(d), sheet("Repot", body, back=True)), active="collection")


def further_came(d):
    body = (
        '<div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:20px">'
        + lf("From", ln(d["source"], "a shop or a person")) + lf("Price", ln(d["price"], "", kind="number", unit="€"))
        + "</div>"
        + '<div style="margin-top:20px"><span class="cap">Not bought</span>'
        + f'<div style="margin-top:6px">{opts(d["how"], ("Trade", "Gift"))}</div></div>'
        + f'<div style="margin-top:20px;max-width:220px">{lf("Since", ln(d["since"], "", kind="date"))}</div>'
        + '<div style="margin-top:16px" class="opt"><span class="box" style="width:16px;height:16px"></span>From tissue culture</div>'
        + f'<div style="margin-top:22px">{block("Save", "accent", "check")}</div>'
    )
    return window(over(plant_page(d), sheet("Where it came from", body)), active="collection")


def further_photo(d):
    crops = ("xMidYMid", "xMinYMin", "xMaxYMid", "xMidYMax")
    cells = '<span class="th on">Newest</span>' + "".join(f'<span class="th">{plate(d["genus"], c)}</span>' for c in crops)
    body = (f'<div class="thumbs" style="margin-top:6px">{cells}</div>'
            '<p class="hint" style="margin:14px 0 0">Which one stands for the plant. Every photograph stays in the history either way.</p>'
            f'<div style="margin-top:22px">{block("Save", "accent", "check")}</div>')
    return window(over(plant_page(d), sheet("Photo", body)), active="collection")


INKT = dict(GRUYERE, genus="Anthurium", species="", cross="(papillilaminum × crystallinum) × warocqueanum",
            cultivar="", name="Fluister", code="ANT-41D0", place="Study", system="Semi-hydro", pot="12",
            medium="Pon")


def po(value, detail="", meta="", italic=False, thumb="", on=False, needle=""):
    v = value.replace(needle, f"<b>{needle}</b>", 1) if needle else value
    t = f'<span class="thumb">{plate(thumb)}</span>' if thumb else ""
    dd = f'<span class="pd">{detail}</span>' if detail else ""
    m = f'<span class="pm">{meta}</span>' if meta else ""
    return (f'<div class="po{" on" if on else ""}">{t}<span style="display:flex;flex-direction:column;min-width:0">'
            f'<span class="pv{" it" if italic else ""}">{v}</span>{dd}</span>{m}</div>')


def further_suggest(d):
    pop = (
        '<div class="pop" style="width:100%">'
        '<div class="pg">Genus · fills in the genus</div>'
        + po("Philodendron", meta="6 plants", italic=True, on=True, needle="Philo")
        + '<div class="psep"></div><div class="pg">A plant you have · fills in what it is</div>'
        + po("Mos", "Philodendron melanochrysum", "PHI-2A7C", thumb="Philodendron")
        + po("Vlek", "Philodendron 'Birkin'", "PHI-9E10", thumb="Philodendron")
        + '<div class="psep"></div><div class="pg">iNaturalist · fills in what it is</div>'
        + po("Philodendron gloriosum", "Velvet-leaf philodendron", italic=True, needle="Philo")
        + po("Philodendron verrucosum", "Ecuador philodendron", italic=True, needle="Philo")
        + "</div>"
    )
    typing = (f'<div class="ln big focus"><span class="v">Philo<span style="border-left:2px solid var(--ink);margin-left:1px"></span>'
              f'</span>{ic("down", 16)}</div>')
    blank = dict(EMPTY_NEW, genus="Philo")
    return further_new(blank, genus_line=typing, pop=pop)


EMPTY_NEW = dict(VILT, genus="", species="", name="", place="", system="Hydro")


FURTHER = [
    ("FurtherNew", further_new(VILT), "New — in the sheet that already exists", "further",
     "The app's own sheet, unchanged: 512px, the title centred between ✕ and nothing, the scrim blurred "
     "behind it, no Cancel because ✕, Esc and the scrim already close it. Only its contents change: lines "
     "to write on with their captions printed small, instead of boxes.\n\n"
     "Genus and species stack. Side by side they did not fit a 464px sheet at the label's size, and a "
     "cross never would. The one button at the foot is leaf green in every one of these sheets."),
    ("PageAdded2", page_added(VILT), "Straight after Add", "further",
     "The page says what is still missing, where it will be read. Each Add opens the same sheet its pen does."),
    ("FurtherSuggest", further_suggest(VILT), "The suggest list, on a line", "further",
     "Every line that has a list today keeps it. It is the same `SuggestField` with a line for a face, and "
     "the list hangs from it as it hangs from a box, the sheet's own width."),
    ("FurtherWhat", further_what(GRUYERE), "Edit — the pen beside the name", "further",
     "What it is, its name and its status. The code sits at the top as a line you can read and not change. "
     "Save is leaf green. Delete is not here at all: under a Save it is one slip away, so it went to the "
     "foot of the page."),
    ("FurtherPage", window(plant_page(GRUYERE), active="collection"), "Delete, at the foot of the page", "further",
     "Delete for good is the last line under the record, after Where it came from, with a hairline above it "
     "and nothing to press near it. It still opens the confirmation the app has now, and it says what goes "
     "with it: every watering, photograph and note. Died and Given away stay in the status, because those "
     "keep the history; this is for a record that should never have existed."),
    ("FurtherCross", further_what(INKT, cross=True), "A cross", "further",
     "No hybrid switch. A × in the epithet line makes it a cross, and a lone x becomes × as you type. "
     "Stacked, a cross needs no layout of its own: it takes the same line, one size down, and wraps when the parentage is longer than the sheet. The data keeps "
     "`species` and `cross` as two fields."),
    ("FurtherLives", further_lives(GRUYERE), "Edit — Where it lives", "further",
     "Room, system, pot and medium, for setting them right. A new pot is not a correction: Repot already "
     "changes these on the plant and keeps the day in the history. So the sheet says so, and its Repot "
     "swaps the sheet over to the existing Repot form, the way the log sheet swaps a form in."),
    ("FurtherRepot", further_repot(GRUYERE), "Repot, reached from Where it lives", "further",
     "The Repot form that already exists, with Back to Where it lives. Drawn in the same hand to show the "
     "cost of this direction: if the plant's sheets are written on lines, the log sheet's forms should be "
     "too, or the same pot size looks two ways depending on which pen you pressed. Its Log repot turns green with the rest: Log repot and Save note are black today."),
    ("FurtherCame", further_came(GRUYERE), "Edit — Where it came from", "further",
     "From whom and the price on one line, Trade and Gift as a choice you can leave empty."),
    ("FurtherPhoto", further_photo(GRUYERE), "Edit — the chip on the photograph", "further",
     "The chip on the photograph was Edit; with no edit screen left it says Photo and opens this."),
]


# ── The artboards and their notes ────────────────────────────────────────────

ARTBOARDS = FURTHER + [
    ("LabelNew", label_screen(VILT), "1 · The label — New", "label",
     "One sheet, written the way a herbarium label is written: the name of the plant set large across "
     "the top, the facts below it as lines to write on, each with its small printed caption. The genus "
     "plate is mounted where the specimen would be, and the sheet number in the corner is the code, its "
     "three letters following the genus as you type.\n\n"
     "Everything is on one sheet and the sheet fits the window, so Add sits beside the title and never "
     "scrolls away. The choices that have three or four answers are printed options to tick, not "
     "controls, and Trade and Gift sit at the end of the From line: an empty choice means it was bought."),
    ("LabelEdit", label_screen(GRUYERE, edit=True), "1 · The label — Edit", "label",
     "The same sheet with the plant on it. Editing is reading the label and writing over the line "
     "that is wrong; nothing moves between New and Edit except that the lines are filled. The real code "
     "is in the corner, the photograph is mounted, Choose another sits under it, and Status and Delete "
     "go under the sheet, because they are about the record, not written on it.\n\n"
     "The aesthetic risk: underlined blanks on a sheet instead of the app's boxed fields. Inputs on paper "
     "rather than boxes on paper, which is what the no-card-around-inputs rule was protecting."),

    ("PageNew", page_new(VILT), "2 · The page — New", "page",
     "New stops being a screen. It is a sheet over whatever you were looking at, asking for the four "
     "things a plant needs before it can be found among 64: what it is, its name, and the room it "
     "stands in. Add takes you to its page."),
    ("PageAdded", page_added(VILT), "2 · The page — straight after Add", "page",
     "The plant exists and its page says what is missing, in the place it will be read: Add pot size "
     "and medium, Add where it came from. Fill them in now, or the day the receipt turns up."),
    ("PageEdit", page_edit(GRUYERE), "2 · The page — Edit", "page",
     "There is no edit screen. Each part of the plant page carries a pen, and the pen opens that part "
     "alone in a sheet: here Where it lives, to change the medium after a repot. The pen beside the "
     "name opens what it is, its name, status and Delete.\n\n"
     "It is the app's own rule followed all the way: work opens in a sheet. The cost is that a record "
     "is never seen whole while it is being written."),

    ("IndexNew", index_screen(VILT), "3 · The index — New", "index",
     "The record's parts as a list, each with what it holds so far, and the open part's fields beside "
     "it. The list is the overview: What it is is ticked and reads back Philodendron gloriosum · Vilt; "
     "the parts below say Nothing yet. Next walks down the list, Add is under it the whole time, and "
     "no part ever needs a scroll."),
    ("IndexEdit", index_screen(GRUYERE, edit=True), "3 · The index — Edit", "index",
     "Edit opens on the same list, with every part's current value in it, so you find the wrong fact "
     "by reading, and click it. Photo and Status are parts like the others. Save is under the part you "
     "changed. The plant itself stays small at the right, so the screen always says whose record it is."),
]

PAGES = [("further", "2, taken further: the page, in the label's hand"), ("label", "1 · The label"), ("page", "2 · The page"), ("index", "3 · The index")]

INTRO = (
    "Taken further: direction 2, the page, which there is no edit screen in. Each part of the plant page "
    "is edited in its own sheet, and New is a short sheet that lands on the page. The sheets borrow the "
    "look of direction 1: lines to write on, small printed captions, the code as a sheet number. The "
    "three original directions follow below it.\n\n"
    "A fresh start on adding a plant and editing one, on a 1440 × 900 window. The three directions "
    "disagree about what this form is: a label written in one go, the plant page edited where it is "
    "read, or an index of the record with one part open.\n\n"
    "Held over from before: Where it came from has no Nursery or Shop any more, since From whom already "
    "names the shop. Trade and Gift stay as an optional choice. Vilt is a new plant, half typed in; "
    "Gruyère has been in the collection since March 2024. Photographs are the genus plate, standing in."
)


def md(text):
    out = []
    for para in text.split("\n\n"):
        p = _html.escape(para)
        p = re.sub(r"`([^`]+)`", r"<code>\1</code>", p)
        out.append(f"<p>{p}</p>")
    return "".join(out)


def canvas_json():
    boards, notes, col = [], [], {}
    for file, _, title, pg, note in ARTBOARDS:
        i = col.get(pg, 0)
        col[pg] = i + 1
        boards.append(dict(file=f"{file}.dc.html", title=title, page=pg, x=i * 1540, y=0, w=1440, h=900))
        notes.append(dict(id=file.lower(), page=pg, x=i * 1540, y=960, w=560, text=note))
    notes.append(dict(id="intro", page="further", x=-640, y=0, w=560, text=INTRO))
    return json.dumps(dict(pages=[dict(id=i, name=n) for i, n in PAGES], artboards=boards, annotations=notes,
                           launch=dict(view="canvas", page="further")), indent=2, ensure_ascii=False) + "\n"


def viewer():
    sections = []
    for pid, pname in PAGES:
        figs = ""
        for file, body, title, pg, note in ARTBOARDS:
            if pg != pid:
                continue
            doc = page(body).replace('  <script src="./support.js"></script>\n', "")
            figs += (f'<figure class="board"><figcaption>{_html.escape(title)}</figcaption>'
                     f'<div class="frame"><iframe title="{_html.escape(title)}" loading="lazy" '
                     f'srcdoc="{_html.escape(doc, quote=True)}"></iframe></div>'
                     f'<div class="note">{md(note)}</div></figure>')
        sections.append(f'<section><h2>{pname}</h2>{figs}</section>')
    tpl = (HERE / "viewer.html").read_text()
    return tpl.replace("{{INTRO}}", md(INTRO)).replace("{{SECTIONS}}", "".join(sections))


if __name__ == "__main__":
    for file, body, *_ in ARTBOARDS:
        (HERE / f"{file}.dc.html").write_text(page(body))
    (HERE / "canvas.json").write_text(canvas_json())
    (HERE / "canvas.html").write_text(viewer())
    print("wrote", len(ARTBOARDS), "artboards, canvas.json, canvas.html")
