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
from datetime import datetime, timezone
import httpx
import calendar

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
