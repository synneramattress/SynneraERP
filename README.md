# SynneraERP

Synnera Mattress ERP — Progressive Web App (PWA)

**Version:** 2.16.36

## Stack
- Next.js 14 + React 18 + TypeScript
- Firebase
- Tailwind CSS

## Architecture
Modular PWA under `src/modules/` (orders, parties, financial, production, delivery-challan, invoicing, stock, etc.)

## Setup
```bash
npm install
cp .env.example .env.local   # fill Firebase / ImageKit keys
npm run dev
```

## Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | Lint |
| `npm run test:financial` | Financial module tests |

## Security
- Private repository
- **Never** commit `.env*` or Firebase service-account JSON files
