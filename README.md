# Ecommify - E-commerce Dashboard

Dashboard do zarządzania sklepami e-commerce (Shopify) z wynikami finansowymi, zamówieniami, produktami i AI asystentem.

## Deployment na Dokploy

### Opcja 1: Osobne serwisy (ZALECANE)

#### Backend (FastAPI)
1. W Dokploy utwórz nowy serwis **"Application"**
2. Połącz z repozytorium GitHub
3. Ustaw:
   - **Build Path**: `./backend`
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Port**: `8001`

4. Dodaj zmienne środowiskowe (Environment Variables):
```
MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/
DB_NAME=ecommify_db
EMERGENT_LLM_KEY=twoj_klucz_llm
CORS_ORIGINS=https://twoja-domena-frontend.com
```

#### Frontend (React)
1. W Dokploy utwórz kolejny serwis **"Application"**
2. Połącz z tym samym repozytorium
3. Ustaw:
   - **Build Path**: `./frontend`
   - **Dockerfile Path**: `./frontend/Dockerfile`
   - **Port**: `80`

4. Dodaj **Build Arguments**:
```
REACT_APP_BACKEND_URL=https://twoja-domena-backend.com
```

---

### Opcja 2: Docker Compose

1. W Dokploy wybierz **"Compose"**
2. Połącz z repozytorium
3. Dokploy automatycznie wykryje `docker-compose.yml`
4. Ustaw zmienne środowiskowe:
```
MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/
DB_NAME=ecommify_db
EMERGENT_LLM_KEY=twoj_klucz_llm
CORS_ORIGINS=*
REACT_APP_BACKEND_URL=https://twoj-backend-url.com
```

---

## Wymagane zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `MONGO_URL` | Connection string do MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Nazwa bazy danych | `ecommify_db` |
| `EMERGENT_LLM_KEY` | Klucz API dla AI asystenta | `ek_...` |
| `CORS_ORIGINS` | Dozwolone originy (frontend URL) | `https://app.example.com` lub `*` |
| `REACT_APP_BACKEND_URL` | URL backendu (dla frontend) | `https://api.example.com` |

---

## MongoDB

Potrzebujesz bazy MongoDB. Opcje:
1. **MongoDB Atlas** (darmowy tier) - https://www.mongodb.com/atlas
2. **Dokploy Database** - jeśli Dokploy oferuje managed MongoDB

---

## Struktura projektu

```
/
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
├── docker-compose.yml
└── README.md
```

---

## Testowe loginy

- Admin: PIN `2409`
- Kacper: PIN `2609`
- Szymon: PIN `2509`

---

## Funkcje

- 📊 **Wyniki** - Finansowe statystyki w stylu Excel
- 🛒 **Zamówienia** - Zarządzanie zamówieniami, zwrotami, realizacją
- 📦 **Produkty** - Katalog produktów z dopłatami
- 📅 **Kalendarz** - Przypomnienia i notatki
- 🤖 **AI Asystent** - Wykonywanie akcji głosem/tekstem
- 🏪 **Multi-sklep** - Obsługa wielu sklepów Shopify
