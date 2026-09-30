#!/usr/bin/env python3
"""Baut die statischen Seiten von psi-pulse nach landing/dist/.

Nur Standardbibliothek. Jede Seite hat eine Vorlage mit {{ schluessel }}-Platzhaltern; Teilvorlagen
(Kopf, Navigation, Fuß) werden mit {{> _datei.html }} eingebunden. Die Texte je Sprache stehen in
src/de.toml und src/en.toml (Startseite, Navigation, Fuß), Textseiten haben zusätzlich eigene Dateien
(src/<name>.de.toml, src/<name>.en.toml). Deren Werte dürfen andere Schlüssel einsetzen, etwa ein Datum.
Codebeispiele stehen dort als code.<name>.src (Quelltext), .lang (html oder css) und .label (Name für
Screenreader); der Build hebt sie hervor und setzt sie als {{ code_<name> }} ein.
Haben DE und EN nicht dieselben Schlüssel, fehlt einer oder bleibt einer unbenutzt, bricht der Build ab,
damit beide Fassungen gleich aufgebaut bleiben. Offene Stellen stehen als [[OFFEN: …]] im Text; der Build
meldet sie, deploy.sh bricht dann ab.

    python3 landing/build.py          # baut nach landing/dist/
"""
import hashlib
import html
import math
import re
import shutil
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, STATIC, DIST = ROOT / "src", ROOT / "static", ROOT / "dist"
PLACEHOLDER = re.compile(r"\{\{\s*([a-z0-9_]+)\s*\}\}")
INCLUDE = re.compile(r"\{\{>\s*([a-z0-9_.-]+)\s*\}\}")
OPEN = re.compile(r"\[\[OFFEN:[^\]]*\]\]")
LANGS = ("de", "en")
# name: (Vorlage, eigene Texte src/<name>.<lang>.toml oder None, Pfad je Sprache). Die erste Seite ist die Startseite.
PAGES = {
    "home": ("page.html", None, {"de": "/", "en": "/en/"}),
    "a11y": ("legal.html", "barrierefreiheit", {"de": "/barrierefreiheit/", "en": "/en/accessibility/"}),
    "dev": ("developers.html", "entwickler", {"de": "/entwickler/", "en": "/en/developers/"}),
}


def chart_paths():
    """Schematische Vergessenskurve fürs Hero-Bild, 0–30 Tage.

    Ohne Wiederholung fällt die Kurve schnell ab. Mit Wiederholung springt sie an den Tagen, an
    denen Pulse nach den Abständen 1, 2, 4, 7 und 14 Tage fragt (Tag 1, 3, 7, 14, 28), wieder
    auf 100 % und fällt danach langsamer. Die Stabilitätswerte sind illustrativ, keine Messdaten.
    """
    x0, x1, y0, y1 = 44, 468, 196, 24          # Zeichenfläche: Tag 0..30, Behalten 0..100 %

    def pt(day, r):
        return f"{x0 + (x1 - x0) * day / 30:.1f},{y0 + (y1 - y0) * r:.1f}"

    def decay(t0, t1, s, step=0.5):
        n = max(1, round((t1 - t0) / step))
        return [pt(t0 + (t1 - t0) * i / n, math.exp(-(t1 - t0) * i / n / s)) for i in range(n + 1)]

    forget = "M" + " L".join(decay(0, 30, 2.2))
    reviews, stability = [0, 1, 3, 7, 14, 28], [1.2, 2.6, 5.5, 11, 22, 40]
    parts = []
    for i, t0 in enumerate(reviews):
        t1 = reviews[i + 1] if i + 1 < len(reviews) else 30
        seg = decay(t0, t1, stability[i])
        parts.append(("M" if i == 0 else "L") + seg[0])
        parts += ["L" + p for p in seg[1:]]
    dots = "".join(f'<circle cx="{pt(d, 1).split(",")[0]}" cy="{y1}" r="4"/>' for d in reviews[1:])
    return {"chart_forget": forget, "chart_review": " ".join(parts), "chart_dots": dots}


CODE_SAMPLE = """<script defer
  src="https://pulse.psi.uni-bamberg.de/embed/v2/pulse.min.js"></script>

<pulse-question key="{key}">
  <p>{q}</p>
  <details><summary>{answer}</summary>
    <p>{a}</p>
  </details>
</pulse-question>"""
TAG = re.compile(r"(<!--.*?-->|<[^>]*>)", re.S)
TAG_PART = re.compile(r'(</?)([a-z][a-z0-9-]*)|([a-z-]+)(?:(=)("[^"]*"))?|(\s+)|(/?>)')
CSS_PART = re.compile(r"(/\*.*?\*/)|([{};])|([^{};/]+|/)", re.S)


def assert_lossless(src, result):
    """Ohne Spans und Entities muss exakt der Quelltext übrig bleiben, sonst fehlt Code in der Anzeige."""
    assert html.unescape(re.sub(r"<[^>]+>", "", result)) == src, "Highlighting hat Zeichen verloren"
    return result


def highlight_html(src):
    """Hebt HTML-Beispiele beim Build hervor, als <span class="t-…">; kein JavaScript im Browser.

    Deckt nur ab, was in den Beispielen vorkommt: Kommentare, Tags, Attribute (mit Wert in doppelten
    Anführungszeichen oder ohne Wert), Text zwischen den Tags.
    """
    esc, out = html.escape, []
    for piece in TAG.split(src):
        if piece.startswith("<!--"):
            out.append(f'<span class="t-com">{esc(piece)}</span>')
            continue
        if not piece.startswith("<"):
            out.append(esc(piece, quote=False))
            continue
        for m in TAG_PART.finditer(piece):
            open_, tag, attr, eq, val, space, close = m.groups()
            if tag:
                out.append(f'<span class="t-punct">{esc(open_)}</span><span class="t-tag">{tag}</span>')
            elif attr:
                out.append(f'<span class="t-attr">{attr}</span>')
                if eq:
                    out.append(f'<span class="t-punct">=</span><span class="t-val">{esc(val)}</span>')
            elif space:
                out.append(space)
            else:
                out.append(f'<span class="t-punct">{esc(close)}</span>')
    return assert_lossless(src, "".join(out))


def highlight_css(src):
    """Wie highlight_html für CSS: Selektoren, Eigenschaften, Werte, Kommentare (ohne verschachtelte Blöcke)."""
    esc, out, inside = html.escape, [], False
    for comment, punct, text in CSS_PART.findall(src):
        if comment:
            out.append(f'<span class="t-com">{esc(comment)}</span>')
        elif punct:
            inside = {"{": True, "}": False}.get(punct, inside)
            out.append(f'<span class="t-punct">{esc(punct)}</span>')
        elif not text.strip():
            out.append(text)
        elif not inside:
            lead = text[:len(text) - len(text.lstrip())]
            out.append(f'{lead}<span class="t-tag">{esc(text.lstrip())}</span>')
        else:
            prop, colon, value = text.partition(":")
            lead = prop[:len(prop) - len(prop.lstrip())]
            out.append(f'{lead}<span class="t-attr">{esc(prop.lstrip())}</span>')
            if colon:
                out.append(f'<span class="t-punct">:</span><span class="t-val">{esc(value)}</span>')
    return assert_lossless(src, "".join(out))


def code_block(code):
    """Codebeispiel einer Textseite (code.<name> in der TOML-Datei) als scrollbarer, fokussierbarer Block."""
    highlight = {"html": highlight_html, "css": highlight_css}[code["lang"]]
    return (f'<pre class="code" role="region" tabindex="0" aria-label="{html.escape(code["label"])}">'
            f'<code>{highlight(code["src"].strip())}</code></pre>')


def load_template(name):
    """Vorlage mit eingesetzten Teilvorlagen (eine Ebene genügt)."""
    text = (SRC / name).read_text(encoding="utf-8")
    return INCLUDE.sub(lambda m: (SRC / m.group(1)).read_text(encoding="utf-8").rstrip("\n"), text)


def load_texts(stem):
    """Texte je Sprache; DE und EN müssen dieselben Schlüssel haben."""
    texts = {lang: tomllib.loads((SRC / f"{stem}.{lang}.toml" if stem else SRC / f"{lang}.toml")
                                 .read_text(encoding="utf-8")) for lang in LANGS}
    # Codebeispiele (code.<name>.src/.lang/.label) werden beim Build zu {{ code_<name> }}
    for t in texts.values():
        t.update({f"code_{name}": code_block(code) for name, code in t.pop("code", {}).items()})
    de, en = (texts[lang].keys() for lang in LANGS)
    errors = [f"{stem + '.' if stem else ''}de/en.toml: nur in {lang} {sorted(keys)}"
              for lang, keys in (("de", de - en), ("en", en - de)) if keys]
    return {lang: {k: str(v).strip() for k, v in t.items()} for lang, t in texts.items()}, errors


def main():
    css = (STATIC / "pulse-landing.css").read_bytes()
    shared = {"css_ver": hashlib.sha256(css).hexdigest()[:10], **chart_paths()}
    home_paths = next(iter(PAGES.values()))[2]

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(STATIC, DIST / "assets")

    common, errors = load_texts(None)
    used_common = {lang: set() for lang in LANGS}
    open_spots = []
    for name, (template_name, stem, paths) in PAGES.items():
        template = load_template(template_name)
        wanted = set(PLACEHOLDER.findall(template))
        own, own_errors = load_texts(stem) if stem else ({lang: {} for lang in LANGS}, [])
        errors += own_errors
        for lang in LANGS:
            alt = next(other for other in LANGS if other != lang)
            values = {
                **shared, **common[lang], **own[lang],
                "self_path": paths[lang], "alt_path": paths[alt], "de_path": paths["de"], "en_path": paths["en"],
                **{f"{page}_path": PAGES[page][2][lang] for page in PAGES},   # home_path, a11y_path, dev_path
                # Abschnitte der Startseite: dort #anker, auf Unterseiten /#anker bzw. /en/#anker
                "anchor_base": "" if paths is home_paths else home_paths[lang],
            }
            # Werte der Textseite dürfen andere Schlüssel einsetzen, z. B. {{ date_created }} (eine Ebene)
            refs = {ref for text in own[lang].values() for ref in PLACEHOLDER.findall(text)}
            for key in own[lang]:
                values[key] = PLACEHOLDER.sub(lambda m: values.get(m.group(1), m.group(0)), values[key])
            if name == "home":
                text = common[lang]
                values["teach_code"] = highlight_html(CODE_SAMPLE.format(
                    key=text["teach_code_key"], q=text["teach_code_q"], a=text["teach_code_a"],
                    answer=text["demo_answer"]))
                wanted |= {"teach_code_key", "teach_code_q", "teach_code_a"}
            missing = (wanted | refs) - values.keys()
            unused = own[lang].keys() - wanted - refs
            used_common[lang] |= wanted
            if missing:
                errors.append(f"{name}/{lang}: fehlt {sorted(missing)}")
            if unused:
                errors.append(f"{name}/{lang}: unbenutzt {sorted(unused)}")
            if missing:
                continue
            out = PLACEHOLDER.sub(lambda m: values[m.group(1)], template)
            open_spots += [f"{paths[lang]}: {spot}" for spot in OPEN.findall(out)]
            target = DIST / paths[lang].strip("/") / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(out, encoding="utf-8")

    for lang in LANGS:
        unused = common[lang].keys() - used_common[lang]
        if unused:
            errors.append(f"{lang}.toml: unbenutzt {sorted(unused)}")
    if errors:
        sys.exit("\n".join(errors))
    print(f"gebaut: {DIST}")
    if open_spots:
        print("noch offen (deploy.sh bricht ab):\n  " + "\n  ".join(open_spots))


if __name__ == "__main__":
    main()
