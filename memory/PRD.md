# Ecommify Campaign Calculator - PRD

## Original Problem Statement
Business dashboard "Ecommify Campaign Calculator" for managing e-commerce stores (Shopify). Features include:
- PIN-based authentication (3 users)
- Game-style UI menu dashboard
- Financial results tracking with CS:GO ranks
- Orders management with Shopify integration
- Sales ledger (Ewidencja sprzedazy) with daily/monthly PDF export
- Calendar with reminders (recurring) and notes
- Company settings for business data
- Tasks, AI chat (GPT-5.2)
- Everything in Polish, PLN currency, 23% VAT

## Core Requirements
- Polish language throughout
- PLN currency, 23% VAT
- 4 shops (ecom1-4)
- PIN login: 2409 (Admin), 2609 (Kacper), 2509 (Szymon)
- Dark, game-like UI theme

## What's Been Implemented

### Completed (Feb 2026)
- **Authentication**: PIN-based login with numpad, 3 hardcoded users
- **Dashboard**: Game-style menu with weekly stats, reminders, rank display
- **Results (Wyniki)**: Aggregated/per-store stats, CS:GO ranks, 250k PLN goal, profit/person, add/delete entries, notes, Excel export
- **Orders (Zamowienia)**: Full orders page with detailed info (customer, email, phone, address, shipping, payment), add/delete/view detail
- **Ewidencja sprzedazy (Sales Ledger)**:
  - Auto-generate from orders (Z zamowien button)
  - Manual entries
  - Fields: date, order number, product name, quantity, netto, VAT 23%, brutto, payment method, shop
  - Records grouped by date with daily totals
  - Daily PDF download per date
  - Monthly PDF download
  - Summary cards (Brutto, VAT, Netto)
- **Calendar (Kalendarz)**:
  - Full month calendar grid with Polish day names
  - Reminders with recurring frequency (jednorazowe, codziennie, co tydzien, co miesiac)
  - Time support for reminders
  - Indicator dots on calendar days (blue=reminder, yellow=note, red=overdue)
  - Notes section below calendar
  - Overdue reminders section
- **Company Settings**: Save company data (name, NIP, address, bank) used in PDFs
- **Tasks (Zadania)**: Kanban board (accessible via Dashboard menu)
- **AI Chat**: GPT-5.2 integration via Emergent LLM key
- **Store configs**: Shopify and TikTok configuration management
- **Data**: MongoDB persistent storage

### Removed Features
- Receipts (paragony) - replaced by Ewidencja sprzedazy
- Margin calculator - removed per user request

### Architecture
- Backend: FastAPI + MongoDB (Motor async driver)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2 for sales ledger PDF generation
- LLM: OpenAI GPT-5.2 via emergentintegrations

## Prioritized Backlog

### P1 - Next Tasks
- **Real Shopify API integration**: Replace mocked sync with actual Shopify API (needs user API keys)
- **Sales report for accountant**: Enhanced report generation as PDF/CSV

### P2 - Future Tasks
- **TikTok API integration**: Real ad spend sync (needs API keys)
- **Enhanced game-like effects**: More animations, interactive elements
- **PIN notification fix**: "Invalid PIN" message disappears too quickly

### P3 - Nice to Have
- PWA support
- Data export enhancements

## MOCKED Integrations
- Shopify order sync (needs API keys from user)
- TikTok ad spend sync (needs API keys from user)
