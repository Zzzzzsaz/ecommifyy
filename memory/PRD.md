# Ecommify Campaign Calculator - PRD

## Original Problem Statement
Business dashboard "Ecommify Campaign Calculator" for managing e-commerce stores (Shopify). Everything in Polish, PLN currency, 23% VAT.

## What's Been Implemented

### Completed (Feb 2026)
- **Authentication**: PIN-based login (3 users), returns shops + settings
- **Dashboard**: Game-style menu with weekly stats, reminders, rank display
- **Results (Wyniki)**: Aggregated/per-store stats, CS:GO ranks, dynamic target, profit/person (dynamic split), add/delete entries, notes, Excel export
- **Orders (Zamowienia)**: Full orders with detailed info + Ewidencja sprzedazy tab
- **Ewidencja sprzedazy**: Auto from orders + manual, daily/monthly PDF, grouped by date
- **Calendar (Kalendarz)**: Full month calendar, reminders (recurring: daily/weekly/monthly), notes
- **Dynamic Shops**: Add/edit/delete shops from Stores page, auto-detected everywhere
- **Stores (Sklepy)**: Shop management with color picker (12 colors), Shopify config per shop, TikTok Ads config
- **Settings (Ustawienia)**: 
  - App settings: target revenue, profit split, VAT rate, currency, app name
  - Company data: name, NIP, address, postal code, city, bank, account, email, phone
  - Account overview
- **AI Chat**: GPT-5.2 via Emergent LLM key
- **Data**: MongoDB persistent storage

### Removed Features
- Receipts (paragony) → replaced by Ewidencja sprzedazy
- Margin calculator → removed per user request
- Hardcoded shops → replaced by dynamic MongoDB-based shops

### Architecture
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2, Excel: openpyxl
- LLM: OpenAI GPT-5.2 via emergentintegrations

## Prioritized Backlog
### P1
- Real Shopify API integration (needs user API keys)
- Sales report for accountant (enhanced PDF/CSV)
### P2
- TikTok API integration (needs API keys)
- Enhanced game-like effects
- PIN notification fix
### P3
- PWA, data export enhancements

## MOCKED: Shopify sync, TikTok sync (need API keys)
