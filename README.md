# NeuroTriage

NeuroTriage is a mental health screening and self-help companion app (Hindi/Hinglish and English). It includes ADHD tests, a MindCheck Hub with 59+ screening checks, CBT and focus tools, working-memory games, Learning Reels, an XP/Rewards system, and Amisha, an AI companion.

> It is a screening and educational tool. It is **not** a medical device and does not give a diagnosis.

## Project structure

```
index.html            The whole app (single file: HTML, CSS and JS)
privacy-policy.html   Public Privacy Policy, Terms, Refund and Data Deletion page
.nojekyll             Tells GitHub Pages to serve files as they are
.github/workflows/    Auto-deploy to GitHub Pages on every push to main
docs/PLAY_STORE.md    Play Store checklist
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Publish on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. Go to **Settings > Pages > Source** and choose **GitHub Actions**.
3. After the workflow runs, the app is live at `https://<username>.github.io/<repo>/` and the policy page at `.../privacy-policy.html`.

## Configuration

- Amisha AI (voice/chat) reads its settings from `window.NT_AI` (`tokenUrl`, `endpoint`, models). Never commit API keys into this repo; use a server-side token endpoint.
- Firebase (login, cloud sync, account deletion) is configured inside `index.html`. Keep your Firebase security rules strict.
- Service worker: the app tries to register `sw.js` if it exists. It is not included, so the app works online without it.

## Policies

See [`privacy-policy.html`](privacy-policy.html) and the in-app Privacy screen: privacy, terms, **no-refund** policy and account/data deletion.

## Contact

Prashant Suryawanshi, drpsuryawanshidm@gmail.com

## License

No license is set yet. Add a `LICENSE` file of your choice before making the repo public.
