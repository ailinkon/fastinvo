# FastInvo

**Fast, private, offline-first invoice builder.** Create professional invoices in seconds — your data never leaves your device.

> 🚧 Android app release in progress. Web version available now — run it locally in two commands (see below).

<!-- Add 2-3 screenshots here once the UI is final:
![Invoice editor](docs/screenshots/editor.png)
![Invoice preview](docs/screenshots/preview.png)
-->

## Why FastInvo

Most invoice tools want an account, a subscription, and your client list on their servers. FastInvo takes the opposite approach: everything runs in your browser, everything is stored locally, and generating a polished PDF invoice takes less than a minute.

## Features

**Invoicing**
- Clean, minimalist invoice editor with live totals
- Auto-adding line-item rows — just keep typing, rows appear as needed
- Multiple professional invoice templates
- One-click PDF export (A4, print-ready)
- Invoice status tracking (Paid / Due)

**Flexible tax handling** — the feature most simple invoice tools get wrong
- **Tax-inclusive mode**: enter prices that already contain tax; FastInvo extracts and displays the correct tax breakdown
- **Tax-exclusive mode**: enter net prices; tax is added on top
- Custom tax name (GST, VAT, etc.) and rate; or disable tax entirely
- Discounts as a percentage or fixed amount, with the breakdown always reconciling to the cent

**Business profile**
- Your logo, business details, and tax registration number on every invoice
- Multi-currency support (USD, EUR, GBP, AUD, BDT, INR, JPY, and more)
- Auto-incrementing invoice numbers with a custom prefix
- Saved clients for repeat billing
- Payment method details on the invoice — bank transfer, card, cash, and mobile financial services (bKash-style MFS support built in)

**Private by design**
- No account, no sign-up, no server
- All data persists in your browser's local storage
- Works offline

## Run locally

Prerequisites: [Node.js](https://nodejs.org) 18+

```bash
git clone https://github.com/ailinkon/fastinvo.git
cd fastinvo
npm install
npm run dev
```

Open the printed localhost URL. `npm run build` produces a production bundle in `dist/`.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · jsPDF + html2canvas (PDF generation) · lucide-react (icons) · Motion (animations)

No backend. No external API calls. ~100% client-side TypeScript.

## Project structure

```
src/
  components/
    InvoiceEditorView.tsx    # invoice builder with live totals
    InvoicePreviewView.tsx   # customer-facing render + PDF export
    SettingsView.tsx         # business profile & tax configuration
  utils/
    calculations.ts          # single source of truth for all invoice math
  types.ts                   # shared type definitions
  constants.ts               # defaults, currencies, formatters
```

## Roadmap

- [ ] Android release (Google Play)
- [ ] Invoice history / archive
- [ ] More templates

## Author

**Ashraful Islam** — [GitHub](https://github.com/ailinkon) · [LinkedIn](https://www.linkedin.com/in/linkon)

Second app from AIL Apps, after [Shohoj Hishab](https://github.com/ailinkon/shohojhishab-app) (live on Google Play).

## Sample

<img width="464" height="445" alt="FastInvo editor" src="https://github.com/user-attachments/assets/873da421-0657-44c7-a6b0-be6f4b196455" />

<img width="417" height="372" alt="Record payment" src="https://github.com/user-attachments/assets/c70ad6ef-f69b-4cf0-ae52-dd60a6e61790" />

<img width="467" height="327" alt="Payment options" src="https://github.com/user-attachments/assets/daf1b519-9a22-4adb-a82a-c59142d013cb" />

<img width="275" height="413" alt="Split payment" src="https://github.com/user-attachments/assets/81d3a94b-5067-44e0-a67c-392bac0f8585" />

<img width="418" height="301" alt="Invoice preview" src="https://github.com/user-attachments/assets/239edd83-68e3-4b0f-b3c9-0b0aef4dc44a" />

## License

All rights reserved. This code is public for portfolio and transparency purposes; please don't redistribute or republish it as your own product.
