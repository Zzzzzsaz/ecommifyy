# Ecommify Campaign Calculator - PRD

## Original Problem Statement
Business dashboard "Ecommify Campaign Calculator" for managing e-commerce stores (Shopify). Features include:
- PIN-based authentication (3 users)
- Game-style UI menu dashboard
- Financial results tracking with CS:GO ranks
- Orders management with Shopify integration
- Receipt (paragon) generation matching Polish format with 23% VAT
- Company settings for receipt data
- Tasks, reminders, chat with AI
- Everything in Polish, PLN currency

## Core Requirements
- Polish language throughout
- PLN currency, 23% VAT
- 4 shops (ecom1-4)
- PIN login: 2409 (Admin), 2609 (Kacper), 2509 (Szymon)
- Dark, game-like UI theme

## What's Been Implemented

### Completed (Feb 2026)
- **Authentication**: PIN-based login with numpad, 3 hardcoded users
- **Dashboard**: Game-style menu with weekly stats, reminders
- **Results (Wyniki)**: Aggregated/per-store stats, CS:GO ranks, 250k PLN goal, profit/person, add/delete entries, notes, Excel export
- **Orders & Receipts (Zamowienia)**: 
  - Full orders page with detailed info (customer, email, phone, address, shipping, payment)
  - Receipt status badges (green "Paragon" / yellow "Brak paragonu") per order
  - Generate receipt from individual order
  - Bulk generate receipts for all orders without receipt
  - Polish paragon-style PDF receipts (company header, items, VAT 23%, payment info)
  - Improved summary PDF (zestawienie) with landscape layout, item descriptions, totals
  - Manual order and receipt creation
  - Shop filtering and month navigation
- **Company Settings**: Save company data (name, NIP, address, bank) used in receipts
- **Tasks**: CRUD with assignments
- **AI Chat**: GPT-5.2 integration via Emergent LLM key
- **Store configs**: Shopify and TikTok configuration management
- **Data**: MongoDB persistent storage

### Architecture
- Backend: FastAPI + MongoDB (Motor async driver)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2 for receipt and summary generation
- LLM: OpenAI GPT-5.2 via emergentintegrations

## Prioritized Backlog

### P1 - Next Tasks
- **Margin Calculator (Kalkulator marzy)**: New tool/page for margin calculations
- **Real Shopify API integration**: Replace mocked sync with actual Shopify API (needs user API keys)
- **Sales report for accountant**: Enhanced report generation as PDF/CSV

### P2 - Future Tasks
- **TikTok API integration**: Real ad spend sync (needs API keys)
- **Enhanced game-like effects**: More animations, interactive elements
- **PIN notification fix**: "Invalid PIN" message disappears too quickly

### P3 - Nice to Have
- PWA support improvements
- Data export enhancements
- Multi-language support

## MOCKED Integrations
- Shopify order sync (needs API keys from user)
- TikTok ad spend sync (needs API keys from user)
