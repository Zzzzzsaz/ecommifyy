# Ecommify - Professional E-Commerce Dashboard PRD

## Original Problem Statement
Business dashboard "Ecommify" for managing e-commerce stores (Shopify). Polish language, PLN currency, 23% VAT.

## What's Been Implemented

### Version 2.0 - Complete Redesign (Feb 23, 2026)

**🎨 New Professional Light Theme:**
- Switched from dark gaming theme to professional white/light design
- Removed all gaming elements (CS:GO ranks, confetti effects, game-style UI)
- Clean, minimalist design with slate-50 background (#f8fafc)
- Professional typography using Inter font
- Consistent card and table styling across all pages

**🧭 New Sidebar Navigation:**
- Desktop: Fixed 256px sidebar on left
- Mobile: Hamburger menu with slide-in sidebar
- Navigation items: Panel główny, Wyniki, Zamówienia, Zadania, Pomysły, Kalendarz, Sklepy, Ustawienia
- User avatar and logout at bottom

**📊 Dashboard:**
- KPI Cards: Przychód miesięczny, Zysk, Koszty reklam, Cel miesięczny
- Today stats: Przychód, Koszty, Zysk, Na osobę
- Quick actions: Wyniki, Zamówienia, Zadania, Kalendarz
- Products section with CRUD
- Reminders widget with overdue alerts
- Weekly summary

**💰 Wyniki (Financial Results):**
- Clean data table with columns: Dzień, Przychód, Netto, Koszty, Zysk, Na osobę, Akcje
- KPI summary cards at top
- Month navigation
- Shop selector dropdown
- Sync, Settings, and Export buttons
- Add income/cost buttons per day
- Details dialog for viewing/editing entries

**💡 Pomysły (Ideas):**
- Grid layout for idea cards
- Category filters: Wszystkie, Ważne, Produkt, Marketing, Sklep, Inne
- Priority star marking
- CRUD with dialog forms
- Link support with external link indicator

**✅ Zadania (Tasks):**
- List view with checkbox toggles
- Priority badges (Wysoki, Średni, Niski)
- Assignee (Kacper, Szymon, Oboje)
- Due date with overdue indication
- Status filter (Wszystkie, Aktywne, Ukończone)

### Previous Features (Still Working)
- **Authentication**: PIN-based login (Admin/2409, Kacper/2609, Szymon/2509)
- **Orders (Zamówienia)**: 4 tabs - Orders, Sales records, Returns, Fulfillment
- **Calendar (Kalendarz)**: Month calendar with reminders and notes
- **Stores (Sklepy)**: Shop management with Shopify/TikTok config
- **Settings (Ustawienia)**: Target revenue, profit split, VAT rate, company data
- **Products**: Full CRUD with extra payment (dopłata) for presale

### Removed Features
- ❌ AI Assistant (disabled for deployment simplification)
- ❌ CS:GO-style ranks
- ❌ Gaming UI elements (confetti, neon colors, etc.)
- ❌ Bottom navigation (replaced by sidebar)

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI, Python
- **Database**: MongoDB Atlas (external persistent)
- **Deployment**: Railway.app

## API Endpoints
- `/api/auth/login` - POST
- `/api/monthly-stats`, `/api/combined-monthly-stats` - GET
- `/api/costs`, `/api/incomes` - CRUD
- `/api/ideas` - CRUD
- `/api/tasks` - CRUD
- `/api/products` - CRUD
- `/api/reminders` - CRUD
- `/api/custom-columns` - CRUD
- `/api/sync/all` - POST

## Backlog

### P1 (Next)
- Shopify Product Sync (real API integration)
- Real-time Shopify order sync

### P2 (Future)
- TikTok API integration
- Re-enable AI Assistant (optional)
- Automated payment reminders
- Backend refactoring (split server.py into modules)

## Test Credentials
- Admin: PIN 2409
- Kacper: PIN 2609
- Szymon: PIN 2509
