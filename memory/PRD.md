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
  - **Realizacja zamowien**: Presale pipeline with automatic extra_payment from products
- **Calendar (Kalendarz)**: Full month calendar, recurring reminders, notes
- **Dynamic Shops**: Add/edit/delete, auto-detected everywhere
- **Stores (Sklepy)**: Shop management, Shopify config per shop, TikTok Ads
- **Settings (Ustawienia)**: Target revenue, profit split, VAT rate, currency, company data
- **AI Chat**: GPT-5.2 via Emergent LLM key
- **Data**: MongoDB persistent storage
- **UI Cleanup**: Removed "Made with Emergent" badge

### Architecture
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + TailwindCSS + Shadcn/UI
- PDF: fpdf2, Excel: openpyxl
- LLM: OpenAI GPT-5.2 via emergentintegrations

## Key Features

### Products & Doplata
- Products have: id, name, sku, price, extra_payment, shop_id, category, description
- When order is created, system matches items by name with products table
- Total extra_payment = SUM(product.extra_payment * item.quantity)
- Stored in fulfillment.extra_payment for presale pipeline

### Auto Sales Records (Ewidencja)
- When order is created, sales records are automatically generated from order items
- Each item creates separate entry with: date, order_number, product_name, quantity, netto, brutto, VAT
- Deleting order also removes related sales records

### Returns Undo
- "Cofnij" button on returns restores order status to "new"
- Order returns to main orders list after undo

## Prioritized Backlog
### P0 (Done)
- Products & Dynamic Top-ups feature - COMPLETED
- Auto Sales Records from Orders - COMPLETED  
- Returns Undo functionality - COMPLETED

### P1
- Shopify Product Sync (endpoint + UI button to sync products from store)
- Real Shopify Order API integration (needs user API keys)
- Automated payment reminders via Shopify

### P2
- TikTok API integration
- Enhanced game-like effects

### P3
- PWA, data export enhancements

## MOCKED: Shopify sync, TikTok sync (need API keys)

## Test Credentials
- Admin: PIN 2409
- Kacper: PIN 2609
- Szymon: PIN 2509
