# Ecommify Campaign Calculator - PRD

## Problem Statement
Web app for e-commerce profitability tracking (Shopify revenue, TikTok Ads costs, profit calc). Originally mobile app, converted to responsive web. All in Polish, PLN currency.

## Architecture
- Frontend: React + Tailwind + shadcn/ui + framer-motion
- Backend: FastAPI + Motor (async MongoDB)
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Database: MongoDB

## Users
| User | PIN | Role |
|------|-----|------|
| Admin | 2409 | admin |
| Kacper | 2609 | kacper |
| Szymon | 2509 | szymon |

## Implemented Features (Feb 2026)
- [x] PIN-based login (3 users)
- [x] **GAME-LIKE MENU** - Dashboard hub with level system (REKRUT→LEGENDA), XP bar, ROI metrics, 4 nav tiles
- [x] **WYNIKI page** - Shop tabs, month nav, KPI cards, daily income/expense list
- [x] Kanban tasks (todo/in_progress/done) with browser notifications
- [x] Shopify + TikTok Ads config with sync endpoints
- [x] AI Marketing Expert chat (GPT-5.2)
- [x] Settings page with PWA instructions
- [x] Bottom nav: Menu, Wyniki, Zadania, Sklepy, AI
- [x] Dark theme, animated grid background, hover glow effects

## Navigation
- Menu (game hub) → tiles navigate to: Wyniki, Zadania, Sklepy, AI Expert
- Bottom nav: 5 tabs (Menu, Wyniki, Zadania, Sklepy, AI)
- Settings/Logout accessible from menu page

## Test Results
- Backend: 100% (18/18 endpoints)
- Frontend: 95% (all core flows working)

## Backlog
### P1
- Monthly comparison charts (recharts)
- Data export CSV/PDF
- Polish diacritical chars in UI
### P2
- Automated sync scheduling
- Team performance metrics
- Advanced analytics
