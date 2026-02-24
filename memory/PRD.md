# Ecommify - Panel E-Commerce Dashboard

## Wersja 2.3 (Feb 24, 2026)

## Original Problem Statement
Kompleksowy, profesjonalny dashboard do zarządzania biznesem e-commerce z:
- Ewidencją sprzedaży i realizacją zamówień
- Zarządzaniem produktami i dopłatami
- Dynamicznym zarządzaniem sklepami Shopify
- Wynikami finansowymi z dziennym podziałem
- Zarządzaniem zadaniami i pomysłami
- Kalendarzem wydarzeń
- Ustawieniami aplikacji
- Stroną arkuszy kalkulacyjnych (Excel-like) z formułami

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

#### Wyniki
- Szczegółowe finanse dzienne
- Filtrowanie po sklepach

#### Zamówienia
- Lista nowych zamówień
- Pipeline realizacji

#### Zadania
- Zakładki: Aktywne, Ukończone, Usunięte
- Priorytet, przypisanie, termin

#### Pomysły
- Lista z kategoriami
- Gwiazdka ważności

#### Arkusze (Excel-like) - NOWE FUNKCJE
- Edytowalna siatka jak Excel
- **Formuły**: =SUMA(A1:A5), =ŚREDNIA(), =MIN(), =MAX(), =ILE()
- **Formatowanie**: Bold, Italic
- **Wyrównanie**: Do lewej, Wyśrodkuj, Do prawej
- **Kolory tła**: 8 kolorów (żółty, zielony, niebieski, czerwony, fioletowy, pomarańczowy, szary)
- **Kolory tekstu**: 6 kolorów
- **Pasek formuł**: Pokazuje aktualną komórkę i wartość
- Eksport do CSV

#### Kalendarz
- Widok miesięczny z nawigacją
- Przypomnienia (jednorazowe, dzienne, tygodniowe, miesięczne)
- Notatki na wybrany dzień

#### Sklepy
- Lista sklepów z kolorami
- Konfiguracja Shopify API
- TikTok Ads

#### Ustawienia
- Ustawienia aplikacji
- Dane firmy
- Wylogowanie

## Test Credentials
- Admin: PIN 2409

## API Endpoints
- `/api/spreadsheets` - CRUD arkuszy (List[List[Any]] format)

## Completed in v2.3
- [x] Naprawiono bug z formularzami Tasks/Ideas (utrata focusa)
- [x] Dodano formuły do arkuszy (SUMA, ŚREDNIA, MIN, MAX, ILE)
- [x] Dodano formatowanie tekstu (Bold, Italic)
- [x] Dodano wyrównanie tekstu (left, center, right)
- [x] Dodano kolory tła komórek (8 kolorów)
- [x] Dodano kolory tekstu (6 kolorów)
- [x] Dodano pasek formuł
- [x] Zaktualizowano backend na List[List[Any]]

## Backlog / Future Tasks
- [ ] Synchronizacja produktów ze Shopify
- [ ] Reaktywacja AI Assistant
- [ ] Refaktoryzacja backendu (monolith -> moduły)
- [ ] Import CSV do arkuszy
- [ ] Więcej formuł (IF, CONCAT, etc.)
