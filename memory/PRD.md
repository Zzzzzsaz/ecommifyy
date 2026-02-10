# Ecommify Campaign Calculator - PRD

## Problem Statement
Web application for e-commerce profitability tracking with Shopify revenue, TikTok Ads costs, profit calculations, Kanban tasks, and AI marketing expert chat. Originally a mobile app, converted to responsive web app. All in Polish, PLN currency.

## Architecture
- **Frontend**: React (CRA + Craco) + Tailwind CSS + shadcn/ui + framer-motion
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

## Users
| User | PIN | Role |
|------|-----|------|
| Admin | 2409 | admin |
| Kacper | 2609 | kacper |
| Szymon | 2509 | szymon |

## Core Requirements
1. PIN-based authentication (3 users)
2. Dashboard with 4 shop tabs, monthly stats, daily income/expense tracking
3. Kanban task board (todo/in_progress/done) with team assignment
4. Shopify + TikTok Ads configuration and sync
5. AI Marketing Expert chat (GPT-5.2)
6. PWA support
7. Browser notifications for task changes
8. Dark theme (#0f0f1a background)

## What's Been Implemented (Feb 2026)
- [x] Full backend with 20+ API endpoints
- [x] PIN login with 3 users
- [x] Dashboard with shop tabs, month nav, KPI cards, daily list
- [x] Add income/expense dialogs
- [x] Kanban task board with add/move/delete
- [x] Shopify configuration forms (4 shops)
- [x] TikTok Ads config with shop linking
- [x] Sync endpoints (Shopify + TikTok API)
- [x] AI Marketing Expert chat with GPT-5.2
- [x] Settings page with PWA install instructions
- [x] Bottom navigation (5 tabs)
- [x] PWA manifest
- [x] Browser notifications for tasks

## Test Results
- Backend: 100% pass rate
- Frontend: 95% pass rate
- All core flows working

## Prioritized Backlog
### P0 (Must Have)
- All implemented

### P1 (Should Have)
- Data export (CSV/PDF reports)
- Monthly comparison charts (recharts)
- Task due date reminders
- Polish diacritical characters in UI text

### P2 (Nice to Have)
- Multi-language support
- Dark/Light theme toggle
- Advanced analytics dashboard
- Team performance metrics
- Automated daily sync scheduling
