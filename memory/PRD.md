# Ecommify - Professional E-Commerce Dashboard PRD

## Original Problem Statement
Business dashboard "Ecommify" for managing e-commerce stores (Shopify). Polish language, PLN currency, 23% VAT.

## Current Version: 2.0 (Feb 23, 2026)

### Complete UI Redesign
- **Light theme** with slate-50 (#f8fafc) background
- **Fixed sidebar** (240px) with hamburger menu on mobile
- **Professional branding**: "Panel Ecommify" throughout
- Removed all gaming elements (ranks, confetti, neon colors)

### Layout Features
- **Desktop (768px+)**: Fixed sidebar left, main content with margin-left
- **Mobile (<768px)**: Top header with hamburger, slide-in sidebar overlay
- Responsive KPI cards (2 cols mobile, 4 cols desktop)
- Tables on desktop, cards on mobile for Wyniki

### Pages
1. **Login** - PIN pad with dots indicator
2. **Panel główny (Dashboard)** - KPI, today stats, quick actions, products, reminders
3. **Wyniki** - Financial table (desktop) / cards (mobile)
4. **Zamówienia** - Orders, sales records, returns, fulfillment
5. **Zadania** - Task list with priorities and assignments
6. **Pomysły** - Ideas grid with categories
7. **Kalendarz** - Calendar with reminders
8. **Sklepy** - Shop management
9. **Ustawienia** - Settings

### Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Python
- **Database**: MongoDB Atlas
- **Deployment**: Railway.app

### API Endpoints
- `/api/auth/login` - POST
- `/api/monthly-stats`, `/api/combined-monthly-stats` - GET
- `/api/costs`, `/api/incomes` - CRUD
- `/api/ideas` - CRUD
- `/api/tasks` - CRUD
- `/api/products` - CRUD
- `/api/reminders` - CRUD
- `/api/sync/all` - POST

## Backlog

### P1 (Next)
- Shopify Product Sync (real API)
- Real-time order sync

### P2 (Future)
- TikTok API integration
- Re-enable AI Assistant
- Automated payment reminders

## Test Credentials
- Admin: PIN 2409
- Kacper: PIN 2609
- Szymon: PIN 2509
