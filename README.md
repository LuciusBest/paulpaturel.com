# dynamicTextOverlay

Displays scroll-sensitive project descriptions that reveal or hide non-highlighted words on click and a secondary fixed name overlay that flips between “PAUL” and “PATUREL”.

## Overview
The script observes `.project_container` elements and shows the paragraph for the most visible project in a fixed overlay. Each paragraph loads from `js/projectTexts.json`, which provides the paragraph text and a list of zero-based word indices to highlight.

## How it works
- paragraphs loaded via `fetch` at startup
- words wrapped in `<span class="word">`; highlighted words get `.highlight`
- clicking anywhere sequentially hides or reveals non-highlighted words over 3200ms, using evenly spaced timeouts
- the left overlay toggles letters of “PAUL”/“PATUREL” in the same 3.2s schedule
- the overlay resets to the collapsed (highlight-only) state whenever the visible project changes

## Usage & customization
- edit `js/projectTexts.json` to change paragraph texts and `highlight` indices
- adjust highlight styling in `css/ui.css`
- include the script with `<script src="js/dynamicTextOverlay.js" defer></script>`

## Tech constraints
Vanilla JavaScript only; no external libraries or bundlers. Requires a browser environment supporting `IntersectionObserver` and `fetch`.
