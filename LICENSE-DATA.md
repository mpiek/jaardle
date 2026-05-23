# Dataset License — CC BY-SA 4.0

The event datasets in this repository:

- `events.en.json` — English historical events scraped from English Wikipedia
- `events.nl.json` — Dutch translation of the same events (LLM-assisted: Gemini 2.5 Flash + Claude)
- `events.min.json` — compact runtime version of `events.nl.json`

are derived from [English Wikipedia](https://en.wikipedia.org/) and are licensed under
**[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)**.

## Attribution

When using or redistributing the datasets, please credit:

> Historical event data derived from English Wikipedia (CC BY-SA 4.0).
> Dutch translation: jaardle contributors, 2026.

Each individual event in `events.en.json` and `events.nl.json` includes a `source`
field pointing to the Wikipedia year-page it was extracted from.

## ShareAlike

If you remix, transform, or build upon the dataset, you must distribute your
contributions under the same CC BY-SA 4.0 license.

## Modifications

The Dutch dataset (`events.nl.json`) is a translation; entries have been:
- Translated from English to Dutch using LLMs (Gemini 2.5 Flash; Claude Sonnet 4.6 / Haiku 4.5)
- Spoiler-cleaned (year mentions within ±2 of the puzzle-year replaced with `____`) — see `tools/clean_spoilers.py`

For full license text, see <https://creativecommons.org/licenses/by-sa/4.0/legalcode>.
