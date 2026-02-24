# Ecommify - Panel E-Commerce Dashboard

## Wersja 2.2 (Feb 24, 2026)

## Original Problem Statement
Kompleksowy, profesjonalny dashboard do zarządzania biznesem e-commerce z:
- Ewidencją sprzedaży i realizacją zamówień
- Zarządzaniem produktami i dopłatami
- Dynamicznym zarządzaniem sklepami Shopify
- Wynikami finansowymi z dziennym podziałem
- Zarządzaniem zadaniami i pomysłami
- Kalendarzem wydarzeń
- Ustawieniami aplikacji
- Nową stroną arkuszy kalkulacyjnych (Excel-like)

## Current State - STABLE

### UI/UX
- **Jasny, profesjonalny motyw** - biały design, clean layout
- **Desktop**: Sidebar nawigacyjny (240px fixed)
- **Mobile**: Bottom navigation bar (5 items + Więcej)
- **Responsive**: Tabele desktop, karty mobile

### Strony i Funkcjonalności

#### Start (Dashboard)
- Date picker (Dzisiaj, Wczoraj, Ten tydzień, Ten miesiąc, Poprzedni miesiąc)
- Karty KPI: Przychód, Koszty reklam, Zysk, Na osobę
- Cel miesięczny z progress bar
- Sekcja przypomnień

#### Wyniki
- Szczegółowe finanse dzienne
- Kolumny: Dzień, Przychód, Koszty, Zysk, Na osobę
- Filtrowanie po sklepach

#### Zamówienia
- Lista nowych zamówień
- Pipeline realizacji (Oczekujące, Przypomnienie, Sprawdzenie, Wysyłka, Nieopłacone, Archiwum)
- Dodawanie ręczne zamówień

#### Zadania
- Zakładki: Aktywne, Ukończone, Usunięte
- Priorytet, przypisanie, termin
- Soft delete z restore

#### Pomysły
- Lista z kategoriami
- Gwiazdka ważności
- Filtry

#### Arkusze (NEW)
- Edytowalna siatka jak notatnik/Excel
- Tworzenie wielu arkuszy
- Edycja komórek z nawigacją Tab/Enter
- Eksport do CSV
- Dodawanie kolumn/wierszy
- Zapis do bazy danych

#### Kalendarz
- Widok miesięczny z nawigacją
- Przypomnienia (jednorazowe, dzienne, tygodniowe, miesięczne)
- Notatki na wybrany dzień
- Wskaźniki na dniach z zawartością

#### Sklepy
- Lista sklepów z kolorami
- Rozwijana konfiguracja Shopify (API)
- Sekcja TikTok Ads
- Dodawanie/edycja/usuwanie sklepów

#### Ustawienia
- Ustawienia aplikacji (cel przychodu, podział zysku, VAT, waluta, nazwa)
- Dane firmy (nazwa, NIP, adres, bank, kontakt)
- Przegląd sklepów
- Wylogowanie

## Technical Stack
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB Atlas
- **Deployment**: Railway.app

## Test Credentials
- Admin: PIN 2409
- Kacper: PIN 2609
- Szymon: PIN 2509

## API Endpoints
- `/api/auth/login` - logowanie PIN
- `/api/shops` - CRUD sklepów
- `/api/tasks` - CRUD zadań
- `/api/ideas` - CRUD pomysłów
- `/api/reminders` - CRUD przypomnień
- `/api/notes` - CRUD notatek
- `/api/spreadsheets` - CRUD arkuszy (NEW)
- `/api/orders` - zamówienia
- `/api/fulfillment` - realizacja
- `/api/app-settings` - ustawienia
- `/api/company-settings` - dane firmy

## Completed in v2.2
- [x] Przebudowa CalendarPage na jasny motyw
- [x] Przebudowa Stores na jasny motyw
- [x] Przebudowa Settings na jasny motyw
- [x] Nowa strona Arkusze (Excel-like) z pełnym CRUD
- [x] Backend API dla spreadsheets
- [x] Dodanie nawigacji do Arkuszy w sidebar
- [x] Testy: 100% backend, 100% frontend

## Backlog / Future Tasks
- [ ] Synchronizacja produktów ze Shopify
- [ ] Reaktywacja AI Assistant
- [ ] Refaktoryzacja backendu (monolith -> moduły)
- [ ] Formuły w arkuszach (SUMA, ŚREDNIA)
- [ ] Import CSV do arkuszy
