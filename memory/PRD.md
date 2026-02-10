# Ecommify Campaign Calculator - PRD

## Architecture
- Frontend: React + Tailwind + shadcn/ui + framer-motion + recharts
- Backend: FastAPI + Motor (async MongoDB)
- AI: OpenAI GPT-5.2 via Emergent LLM Key (emergentintegrations)

## Users
| User | PIN | Role |
|------|-----|------|
| Admin | 2409 | admin |
| Kacper | 2609 | kacper |
| Szymon | 2509 | szymon |

## Implemented (Feb 2026 - v2)
- [x] PIN login
- [x] **GAME MENU** - CS:GO ranks (Silver I → Global Elite), 250k target bar, today's combined stats, streak, forecast, best day, profit per person (÷2)
- [x] **WYNIKI** - "WSZYSTKIE" combined tab + per-shop tabs, expandable per-shop daily breakdown with +P/+A buttons, sparkline, KPIs with "Na łeb", daily target
- [x] Kanban tasks (todo/in_progress/done), browser notifications
- [x] Shopify + TikTok Ads config + sync
- [x] AI Marketing Expert (GPT-5.2)
- [x] Confetti + rank-up animations
- [x] PWA manifest, dark theme, responsive

## CS:GO Ranks (based on monthly revenue)
Silver I-IV (0-25k), Gold Nova I-IV (25-85k), MG I-II + MGE (85-150k), DMG (150-175k), LE/LEM (175-215k), Supreme (215-235k), Global Elite (235k+)

## Test Results
- Backend: 100% (19/19)
- Frontend: 98%

## Backlog
### P1
- Monthly comparison charts
- Data export CSV/PDF
- Polish diacritical characters
- Achievement system (milestones)
### P2
- Automated sync scheduling
- Team performance dashboard
