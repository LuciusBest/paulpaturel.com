# dynamicTextOverlay

Displays scroll-sensitive project descriptions that reveal or hide non-highlighted words on click and a secondary fixed name overlay that flips between “PAUL” and “PATUREL”.

## Overview
The script observes `.project_container` elements and shows the paragraph for the most visible project in a fixed overlay. Each paragraph loads from `js/projectTexts.json`.

Highlighting options:
- Inline tags (recommended): wrap words with `<tag>...</tag>` to highlight specific words, e.g. `<tag>Website</tag> design … <tag>2023</tag>`.
- Legacy indices: provide a `highlight` array of zero-based word indices.

## How it works
- paragraphs loaded via `fetch` at startup
- words wrapped in `<span class="word">`; highlighted words get `.highlight`
- supports inline `<tag>...</tag>` in `text` to mark highlights (no other HTML is parsed)
- clicking anywhere sequentially hides or reveals non-highlighted words at 20 words per second (50 ms per word)
- the left overlay toggles letters of “PAUL”/“PATUREL” at 200 ms per letter
- the overlay resets to the collapsed (highlight-only) state whenever the visible project changes

## Usage & customization
- edit `js/projectTexts.json` to change paragraph texts and `highlight` indices
- adjust highlight styling in `css/ui.css`
- include the script with `<script src="js/dynamicTextOverlay.js" defer></script>`

## Tech constraints
Vanilla JavaScript only; no external libraries or bundlers. Requires a browser environment supporting `IntersectionObserver` and `fetch`.
