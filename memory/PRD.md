# Ecommify Campaign Calculator - PRD

## Original Problem Statement
Business dashboard "Ecommify Campaign Calculator" for managing e-commerce stores (Shopify). Everything in Polish, PLN currency, 23% VAT.

## What's Been Implemented

### Completed (Dec 2025)
- **Authentication**: PIN-based login (3 users: Admin/2409, Kacper/2609, Szymon/2509)
- **Dashboard**: Game-style menu with weekly stats, reminders, rank display, **PRODUCTS section**
- **Products Management**: Full CRUD in Dashboard with:
  - Name, SKU, Price, Extra Payment (doplata), Shop, Category
  - Automatic extra_payment calculation when creating orders
  - Cyan-colored highlight for doplata field
- **Results (Wyniki)**: Stats, CS:GO ranks, dynamic target, profit/person, entries, Excel export
- **Orders (Zamowienia)**: 4 tabs:
  - **Zamowienia**: Full orders with customer info, add/delete, status tracking
  - **Ewidencja sprzedazy**: **AUTO-CREATED** from orders + manual, daily/monthly PDF
  - **Zwroty**: Mark orders as returned, **"Cofnij" button restores order to list**
  - **Realizacja zamowien**: Presale pipeline with automatic extra_payment, **DELETE button on each stage**
- **Calendar (Kalendarz)**: Full month calendar, recurring reminders, notes
- **Dynamic Shops**: Add/edit/delete, auto-detected everywhere
- **Stores (Sklepy)**: Shop management, Shopify config per shop, TikTok Ads
- **Settings (Ustawienia)**: Target revenue, profit split, VAT rate, currency, company data
- **AI Assistant (Floating Bubble)**: 
  - Replaced old AI Expert tab with floating purple bubble
  - Can execute actions: view/delete orders, products, returns, fulfillment, reminders
  - Can create products and reminders
  - Shows action badges for executed operations
- **Data**: MongoDB persistent storage
- **UI Cleanup**: Removed "Made with Emergent" badge, removed AI from bottom nav

### Completed (Feb 2026) - Customizable Financial Results
- **Kategoryzowane koszty API** (`/api/costs`):
  - CRUD dla kosztów: TikTok, Meta, Google, Zwroty + własne kategorie
  - "Koszty reklam" = suma TikTok + Meta + Google (usunięto stare "Ads")
- **Własne kolumny API** (`/api/custom-columns`):
  - Dodawanie/usuwanie własnych kolumn (typ: przychód lub koszt)
  - Własne kolory dla kolumn
  - Usunięcie kolumny usuwa też powiązane dane
- **Odświeżona strona Wyniki**:
  - Nowoczesny, czytelny design z gradientowym tłem
  - KPI karty: Przychód brutto, Koszty reklam (suma), Zysk, Na łeb
  - "Na łeb" widoczne w obu widokach (wszystkie sklepy + pojedynczy sklep)
  - Kolorowe pigułki z ikonami dla każdej kategorii kosztu (TikTok🎵, Meta📘, Google🔍, Zwroty↩️)
  - Kliknięcie na pigułkę otwiera dialog dodawania kosztu
  - Własne kolumny pojawiają się dynamicznie jako pigułki
  - Dialog zarządzania kolumnami z listą istniejących i przyciskiem usuwania

### Architecture
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2, Excel: openpyxl
- LLM: OpenAI GPT-4o via emergentintegrations

## Key Features

### AI Assistant Actions
Available commands:
- get_orders, get_products, get_returns, get_fulfillment, get_shops, get_reminders
- delete_product, delete_order, delete_return, delete_fulfillment, delete_reminder
- create_product (name:price:extra:shop_id), create_reminder (title:date)
- update_fulfillment (id:status)

### Products & Doplata
- Products have: id, name, sku, price, extra_payment, shop_id, category
- When order is created, system matches items by name with products table
- Total extra_payment = SUM(product.extra_payment * item.quantity)
- Stored in fulfillment.extra_payment for presale pipeline

### Auto Sales Records (Ewidencja)
- When order is created, sales records are automatically generated from order items
- Deleting order also removes related sales records

### Returns Undo & Fulfillment Delete
- "Cofnij" button on returns restores order status to "new"
- Delete button on each fulfillment stage removes from pipeline

### Categorized Costs System
- Categories: tiktok, meta, google, zwroty, inne, user-defined
- Daily cost breakdown in Wyniki page
- Hover to reveal + button for quick cost entry
- Custom columns with income/expense types and custom colors

## Prioritized Backlog

### P0 (Done)
- Products & Dynamic Top-ups - COMPLETED
- Auto Sales Records from Orders - COMPLETED  
- Returns Undo functionality - COMPLETED
- Delete from Fulfillment - COMPLETED
- AI Assistant with Actions - COMPLETED
- **Customizable Financial Results - COMPLETED**

### P1
- Shopify Product Sync (endpoint + UI button)
- Real Shopify Order API integration

### P2
- TikTok API integration
- Expand AI Assistant with more actions

## MOCKED: Shopify sync, TikTok sync (need API keys)

## Test Credentials
- Admin: PIN 2409
- Kacper: PIN 2609
- Szymon: PIN 2509

## API Endpoints Reference

### Costs API
- `GET /api/costs` - List costs (params: shop_id, date, year, month, category)
- `POST /api/costs` - Create cost (body: date, shop_id, category, amount, description)
- `PUT /api/costs/{id}` - Update cost (body: amount, description)
- `DELETE /api/costs/{id}` - Delete cost

### Custom Columns API
- `GET /api/custom-columns` - List user-defined columns
- `POST /api/custom-columns` - Create column (body: name, column_type: income|expense, color)
- `PUT /api/custom-columns/{id}` - Update column
- `DELETE /api/custom-columns/{id}` - Delete column (also removes associated costs)

### Stats Endpoints (Updated)
- `GET /api/monthly-stats` - Single shop stats with categorized costs
- `GET /api/combined-monthly-stats` - All shops combined stats
