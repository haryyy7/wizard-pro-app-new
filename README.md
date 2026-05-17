<div align="center">

  <img src="https://res.cloudinary.com/dxmuistk4/image/upload/f_auto,q_auto/v1778309076/file_00000000f16071f8a390927a87aa7418_pqzhqz.png" alt="WizardPRO Logo" width="80" />

  <h1>WizardPRO</h1>

  <p><strong>Your expert analyst on the go.</strong><br/>
  A mobile-first financial intelligence platform for Indian equity traders —<br/>
  built with 100% Vanilla HTML, CSS, and JavaScript. Zero dependencies.</p>

  <a href="https://harisanker.github.io/wizardpro"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-Visit-E8571A?style=for-the-badge&logo=googlechrome&logoColor=white"/></a>
  &nbsp;
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white"/>
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img alt="No Dependencies" src="https://img.shields.io/badge/Dependencies-Zero-22D675?style=for-the-badge"/>

</div>

---

## 📱 What is WizardPRO?

WizardPRO is a **Progressive Web App (PWA)** built for Indian equity traders who want a powerful, mobile-native analytical companion without the bloat of a heavy framework.

It provides a unified experience across five core modules — all running entirely in the browser, with no backend or build step required.

---

## ✨ Features

| Module | Description |
|---|---|
| 🌐 **Community** | Twitter/X-style social feed for traders — post trades, analysis, and market views. Supports likes, reposts, comments, and bookmarks. |
| 🔍 **Research (Fundamental)** | Market overview with live-updating index prices, sector heatmap, key pivot levels, daily pre-market report, and deep stock analysis via the **Morty** engine. |
| ⚡ **TradeLab** | Full paper-trading lab — multi-watchlist, virtual positions, order book, P&L tracker, and a professional position-sizing calculator for Indian Futures, Cash Equity, Options, and Forex. |
| 📰 **News** | Real-time financial news feed with category filters (India, Global, Corporate, Macro). |
| 🔐 **Auth** | Email + password authentication with localStorage persistence. |

### Additional highlights
- 🌗 **Light / Dark theme** — auto-applied, persisted across sessions
- 📲 **PWA-ready** — installable on iOS and Android home screens
- 🖨️ **Print-to-PDF** — export the Daily Report as a multi-page PDF
- 🔔 **Toast notifications**, animated bottom nav pill, segmented controls
- ♿ **Semantic HTML** — screen-reader friendly, proper heading hierarchy

---

## 🗂️ Project Structure

```
wizardpro/
├── index.html          # App shell — all HTML markup
├── css/
│   └── style.css       # Design tokens, components, and all layout styles
├── js/
│   └── app.js          # All interactive logic, data, and rendering
└── README.md
```

> **Architecture note:** This project uses the **Classical Modular Approach** — Separation of Concerns without a build tool. Open `index.html` directly in any browser and the app runs instantly.

---

## 🚀 Getting Started

No npm, no bundler, no server needed.

```bash
# 1. Clone the repo
git clone https://github.com/harisanker/wizardpro.git

# 2. Open the app
open index.html
```

Or simply drag `index.html` into your browser.

**Optional — local dev server (for live-reload):**
```bash
# Using Python
python3 -m http.server 3000

# Using Node
npx serve .
```

Then open `http://localhost:3000`.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Structure | Semantic HTML5 |
| Styling | Vanilla CSS3 — CSS custom properties (design tokens), `backdrop-filter`, `clamp()`, CSS animations |
| Logic | Vanilla ES6+ JavaScript — no jQuery, no React, no Vue |
| Fonts | Google Fonts — Sora, DM Mono, Playfair Display, DM Sans, Archivo Black |
| Images | Cloudinary CDN |
| Data | Demo data + Yahoo Finance / NSE India / Finnhub API stubs |

---

## 📸 Screenshots

<img width="2860" height="8880" alt="image" src="https://github.com/user-attachments/assets/26f87c6d-958a-4a97-87d4-e57fc736923a" />


---

## 🗺️ Roadmap

- [ ] Live market data via WebSocket (NSE / Finnhub)
- [ ] Firebase authentication backend
- [ ] Push notifications for alerts
- [ ] Chart.js / Lightweight-Charts integration
- [ ] Dark mode toggle in UI

---

## 📄 License

MIT © 2026 [OpenFi Ltd](https://openfi.in)

---

<div align="center">
  <sub>Built with ❤️ for Indian traders &nbsp;·&nbsp; <a href="https://github.com/harisanker">@harisanker</a></sub>
</div>
