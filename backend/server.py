from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import calendar
import io
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== CONSTANTS =====
USERS = {
    "2409": {"name": "Admin", "role": "admin", "pin": "2409"},
    "2609": {"name": "Kacper", "role": "kacper", "pin": "2609"},
    "2509": {"name": "Szymon", "role": "szymon", "pin": "2509"},
}

SHOPS = [
    {"id": 1, "name": "ecom1", "color": "#6366f1"},
    {"id": 2, "name": "ecom2", "color": "#10b981"},
    {"id": 3, "name": "ecom3", "color": "#f59e0b"},
    {"id": 4, "name": "ecom4", "color": "#ec4899"},
]

SHOP_NAMES = {1: "ecom1", 2: "ecom2", 3: "ecom3", 4: "ecom4"}
MONTHS_PL = {1: "Styczen", 2: "Luty", 3: "Marzec", 4: "Kwiecien", 5: "Maj", 6: "Czerwiec", 7: "Lipiec", 8: "Sierpien", 9: "Wrzesien", 10: "Pazdziernik", 11: "Listopad", 12: "Grudzien"}

# ===== MODELS =====
class LoginRequest(BaseModel):
    pin: str

class IncomeCreate(BaseModel):
    amount: float
    date: str
    description: str = ""
    shop_id: int

class ExpenseCreate(BaseModel):
    amount: float
    date: str
    campaign_name: str = ""
    shop_id: int

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: str = "oboje"
    due_date: Optional[str] = None
    created_by: str = "Admin"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

class ShopifyConfigCreate(BaseModel):
    shop_id: int
    store_url: str
    api_token: str

class TikTokConfigCreate(BaseModel):
    name: str
    advertiser_id: str
    access_token: str
    linked_shop_ids: List[int] = []

class TikTokConfigUpdate(BaseModel):
    name: Optional[str] = None
    advertiser_id: Optional[str] = None
    access_token: Optional[str] = None
    linked_shop_ids: Optional[List[int]] = None

class ChatMessage(BaseModel):
    shop_id: int
    message: str

# ===== AUTH =====
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = USERS.get(req.pin)
    if not user:
        raise HTTPException(status_code=401, detail="Nieprawidlowy PIN")
    return {"user": user, "shops": SHOPS}

# ===== INCOMES =====
@api_router.post("/incomes")
async def create_income(income: IncomeCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "amount": income.amount,
        "date": income.date,
        "description": income.description,
        "shop_id": income.shop_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incomes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/incomes")
async def get_incomes(shop_id: int = Query(...), date: Optional[str] = None, year: Optional[int] = None, month: Optional[int] = None):
    query = {"shop_id": shop_id}
    if date:
        query["date"] = date
    elif year and month:
        prefix = f"{year}-{month:02d}"
        query["date"] = {"$regex": f"^{prefix}"}
    return await db.incomes.find(query, {"_id": 0}).to_list(10000)

@api_router.delete("/incomes/{income_id}")
async def delete_income(income_id: str):
    result = await db.incomes.delete_one({"id": income_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return {"status": "ok"}

# ===== EXPENSES =====
@api_router.post("/expenses")
async def create_expense(expense: ExpenseCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "amount": expense.amount,
        "date": expense.date,
        "campaign_name": expense.campaign_name,
        "shop_id": expense.shop_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/expenses")
async def get_expenses(shop_id: int = Query(...), date: Optional[str] = None, year: Optional[int] = None, month: Optional[int] = None):
    query = {"shop_id": shop_id}
    if date:
        query["date"] = date
    elif year and month:
        prefix = f"{year}-{month:02d}"
        query["date"] = {"$regex": f"^{prefix}"}
    return await db.expenses.find(query, {"_id": 0}).to_list(10000)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return {"status": "ok"}

# ===== MONTHLY STATS =====
@api_router.get("/monthly-stats")
async def get_monthly_stats(shop_id: int = Query(...), year: int = Query(...), month: int = Query(...)):
    prefix = f"{year}-{month:02d}"
    incomes = await db.incomes.find({"shop_id": shop_id, "date": {"$regex": f"^{prefix}"}}, {"_id": 0}).to_list(10000)
    expenses = await db.expenses.find({"shop_id": shop_id, "date": {"$regex": f"^{prefix}"}}, {"_id": 0}).to_list(10000)

    days_in_month = calendar.monthrange(year, month)[1]
    days = {}
    for d in range(1, days_in_month + 1):
        ds = f"{year}-{month:02d}-{d:02d}"
        days[ds] = {"date": ds, "income": 0, "ads": 0, "netto": 0, "profit": 0}

    for inc in incomes:
        if inc["date"] in days:
            days[inc["date"]]["income"] += inc["amount"]
    for exp in expenses:
        if exp["date"] in days:
            days[exp["date"]]["ads"] += exp["amount"]

    total_income = 0
    total_ads = 0
    for day in days.values():
        day["netto"] = round(day["income"] * 0.77, 2)
        day["profit"] = round(day["netto"] - day["ads"], 2)
        total_income += day["income"]
        total_ads += day["ads"]

    total_netto = round(total_income * 0.77, 2)
    total_profit = round(total_netto - total_ads, 2)
    roi = round((total_profit / total_ads * 100), 2) if total_ads > 0 else 0

    return {
        "shop_id": shop_id, "year": year, "month": month,
        "total_income": round(total_income, 2),
        "total_ads": round(total_ads, 2),
        "total_netto": total_netto,
        "total_profit": total_profit,
        "roi": roi,
        "days": sorted(days.values(), key=lambda x: x["date"])
    }

# ===== COMBINED MONTHLY STATS =====
@api_router.get("/combined-monthly-stats")
async def get_combined_monthly_stats(year: int = Query(...), month: int = Query(...)):
    prefix = f"{year}-{month:02d}"
    incomes = await db.incomes.find({"date": {"$regex": f"^{prefix}"}}, {"_id": 0}).to_list(10000)
    expenses = await db.expenses.find({"date": {"$regex": f"^{prefix}"}}, {"_id": 0}).to_list(10000)

    days_in_month = calendar.monthrange(year, month)[1]
    days = {}
    for d in range(1, days_in_month + 1):
        ds = f"{year}-{month:02d}-{d:02d}"
        days[ds] = {"date": ds, "income": 0, "ads": 0, "shops": [{"shop_id": i, "income": 0, "ads": 0} for i in range(1, 5)]}

    for inc in incomes:
        dt = inc["date"]
        if dt in days:
            days[dt]["income"] += inc["amount"]
            sid = inc.get("shop_id", 1)
            for s in days[dt]["shops"]:
                if s["shop_id"] == sid:
                    s["income"] += inc["amount"]

    for exp in expenses:
        dt = exp["date"]
        if dt in days:
            days[dt]["ads"] += exp["amount"]
            sid = exp.get("shop_id", 1)
            for s in days[dt]["shops"]:
                if s["shop_id"] == sid:
                    s["ads"] += exp["amount"]

    total_income = 0
    total_ads = 0
    for day in days.values():
        day["netto"] = round(day["income"] * 0.77, 2)
        day["profit"] = round(day["netto"] - day["ads"], 2)
        day["profit_pp"] = round(day["profit"] / 2, 2)
        for s in day["shops"]:
            s["netto"] = round(s["income"] * 0.77, 2)
            s["profit"] = round(s["netto"] - s["ads"], 2)
        total_income += day["income"]
        total_ads += day["ads"]

    total_netto = round(total_income * 0.77, 2)
    total_profit = round(total_netto - total_ads, 2)
    roi = round((total_profit / total_ads * 100), 2) if total_ads > 0 else 0

    now_utc = datetime.now(timezone.utc)
    today_num = now_utc.day if (year == now_utc.year and month == now_utc.month) else days_in_month

    streak = 0
    for d in range(today_num, 0, -1):
        ds = f"{year}-{month:02d}-{d:02d}"
        if ds in days and days[ds]["profit"] > 0:
            streak += 1
        elif ds in days and (days[ds]["income"] > 0 or days[ds]["ads"] > 0):
            break
        else:
            break

    active = [d for d in days.values() if d["income"] > 0]
    best = max(active, key=lambda x: x["profit"])["date"] if active else None
    forecast = round((total_income / today_num) * days_in_month, 2) if total_income > 0 and today_num > 0 else 0

    return {
        "year": year, "month": month,
        "total_income": round(total_income, 2), "total_ads": round(total_ads, 2),
        "total_netto": total_netto, "total_profit": total_profit,
        "profit_per_person": round(total_profit / 2, 2), "roi": roi,
        "target": 250000, "progress": round(min(total_income / 250000 * 100, 100), 2) if total_income > 0 else 0,
        "streak": streak, "best_day": best, "forecast": forecast,
        "days": sorted(days.values(), key=lambda x: x["date"])
    }

# ===== TASKS =====
@api_router.get("/tasks")
async def get_tasks():
    return await db.tasks.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/tasks")
async def create_task(task: TaskCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "description": task.description,
        "assigned_to": task.assigned_to,
        "status": "todo",
        "due_date": task.due_date,
        "created_by": task.created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return {"status": "ok"}

# ===== SHOPIFY CONFIGS =====
@api_router.get("/shopify-configs")
async def get_shopify_configs():
    return await db.shopify_configs.find({}, {"_id": 0}).to_list(100)

@api_router.post("/shopify-configs")
async def save_shopify_config(config: ShopifyConfigCreate):
    existing = await db.shopify_configs.find_one({"shop_id": config.shop_id})
    if existing:
        await db.shopify_configs.update_one(
            {"shop_id": config.shop_id},
            {"$set": {"store_url": config.store_url, "api_token": config.api_token, "is_active": True}}
        )
        return await db.shopify_configs.find_one({"shop_id": config.shop_id}, {"_id": 0})
    doc = {
        "id": str(uuid.uuid4()),
        "shop_id": config.shop_id,
        "store_url": config.store_url,
        "api_token": config.api_token,
        "is_active": True,
        "last_sync": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shopify_configs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/shopify-configs/{shop_id}")
async def delete_shopify_config(shop_id: int):
    result = await db.shopify_configs.delete_one({"shop_id": shop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return {"status": "ok"}

# ===== TIKTOK CONFIGS =====
@api_router.get("/tiktok-configs")
async def get_tiktok_configs():
    return await db.tiktok_configs.find({}, {"_id": 0}).to_list(100)

@api_router.post("/tiktok-configs")
async def create_tiktok_config(config: TikTokConfigCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "name": config.name,
        "advertiser_id": config.advertiser_id,
        "access_token": config.access_token,
        "linked_shop_ids": config.linked_shop_ids,
        "is_active": True,
        "last_sync": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tiktok_configs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/tiktok-configs/{config_id}")
async def update_tiktok_config(config_id: str, update: TikTokConfigUpdate):
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    result = await db.tiktok_configs.update_one({"id": config_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return await db.tiktok_configs.find_one({"id": config_id}, {"_id": 0})

@api_router.delete("/tiktok-configs/{config_id}")
async def delete_tiktok_config(config_id: str):
    result = await db.tiktok_configs.delete_one({"id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return {"status": "ok"}

# ===== SYNC HELPERS =====
async def _sync_shopify(shop_id: int, year: int, month: int):
    config = await db.shopify_configs.find_one({"shop_id": shop_id, "is_active": True}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Brak konfiguracji Shopify")
    store_url = config["store_url"]
    api_token = config["api_token"]
    days_in_month = calendar.monthrange(year, month)[1]
    start_date = f"{year}-{month:02d}-01T00:00:00Z"
    end_date = f"{year}-{month:02d}-{days_in_month}T23:59:59Z"
    try:
        async with httpx.AsyncClient() as http:
            resp = await http.get(
                f"https://{store_url}/admin/api/2024-10/orders.json",
                params={"status": "any", "created_at_min": start_date, "created_at_max": end_date, "limit": 250, "financial_status": "paid"},
                headers={"X-Shopify-Access-Token": api_token},
                timeout=30
            )
            if resp.status_code != 200:
                return {"status": "error", "detail": f"Shopify HTTP {resp.status_code}"}
            orders = resp.json().get("orders", [])
            prefix = f"{year}-{month:02d}"
            await db.incomes.delete_many({"shop_id": shop_id, "date": {"$regex": f"^{prefix}"}, "description": {"$regex": "\\[Shopify\\]"}})
            daily = {}
            for o in orders:
                d = o["created_at"][:10]
                daily[d] = daily.get(d, 0) + float(o.get("total_price", 0))
            for ds, total in daily.items():
                doc = {"id": str(uuid.uuid4()), "amount": round(total, 2), "date": ds, "description": "[Shopify] Auto-sync", "shop_id": shop_id, "created_at": datetime.now(timezone.utc).isoformat()}
                await db.incomes.insert_one(doc)
            await db.shopify_configs.update_one({"shop_id": shop_id}, {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}})
            return {"status": "ok", "orders": len(orders), "days": len(daily)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

async def _sync_tiktok(config_id: str, year: int, month: int):
    config = await db.tiktok_configs.find_one({"id": config_id, "is_active": True}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Brak konfiguracji TikTok")
    days_in_month = calendar.monthrange(year, month)[1]
    try:
        async with httpx.AsyncClient() as http:
            resp = await http.get(
                "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
                headers={"Access-Token": config["access_token"]},
                params={
                    "advertiser_id": config["advertiser_id"],
                    "report_type": "BASIC", "data_level": "AUCTION_ADVERTISER",
                    "dimensions": '["stat_time_day"]', "metrics": '["spend"]',
                    "start_date": f"{year}-{month:02d}-01",
                    "end_date": f"{year}-{month:02d}-{days_in_month:02d}",
                    "page": 1, "page_size": 31
                },
                timeout=30
            )
            if resp.status_code != 200:
                return {"status": "error", "detail": f"TikTok HTTP {resp.status_code}"}
            data = resp.json()
            if data.get("code") != 0:
                return {"status": "error", "detail": data.get("message", "Unknown")}
            rows = data.get("data", {}).get("list", [])
            linked = config.get("linked_shop_ids", [])
            prefix = f"{year}-{month:02d}"
            for sid in linked:
                await db.expenses.delete_many({"shop_id": sid, "date": {"$regex": f"^{prefix}"}, "campaign_name": {"$regex": f"\\[TikTok:{config['name']}\\]"}})
            count = 0
            for row in rows:
                ds = row.get("dimensions", {}).get("stat_time_day", "")[:10]
                spend = float(row.get("metrics", {}).get("spend", 0))
                if spend > 0 and linked:
                    per_shop = round(spend / len(linked), 2)
                    for sid in linked:
                        doc = {"id": str(uuid.uuid4()), "amount": per_shop, "date": ds, "campaign_name": f"[TikTok:{config['name']}] Auto-sync", "shop_id": sid, "created_at": datetime.now(timezone.utc).isoformat()}
                        await db.expenses.insert_one(doc)
                        count += 1
            await db.tiktok_configs.update_one({"id": config_id}, {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}})
            return {"status": "ok", "rows": len(rows), "entries": count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@api_router.post("/sync/shopify/{shop_id}")
async def sync_shopify(shop_id: int, year: int = Query(...), month: int = Query(...)):
    return await _sync_shopify(shop_id, year, month)

@api_router.post("/sync/tiktok/{config_id}")
async def sync_tiktok(config_id: str, year: int = Query(...), month: int = Query(...)):
    return await _sync_tiktok(config_id, year, month)

@api_router.post("/sync/all")
async def sync_all(year: int = Query(...), month: int = Query(...)):
    results = {"shopify": [], "tiktok": []}
    for sc in await db.shopify_configs.find({"is_active": True}, {"_id": 0}).to_list(100):
        r = await _sync_shopify(sc["shop_id"], year, month)
        results["shopify"].append({"shop_id": sc["shop_id"], **r})
    for tc in await db.tiktok_configs.find({"is_active": True}, {"_id": 0}).to_list(100):
        r = await _sync_tiktok(tc["id"], year, month)
        results["tiktok"].append({"config_id": tc["id"], **r})
    return results

# ===== AI CHAT =====
@api_router.post("/chat")
async def chat_endpoint(msg: ChatMessage):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Brak klucza LLM")

    user_doc = {
        "id": str(uuid.uuid4()), "shop_id": msg.shop_id, "role": "user",
        "content": msg.message, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(user_doc)

    shop_names = {1: "ecom1", 2: "ecom2", 3: "ecom3", 4: "ecom4"}
    shop_name = shop_names.get(msg.shop_id, "ogolny")

    system_msg = (
        f"Jestes ekspertem e-commerce i marketingu cyfrowego. Specjalizujesz sie w Shopify, TikTok Ads i optymalizacji ROI. "
        f"Odpowiadasz po polsku, konkretnie i z praktycznymi poradami. "
        f"Pomagasz zespolowi zarzadzajacemu 4 sklepami Shopify (ecom1-4) z reklamami TikTok. "
        f"Aktualnie rozmawiasz o sklepie: {shop_name}. Twoje odpowiedzi sa krotkie i merytoryczne."
    )

    session_id = f"ecommify-shop-{msg.shop_id}"
    chat = LlmChat(api_key=llm_key, session_id=session_id, system_message=system_msg)
    chat.with_model("openai", "gpt-5.2")

    try:
        response = await chat.send_message(UserMessage(text=msg.message))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"Blad AI: {str(e)}")

    assistant_doc = {
        "id": str(uuid.uuid4()), "shop_id": msg.shop_id, "role": "assistant",
        "content": response, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(assistant_doc)

    return {"response": response, "id": assistant_doc["id"]}

@api_router.get("/chat-history")
async def get_chat_history(shop_id: int = Query(...), limit: int = Query(50)):
    return await db.chat_history.find({"shop_id": shop_id}, {"_id": 0}).sort("created_at", 1).to_list(limit)

@api_router.delete("/chat-history")
async def clear_chat_history(shop_id: int = Query(...)):
    await db.chat_history.delete_many({"shop_id": shop_id})
    return {"status": "ok"}

# ===== HEALTH =====
@api_router.get("/")
async def root():
    return {"message": "Ecommify API running"}

# ===== REMINDERS =====
class ReminderCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    recurring: str = "none"
    created_by: str = "Admin"

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    recurring: Optional[str] = None
    done: Optional[bool] = None

@api_router.get("/reminders")
async def get_reminders():
    return await db.reminders.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/reminders")
async def create_reminder(r: ReminderCreate):
    doc = {"id": str(uuid.uuid4()), "title": r.title, "date": r.date, "time": r.time, "recurring": r.recurring, "done": False, "created_by": r.created_by, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.reminders.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/reminders/{rid}")
async def update_reminder(rid: str, update: ReminderUpdate):
    ud = {k: v for k, v in update.model_dump().items() if v is not None}
    result = await db.reminders.update_one({"id": rid}, {"$set": ud})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return await db.reminders.find_one({"id": rid}, {"_id": 0})

@api_router.delete("/reminders/{rid}")
async def delete_reminder(rid: str):
    await db.reminders.delete_one({"id": rid})
    return {"status": "ok"}

# ===== ORDERS =====
class OrderCreate(BaseModel):
    order_number: str = ""
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    shipping_address: str = ""
    shipping_method: str = ""
    parcel_locker: str = ""
    payment_method: str = ""
    payment_gateway: str = ""
    transaction_id: str = ""
    items: List[dict] = []
    total: float
    date: str
    shop_id: int
    status: str = "new"

@api_router.get("/orders")
async def get_orders(shop_id: Optional[int] = None, year: Optional[int] = None, month: Optional[int] = None):
    q = {}
    if shop_id and shop_id > 0: q["shop_id"] = shop_id
    if year and month: q["date"] = {"$regex": f"^{year}-{month:02d}"}
    return await db.orders.find(q, {"_id": 0}).sort("date", -1).to_list(10000)

@api_router.post("/orders")
async def create_order(order: OrderCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "order_number": order.order_number or f"ORD-{str(uuid.uuid4())[:8].upper()}",
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "shipping_address": order.shipping_address,
        "shipping_method": order.shipping_method,
        "parcel_locker": order.parcel_locker,
        "payment_method": order.payment_method,
        "payment_gateway": order.payment_gateway,
        "transaction_id": order.transaction_id,
        "items": order.items,
        "total": order.total,
        "date": order.date,
        "shop_id": order.shop_id,
        "status": order.status,
        "source": "manual",
        "receipt_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/orders/{oid}/status")
async def update_order_status(oid: str, status: str = Query(...)):
    result = await db.orders.update_one({"id": oid}, {"$set": {"status": status}})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="Nie znaleziono")
    return await db.orders.find_one({"id": oid}, {"_id": 0})

@api_router.delete("/orders/{oid}")
async def delete_order(oid: str):
    await db.orders.delete_one({"id": oid})
    return {"status": "ok"}

# ===== COMPANY SETTINGS =====
class CompanySettings(BaseModel):
    name: str = ""
    nip: str = ""
    address: str = ""
    city: str = ""
    postal_code: str = ""
    bank_name: str = ""
    bank_account: str = ""
    email: str = ""
    phone: str = ""

@api_router.get("/company-settings")
async def get_company():
    doc = await db.company_settings.find_one({}, {"_id": 0})
    return doc or {}

@api_router.put("/company-settings")
async def update_company(s: CompanySettings):
    data = s.model_dump()
    await db.company_settings.update_one({}, {"$set": data}, upsert=True)
    return data

# ===== NOTES =====
class NoteCreate(BaseModel):
    date: str
    shop_id: int = 0
    content: str
    created_by: str = "Admin"

@api_router.get("/notes")
async def get_notes(date: Optional[str] = None, year: Optional[int] = None, month: Optional[int] = None):
    q = {}
    if date: q["date"] = date
    elif year and month: q["date"] = {"$regex": f"^{year}-{month:02d}"}
    return await db.notes.find(q, {"_id": 0}).to_list(1000)

@api_router.post("/notes")
async def create_note(note: NoteCreate):
    doc = {"id": str(uuid.uuid4()), "date": note.date, "shop_id": note.shop_id, "content": note.content, "created_by": note.created_by, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/notes/{nid}")
async def delete_note(nid: str):
    await db.notes.delete_one({"id": nid})
    return {"status": "ok"}

# ===== RECEIPTS =====
class ReceiptCreate(BaseModel):
    date: str
    shop_id: int
    items: List[dict]

@api_router.get("/receipts")
async def get_receipts(shop_id: Optional[int] = None, year: Optional[int] = None, month: Optional[int] = None):
    q = {}
    if shop_id and shop_id > 0: q["shop_id"] = shop_id
    if year and month: q["date"] = {"$regex": f"^{year}-{month:02d}"}
    return await db.receipts.find(q, {"_id": 0}).sort("date", -1).to_list(10000)

@api_router.post("/receipts")
async def create_receipt(r: ReceiptCreate):
    count = await db.receipts.count_documents({"date": {"$regex": f"^{r.date[:7]}"}})
    month_num = r.date[5:7]
    year_str = r.date[:4]
    number = f"{count + 1}/{month_num}/{year_str}/P"
    company = await db.company_settings.find_one({}, {"_id": 0}) or {}
    items_c = []
    total_b = 0
    for it in r.items:
        qty = it.get("quantity", 1)
        brutto_unit = round(it.get("brutto_price", it.get("netto_price", 0) * 1.23), 2)
        brutto_line = round(brutto_unit * qty, 2)
        netto_line = round(brutto_line / 1.23, 2)
        vat_line = round(brutto_line - netto_line, 2)
        items_c.append({
            "description": it.get("description", ""),
            "quantity": qty,
            "brutto_unit": brutto_unit,
            "brutto": brutto_line,
            "netto": netto_line,
            "vat": vat_line,
            "netto_price": round(brutto_unit / 1.23, 2),
        })
        total_b += brutto_line
    total_n = round(total_b / 1.23, 2)
    total_v = round(total_b - total_n, 2)
    now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_number": number,
        "date": r.date,
        "time": now_str,
        "shop_id": r.shop_id,
        "order_id": None,
        "items": items_c,
        "total_netto": round(total_n, 2),
        "vat_rate": 23,
        "vat_amount": round(total_v, 2),
        "total_brutto": round(total_b, 2),
        "company_data": company,
        "payment_gateway": "",
        "payment_method": "",
        "transaction_id": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.receipts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/receipts/{rid}")
async def delete_receipt(rid: str):
    await db.receipts.delete_one({"id": rid})
    return {"status": "ok"}

@api_router.get("/receipts/pdf/{rid}")
async def receipt_pdf(rid: str):
    from fpdf import FPDF
    r = await db.receipts.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(status_code=404, detail="Nie znaleziono")
    co = r.get("company_data", {})
    w = 80
    pdf = FPDF(unit="mm", format=(w, 200))
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=5)
    lm = 3
    pw = w - 2 * lm
    pdf.set_left_margin(lm)
    pdf.set_right_margin(lm)
    # Company header
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(pw, 4, co.get("name", "").upper(), ln=True, align="C")
    pdf.set_font("Helvetica", "", 7)
    if co.get("address"):
        pdf.cell(pw, 3, co.get("address", ""), ln=True, align="C")
    addr2 = f"{co.get('postal_code', '')}, {co.get('city', '')}".strip(", ")
    if addr2:
        pdf.cell(pw, 3, addr2, ln=True, align="C")
    if co.get("nip"):
        pdf.cell(pw, 3, co["nip"], ln=True, align="C")
    pdf.ln(2)
    # Date + receipt number
    pdf.set_font("Helvetica", "", 7)
    dt_str = r.get("date", "")
    time_str = r.get("time", datetime.now(timezone.utc).strftime("%H:%M:%S"))
    half = pw / 2
    pdf.cell(half, 4, f"{dt_str} {time_str}", align="L")
    pdf.cell(half, 4, r.get("receipt_number", ""), align="R", ln=True)
    pdf.ln(1)
    # Title
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(pw, 5, "PARAGON", ln=True, align="C")
    pdf.ln(1)
    # Separator
    pdf.line(lm, pdf.get_y(), w - lm, pdf.get_y())
    pdf.ln(1)
    # Items
    total_brutto = 0
    for it in r.get("items", []):
        desc = str(it.get("description", ""))
        qty = it.get("quantity", 1)
        brutto_unit = it.get("brutto_unit", it.get("brutto", 0) / max(qty, 1))
        brutto_line = round(brutto_unit * qty, 2)
        total_brutto += brutto_line
        pdf.set_font("Helvetica", "", 7)
        pdf.cell(pw, 3.5, desc[:50], ln=True)
        price_text = f"{qty} x {brutto_unit:.2f}="
        total_text = f"{brutto_line:.2f} A"
        pdf.cell(pw * 0.6, 3.5, price_text, align="R")
        pdf.cell(pw * 0.4, 3.5, total_text, align="R", ln=True)
        pdf.ln(0.5)
    if total_brutto == 0:
        total_brutto = r.get("total_brutto", 0)
    # Separator
    pdf.line(lm, pdf.get_y(), w - lm, pdf.get_y())
    pdf.ln(2)
    # Tax summary
    vat_amount = round(total_brutto - (total_brutto / 1.23), 2)
    pdf.set_font("Helvetica", "", 7)
    pdf.cell(pw * 0.6, 3.5, "Sprzedaz opodatkowana A", align="L")
    pdf.cell(pw * 0.4, 3.5, f"{total_brutto:.2f}", align="R", ln=True)
    pdf.cell(pw * 0.6, 3.5, "PTU A 23%", align="L")
    pdf.cell(pw * 0.4, 3.5, f"{vat_amount:.2f}", align="R", ln=True)
    pdf.ln(1)
    # Suma PLN
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(pw * 0.5, 6, "Suma PLN", align="L")
    pdf.cell(pw * 0.5, 6, f"{total_brutto:.2f}", align="R", ln=True)
    pdf.ln(2)
    # Payment info
    pm = r.get("payment_gateway", r.get("payment_method", ""))
    tid = r.get("transaction_id", "")
    if pm or tid:
        pdf.set_font("Helvetica", "", 6)
        pdf.cell(pw * 0.4, 3, "Platnosc", align="L")
        pdf.cell(pw * 0.6, 3, pm, align="R", ln=True)
        if tid:
            pdf.cell(pw * 0.4, 3, "Numer transakcji", align="L")
            pdf.cell(pw * 0.6, 3, tid, align="R", ln=True)
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="paragon_{r.get("receipt_number","").replace("/","_")}.pdf"'})

@api_router.get("/receipts/summary-pdf")
async def summary_pdf(year: int = Query(...), month: int = Query(...), shop_id: Optional[int] = None):
    from fpdf import FPDF
    q = {"date": {"$regex": f"^{year}-{month:02d}"}}
    if shop_id and shop_id > 0: q["shop_id"] = shop_id
    recs = await db.receipts.find(q, {"_id": 0}).sort("date", 1).to_list(10000)
    company = await db.company_settings.find_one({}, {"_id": 0}) or {}
    pdf = FPDF()
    pdf.add_page("L")
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"ZESTAWIENIE SPRZEDAZY", ln=True, align="C")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"{MONTHS_PL.get(month, '')} {year}", ln=True, align="C")
    if company.get("name"):
        pdf.set_font("Helvetica", "", 9)
        nip_str = f" | NIP: {company['nip']}" if company.get("nip") else ""
        addr_str = f" | {company.get('address', '')} {company.get('postal_code', '')} {company.get('city', '')}".strip()
        pdf.cell(0, 5, f"{company['name']}{nip_str}{addr_str}", ln=True, align="C")
    pdf.ln(6)
    # Table header
    cols = [("Lp.", 12, "C"), ("Data", 24, "L"), ("Nr paragonu", 45, "L"), ("Sklep", 22, "L"), ("Pozycje", 70, "L"), ("Brutto", 28, "R"), ("VAT 23%", 26, "R"), ("Netto", 28, "R")]
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(230, 230, 240)
    for c in cols:
        pdf.cell(c[1], 8, c[0], border=1, align=c[2], fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 7)
    tn = tv = tb = 0
    for i, rc in enumerate(recs, 1):
        items_str = ", ".join([it.get("description", "")[:30] for it in rc.get("items", [])])[:65]
        brutto = rc.get("total_brutto", 0)
        vat = rc.get("vat_amount", 0)
        netto = rc.get("total_netto", 0)
        h = 6
        pdf.cell(12, h, str(i), border=1, align="C")
        pdf.cell(24, h, rc["date"], border=1)
        pdf.cell(45, h, rc.get("receipt_number", ""), border=1)
        pdf.cell(22, h, SHOP_NAMES.get(rc.get("shop_id", 0), ""), border=1)
        pdf.cell(70, h, items_str, border=1)
        pdf.cell(28, h, f"{brutto:.2f} zl", border=1, align="R")
        pdf.cell(26, h, f"{vat:.2f} zl", border=1, align="R")
        pdf.cell(28, h, f"{netto:.2f} zl", border=1, align="R")
        pdf.ln()
        tn += netto; tv += vat; tb += brutto
    # Totals
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(240, 240, 250)
    pdf.cell(173, 8, "RAZEM:", border=1, align="R", fill=True)
    pdf.cell(28, 8, f"{tb:.2f} zl", border=1, align="R", fill=True)
    pdf.cell(26, 8, f"{tv:.2f} zl", border=1, align="R", fill=True)
    pdf.cell(28, 8, f"{tn:.2f} zl", border=1, align="R", fill=True)
    pdf.ln(10)
    # Summary stats
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, f"Liczba paragonow: {len(recs)}", ln=True)
    pdf.cell(0, 5, f"Suma brutto: {tb:.2f} zl", ln=True)
    pdf.cell(0, 5, f"Suma VAT (23%): {tv:.2f} zl", ln=True)
    pdf.cell(0, 5, f"Suma netto: {tn:.2f} zl", ln=True)
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 7)
    pdf.cell(0, 4, f"Wygenerowano: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC", ln=True, align="R")
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="zestawienie_{year}_{month:02d}.pdf"'})

# ===== GENERATE RECEIPT FROM ORDER =====
@api_router.post("/orders/{oid}/generate-receipt")
async def generate_receipt_from_order(oid: str):
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Nie znaleziono zamowienia")
    if order.get("receipt_id"):
        raise HTTPException(status_code=400, detail="Paragon juz wystawiony dla tego zamowienia")
    company = await db.company_settings.find_one({}, {"_id": 0}) or {}
    count = await db.receipts.count_documents({"date": {"$regex": f"^{order['date'][:7]}"}})
    month_num = order["date"][5:7]
    year_str = order["date"][:4]
    receipt_number = f"{count + 1}/{month_num}/{year_str}/P"
    items_for_receipt = []
    total_brutto = order.get("total", 0)
    order_items = order.get("items", [])
    if order_items:
        for it in order_items:
            qty = it.get("quantity", 1)
            price = it.get("price", 0)
            brutto_unit = round(price, 2)
            brutto_line = round(brutto_unit * qty, 2)
            items_for_receipt.append({
                "description": it.get("name", it.get("description", "Produkt")),
                "quantity": qty,
                "brutto_unit": brutto_unit,
                "brutto": brutto_line,
                "netto": round(brutto_line / 1.23, 2),
                "vat": round(brutto_line - brutto_line / 1.23, 2),
                "netto_price": round(brutto_unit / 1.23, 2),
            })
    else:
        items_for_receipt.append({
            "description": f"Zamowienie {order.get('order_number', '')}",
            "quantity": 1,
            "brutto_unit": total_brutto,
            "brutto": total_brutto,
            "netto": round(total_brutto / 1.23, 2),
            "vat": round(total_brutto - total_brutto / 1.23, 2),
            "netto_price": round(total_brutto / 1.23, 2),
        })
    total_netto = sum(it["netto"] for it in items_for_receipt)
    total_vat = sum(it["vat"] for it in items_for_receipt)
    total_b = sum(it["brutto"] for it in items_for_receipt)
    now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_number": receipt_number,
        "date": order["date"],
        "time": now_str,
        "shop_id": order.get("shop_id", 1),
        "order_id": oid,
        "order_number": order.get("order_number", ""),
        "items": items_for_receipt,
        "total_netto": round(total_netto, 2),
        "vat_rate": 23,
        "vat_amount": round(total_vat, 2),
        "total_brutto": round(total_b, 2),
        "company_data": company,
        "payment_gateway": order.get("payment_gateway", ""),
        "payment_method": order.get("payment_method", ""),
        "transaction_id": order.get("transaction_id", ""),
        "customer_name": order.get("customer_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.receipts.insert_one(doc)
    doc.pop("_id", None)
    await db.orders.update_one({"id": oid}, {"$set": {"receipt_id": doc["id"]}})
    return doc

@api_router.post("/orders/generate-receipts-bulk")
async def generate_receipts_bulk(shop_id: Optional[int] = None, year: Optional[int] = None, month: Optional[int] = None):
    q = {"$or": [{"receipt_id": None}, {"receipt_id": {"$exists": False}}]}
    if shop_id and shop_id > 0:
        q["shop_id"] = shop_id
    if year and month:
        q["date"] = {"$regex": f"^{year}-{month:02d}"}
    orders_without = await db.orders.find(q, {"_id": 0}).to_list(10000)
    if not orders_without:
        return {"status": "ok", "generated": 0, "message": "Wszystkie zamowienia maja paragony"}
    company = await db.company_settings.find_one({}, {"_id": 0}) or {}
    generated = 0
    for order in orders_without:
        count = await db.receipts.count_documents({"date": {"$regex": f"^{order['date'][:7]}"}})
        month_num = order["date"][5:7]
        year_str = order["date"][:4]
        receipt_number = f"{count + 1}/{month_num}/{year_str}/P"
        total_brutto = order.get("total", 0)
        order_items = order.get("items", [])
        items_for_receipt = []
        if order_items:
            for it in order_items:
                qty = it.get("quantity", 1)
                price = it.get("price", 0)
                brutto_unit = round(price, 2)
                brutto_line = round(brutto_unit * qty, 2)
                items_for_receipt.append({
                    "description": it.get("name", it.get("description", "Produkt")),
                    "quantity": qty, "brutto_unit": brutto_unit, "brutto": brutto_line,
                    "netto": round(brutto_line / 1.23, 2),
                    "vat": round(brutto_line - brutto_line / 1.23, 2),
                    "netto_price": round(brutto_unit / 1.23, 2),
                })
        else:
            items_for_receipt.append({
                "description": f"Zamowienie {order.get('order_number', '')}",
                "quantity": 1, "brutto_unit": total_brutto, "brutto": total_brutto,
                "netto": round(total_brutto / 1.23, 2),
                "vat": round(total_brutto - total_brutto / 1.23, 2),
                "netto_price": round(total_brutto / 1.23, 2),
            })
        total_netto = sum(it["netto"] for it in items_for_receipt)
        total_vat = sum(it["vat"] for it in items_for_receipt)
        total_b = sum(it["brutto"] for it in items_for_receipt)
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
        doc = {
            "id": str(uuid.uuid4()), "receipt_number": receipt_number,
            "date": order["date"], "time": now_str,
            "shop_id": order.get("shop_id", 1), "order_id": order["id"],
            "order_number": order.get("order_number", ""),
            "items": items_for_receipt,
            "total_netto": round(total_netto, 2), "vat_rate": 23,
            "vat_amount": round(total_vat, 2), "total_brutto": round(total_b, 2),
            "company_data": company,
            "payment_gateway": order.get("payment_gateway", ""),
            "payment_method": order.get("payment_method", ""),
            "transaction_id": order.get("transaction_id", ""),
            "customer_name": order.get("customer_name", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.receipts.insert_one(doc)
        doc.pop("_id", None)
        await db.orders.update_one({"id": order["id"]}, {"$set": {"receipt_id": doc["id"]}})
        generated += 1
    return {"status": "ok", "generated": generated, "message": f"Wystawiono {generated} paragonow"}

# ===== WEEKLY STATS =====
@api_router.get("/weekly-stats")
async def get_weekly_stats():
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    m_str = monday.strftime("%Y-%m-%d")
    s_str = (monday + timedelta(days=6)).strftime("%Y-%m-%d")
    pm_str = (monday - timedelta(days=7)).strftime("%Y-%m-%d")
    ps_str = (monday - timedelta(days=1)).strftime("%Y-%m-%d")
    async def wk(start, end):
        inc = await db.incomes.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(10000)
        exp = await db.expenses.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(10000)
        ti = sum(i["amount"] for i in inc); te = sum(e["amount"] for e in exp)
        n = round(ti * 0.77, 2); p = round(n - te, 2)
        return {"income": round(ti, 2), "ads": round(te, 2), "profit": p, "profit_pp": round(p / 2, 2)}
    cur = await wk(m_str, s_str)
    prev = await wk(pm_str, ps_str)
    ic = round(((cur["income"] - prev["income"]) / prev["income"] * 100) if prev["income"] > 0 else 0, 1)
    pc = round(((cur["profit"] - prev["profit"]) / abs(prev["profit"]) * 100) if prev["profit"] != 0 else 0, 1)
    return {"current": {"start": m_str, "end": s_str, **cur}, "previous": {"start": pm_str, "end": ps_str, **prev}, "income_change": ic, "profit_change": pc}

# ===== EXPORT EXCEL =====
@api_router.get("/export/excel")
async def export_excel(year: int = Query(...), month: int = Query(...), shop_id: Optional[int] = None):
    from openpyxl import Workbook
    prefix = f"{year}-{month:02d}"
    iq = {"date": {"$regex": f"^{prefix}"}}; eq = {"date": {"$regex": f"^{prefix}"}}
    if shop_id and shop_id > 0: iq["shop_id"] = shop_id; eq["shop_id"] = shop_id
    incs = await db.incomes.find(iq, {"_id": 0}).sort("date", 1).to_list(10000)
    exps = await db.expenses.find(eq, {"_id": 0}).sort("date", 1).to_list(10000)
    wb = Workbook()
    ws1 = wb.active; ws1.title = "Przychody"
    ws1.append(["Data", "Sklep", "Kwota", "Opis"])
    for i in incs: ws1.append([i["date"], SHOP_NAMES.get(i.get("shop_id", 0), ""), i["amount"], i.get("description", "")])
    ws2 = wb.create_sheet("Koszty Ads")
    ws2.append(["Data", "Sklep", "Kwota", "Kampania"])
    for e in exps: ws2.append([e["date"], SHOP_NAMES.get(e.get("shop_id", 0), ""), e["amount"], e.get("campaign_name", "")])
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="ecommify_{year}_{month:02d}.xlsx"'})

# ===== INCOME/EXPENSE DETAILS =====
@api_router.get("/incomes/details")
async def income_details(shop_id: int = Query(...), date: str = Query(...)):
    return await db.incomes.find({"shop_id": shop_id, "date": date}, {"_id": 0}).to_list(1000)

@api_router.get("/expenses/details")
async def expense_details(shop_id: int = Query(...), date: str = Query(...)):
    return await db.expenses.find({"shop_id": shop_id, "date": date}, {"_id": 0}).to_list(1000)

# ===== SETUP =====
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
