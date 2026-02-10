# Ecommify Campaign Calculator - PRD

## Original Problem Statement
Business dashboard "Ecommify Campaign Calculator" for managing e-commerce stores (Shopify). Everything in Polish, PLN currency, 23% VAT.

## What's Been Implemented

### Completed (Feb 2026)
- **Authentication**: PIN-based login (3 users), returns shops + settings
- **Dashboard**: Game-style menu with weekly stats, reminders, rank display
- **Results (Wyniki)**: Stats, CS:GO ranks, dynamic target, profit/person, entries, Excel export
- **Orders (Zamowienia)**: 4 tabs:
  - **Zamowienia**: Full orders with customer info, add/delete, status tracking
  - **Ewidencja sprzedazy**: Auto from orders + manual, daily/monthly PDF, grouped by date
  - **Zwroty**: Mark orders as returned with reason, refund tracking, restores status on delete
  - **Realizacja zamowien**: Presale pipeline:
    - Oczekujace → Przypomnienie wyslane (15th of month reminder) → Do sprawdzenia (auto after 7 days) → Do wysylki (if paid) / Nieoplacone → Archiwum
    - Extra payment (doplata) separate from order amount
    - Bulk reminder marking, per-item payment confirmation
- **Calendar (Kalendarz)**: Full month calendar, recurring reminders, notes
- **Dynamic Shops**: Add/edit/delete, auto-detected everywhere
- **Stores (Sklepy)**: Shop management, Shopify config per shop, TikTok Ads
- **Settings (Ustawienia)**: Target revenue, profit split, VAT rate, currency, company data
- **AI Chat**: GPT-5.2 via Emergent LLM key
- **Data**: MongoDB persistent storage

### Architecture
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2, Excel: openpyxl
- LLM: OpenAI GPT-5.2 via emergentintegrations

## Prioritized Backlog
### P1
- Real Shopify API integration (needs user API keys)
- Automated payment reminders via Shopify (user mentioned future automation)
### P2
- TikTok API integration
- Enhanced game-like effects
### P3
- PWA, data export enhancements

## MOCKED: Shopify sync, TikTok sync (need API keys)
