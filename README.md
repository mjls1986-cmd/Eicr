# ⚡ CertAI

AI-powered electrical certification for UK electricians. Upload a photo of your consumer unit or paste your handwritten notes — get a BS 7671 compliant EICR in minutes, not hours.

## What it does

1. **Upload** — Snap a photo of the board or type your inspection notes
2. **AI Extract** — Claude Vision reads the image and extracts circuit data, supply details, and observations
3. **Review** — Pre-filled EICR form for you to check and edit
4. **Download** — Generate a compliant PDF certificate

## Why

Electricians spend 45-60 minutes manually typing inspection data into certification software after every job. CertAI cuts that to under 5 minutes.

## Tech Stack

- **Next.js 14** — React framework
- **Tailwind CSS** — Styling
- **Claude API** (Anthropic) — AI-powered board analysis & note parsing
- **React PDF** — Certificate generation
- **TypeScript** — Type safety throughout

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/AnasInno/certai.git
cd certai
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Roadmap

- [x] Board photo upload + AI extraction
- [x] EICR form with pre-filled fields
- [x] PDF certificate generation
- [ ] BS 7671 validation engine (Zs limits, IR, RCD checks)
- [ ] Text/handwritten notes parsing
- [ ] EIC & Minor Works certificates
- [ ] User auth + certificate storage
- [ ] Multi-user collaboration
- [ ] Supabase backend

## Cost

~5p per certificate (one Claude API call). No subscription required to self-host.

## License

MIT

## Built by

[Anas Abdi](https://github.com/AnasInno) — with help from [OpenClaw](https://openclaw.ai)
