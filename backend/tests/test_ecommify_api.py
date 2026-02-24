"""
Ecommify Backend API Tests
Testing: Auth, Shops, Settings, Calendar, Spreadsheets endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://business-panel-2.preview.emergentagent.com')

class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["name"] == "Admin"
        assert data["user"]["role"] == "admin"
        assert "shops" in data
        assert "settings" in data
        
    def test_login_invalid_pin(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "0000"})
        assert response.status_code == 401


class TestShopsAPI:
    """Shops CRUD tests"""
    
    def test_get_shops(self):
        response = requests.get(f"{BASE_URL}/api/shops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Default shops
        
    def test_create_update_delete_shop(self):
        # Create
        response = requests.post(f"{BASE_URL}/api/shops", json={
            "name": "TEST_Shop_API",
            "color": "#ff0000"
        })
        assert response.status_code == 200
        shop = response.json()
        assert shop["name"] == "TEST_Shop_API"
        assert "id" in shop
        shop_id = shop["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/shops/{shop_id}", json={
            "name": "TEST_Shop_Updated",
            "color": "#00ff00"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["name"] == "TEST_Shop_Updated"
        assert updated["color"] == "#00ff00"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/shops")
        shops = response.json()
        found = [s for s in shops if s["id"] == shop_id]
        assert len(found) == 1
        assert found[0]["name"] == "TEST_Shop_Updated"
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/shops/{shop_id}")
        assert response.status_code == 200


class TestSettingsAPI:
    """App Settings and Company Settings tests"""
    
    def test_get_app_settings(self):
        response = requests.get(f"{BASE_URL}/api/app-settings")
        assert response.status_code == 200
        data = response.json()
        assert "target_revenue" in data
        assert "vat_rate" in data
        
    def test_update_app_settings(self):
        # Get current
        response = requests.get(f"{BASE_URL}/api/app-settings")
        original = response.json()
        
        # Update
        response = requests.put(f"{BASE_URL}/api/app-settings", json={
            "target_revenue": 300000,
            "vat_rate": 23
        })
        assert response.status_code == 200
        
        # Restore original
        requests.put(f"{BASE_URL}/api/app-settings", json={
            "target_revenue": original.get("target_revenue", 250000),
            "vat_rate": original.get("vat_rate", 23)
        })
        
    def test_get_company_settings(self):
        response = requests.get(f"{BASE_URL}/api/company-settings")
        assert response.status_code == 200
        
    def test_update_company_settings(self):
        response = requests.put(f"{BASE_URL}/api/company-settings", json={
            "name": "TEST_Company",
            "nip": "PL1234567890",
            "address": "Test Street 1",
            "city": "Test City",
            "postal_code": "00-000"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Company"


class TestCalendarAPI:
    """Reminders and Notes tests"""
    
    def test_get_reminders(self):
        response = requests.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_update_delete_reminder(self):
        # Create
        response = requests.post(f"{BASE_URL}/api/reminders", json={
            "title": "TEST_Reminder",
            "date": "2026-01-15",
            "time": "10:00",
            "recurring": "none",
            "created_by": "Test"
        })
        assert response.status_code == 200
        reminder = response.json()
        assert reminder["title"] == "TEST_Reminder"
        assert "id" in reminder
        rid = reminder["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/reminders/{rid}", json={
            "done": True
        })
        assert response.status_code == 200
        assert response.json()["done"] == True
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/reminders/{rid}")
        assert response.status_code == 200
        
    def test_get_notes(self):
        response = requests.get(f"{BASE_URL}/api/notes", params={"year": 2026, "month": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_delete_note(self):
        # Create
        response = requests.post(f"{BASE_URL}/api/notes", json={
            "date": "2026-01-15",
            "content": "TEST_Note content",
            "created_by": "Test"
        })
        assert response.status_code == 200
        note = response.json()
        assert note["content"] == "TEST_Note content"
        nid = note["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/notes/{nid}")
        assert response.status_code == 200


class TestSpreadsheetAPI:
    """Spreadsheets (Excel-like) CRUD tests"""
    
    def test_get_spreadsheets(self):
        response = requests.get(f"{BASE_URL}/api/spreadsheets")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_update_delete_spreadsheet(self):
        # Create
        test_data = [["Header1", "Header2"], ["Value1", "Value2"]]
        response = requests.post(f"{BASE_URL}/api/spreadsheets", json={
            "name": "TEST_Spreadsheet",
            "data": test_data,
            "created_by": "Test"
        })
        assert response.status_code == 200
        sheet = response.json()
        assert sheet["name"] == "TEST_Spreadsheet"
        assert "id" in sheet
        sid = sheet["id"]
        
        # Update
        updated_data = [["Updated", "Header"], ["New", "Data"]]
        response = requests.put(f"{BASE_URL}/api/spreadsheets/{sid}", json={
            "data": updated_data
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["data"] == updated_data
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/spreadsheets")
        sheets = response.json()
        found = [s for s in sheets if s["id"] == sid]
        assert len(found) == 1
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/spreadsheets/{sid}")
        assert response.status_code == 200
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/spreadsheets")
        sheets = response.json()
        found = [s for s in sheets if s["id"] == sid]
        assert len(found) == 0


class TestTasksAPI:
    """Tasks CRUD tests"""
    
    def test_get_tasks(self):
        response = requests.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_update_delete_task(self):
        # Create
        response = requests.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task_API",
            "description": "Test description",
            "assigned_to": "oboje",
            "created_by": "Test"
        })
        assert response.status_code == 200
        task = response.json()
        assert task["title"] == "TEST_Task_API"
        tid = task["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/tasks/{tid}", json={
            "status": "done"
        })
        assert response.status_code == 200
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/tasks/{tid}")
        assert response.status_code == 200


class TestIdeasAPI:
    """Ideas CRUD tests"""
    
    def test_get_ideas(self):
        response = requests.get(f"{BASE_URL}/api/ideas")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_update_delete_idea(self):
        # Create
        response = requests.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Idea_API",
            "description": "Test idea",
            "category": "marketing",
            "priority": True,
            "created_by": "Test"
        })
        assert response.status_code == 200
        idea = response.json()
        assert idea["title"] == "TEST_Idea_API"
        iid = idea["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/ideas/{iid}", json={
            "priority": False
        })
        assert response.status_code == 200
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/ideas/{iid}")
        assert response.status_code == 200


class TestShopifyTikTokConfigsAPI:
    """Shopify and TikTok configs tests"""
    
    def test_get_shopify_configs(self):
        response = requests.get(f"{BASE_URL}/api/shopify-configs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_get_tiktok_configs(self):
        response = requests.get(f"{BASE_URL}/api/tiktok-configs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
