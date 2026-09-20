# Project page: Generalizing Manipulation Skills with a Local Coding Agent

Static site (no build step at serve time). Everything in this folder is what GitHub Pages serves.

## Deploy to GitHub Pages

1. Create a repository (e.g. `airo-ugent/local-coding-agent` or `<user>/<user>.github.io`).
2. Copy the *contents* of this `website/` folder to the repository root (or to a `docs/` folder, or a `gh-pages` branch).
3. Settings → Pages → Source: "Deploy from a branch", pick the branch/folder.
4. Keep `.nojekyll` (already present) so folders and files starting with `_` are served.

Nothing here exceeds GitHub's 100 MB per-file limit; the whole folder is about 6 MB; the submission video is embedded from YouTube.

## Before publishing, review

- `index.html` hero: authors link to airo.ugent.be. Replace with personal pages if wanted.
- `assets/paper.pdf` is the *anonymised* submission PDF ("Anonymous authors"). Swap in the camera-ready when available.
- Eyebrow text says "Submitted to ICRA 2027". Update on acceptance. BibTeX block in the Paper section likewise.
- The MEGA supplementary link is the one from the paper footnote.
- Logos and palette come from the lab's zip and colour sheet, kept outside the site in `../website-sources/brand/`; see `assets/logos/SOURCES.md`.
- The site publishes verbatim: the system prompt, the six skills, and condensed per-trial transcripts (these are declared public supplementary material in the paper). The platform/agent code is **not** included.

## Structure

```
index.html            page
style.css             design tokens (light + dark), layout
app.js                interactivity: chapters, architecture explorer, skills viewer,
                      objects figure, duration chart, results table, trial explorer,
                      transcript drawer, second-pass table, failure-mode links, logos
data/site-data.js     generated bundle (tasks, 45 trials, 17 second passes, skills, prompt, refs)
data/narratives.js    generated bundle (condensed transcripts), loaded on demand
data/trials.json      source dataset (provenance notes live outside the site, in ../website-sources/)
content/              source text (skills, prompt, narratives, example session, refs)
assets/               result grids, filmstrips per trial, task hero frames, brand logos + palette,
                      cell photos, paper PDF + first page, logos
build_data.py         regenerates data/*.js from data/ + content/ + assets/manifest.json
```

To change any trial note, skill text or number: edit `data/trials.json` or `content/*`, then run
`python3 build_data.py` from this folder.

## Local preview

```
cd website && python3 -m http.server 8765
# open http://localhost:8765/  (append ?theme=dark to force dark mode)
# Do not open index.html straight from disk: the YouTube embed needs an http(s) origin and shows error 153 from file://
```
