"""
Backend API tests for Ecommify E-commerce Dashboard
Tests: Login, Ideas, Tasks, Costs, Shops, Stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecommerce-dash-11.preview.emergentagent.com')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Health check tests"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")


class TestAuthentication:
    """Authentication tests with PIN login"""
    
    def test_login_with_valid_pin_admin(self, api_client):
        """Test login with Admin PIN 2409"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["name"] == "Admin"
        assert data["user"]["role"] == "admin"
        assert "shops" in data
        assert "settings" in data
        print(f"✓ Login successful for Admin (PIN 2409)")
    
    def test_login_with_invalid_pin(self, api_client):
        """Test login with invalid PIN"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={"pin": "0000"})
        assert response.status_code == 401
        print("✓ Invalid PIN correctly rejected")


class TestShops:
    """Shop management tests"""
    
    def test_get_shops(self, api_client):
        """Test getting shops list"""
        response = api_client.get(f"{BASE_URL}/api/shops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Default shops
        print(f"✓ Got {len(data)} shops")
        for shop in data[:4]:
            assert "id" in shop
            assert "name" in shop
            assert "color" in shop


class TestIdeas:
    """Ideas CRUD tests"""
    
    def test_create_idea(self, api_client):
        """Test creating a new idea"""
        idea_data = {
            "title": "TEST_Idea_API",
            "description": "Test idea from pytest",
            "category": "produkt",
            "link": "https://example.com",
            "priority": True,
            "created_by": "pytest"
        }
        response = api_client.post(f"{BASE_URL}/api/ideas", json=idea_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == idea_data["title"]
        assert "id" in data
        print(f"✓ Created idea: {data['id']}")
        return data["id"]
    
    def test_get_ideas(self, api_client):
        """Test getting ideas list"""
        response = api_client.get(f"{BASE_URL}/api/ideas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} ideas")
    
    def test_update_idea(self, api_client):
        """Test updating an idea"""
        # First create an idea
        create_resp = api_client.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Update_Idea",
            "description": "Original",
            "category": "inne",
            "created_by": "pytest"
        })
        idea_id = create_resp.json()["id"]
        
        # Update it
        update_resp = api_client.put(f"{BASE_URL}/api/ideas/{idea_id}", json={
            "title": "TEST_Update_Idea_Modified",
            "priority": True
        })
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["title"] == "TEST_Update_Idea_Modified"
        assert data["priority"] == True
        print(f"✓ Updated idea: {idea_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/ideas/{idea_id}")
    
    def test_delete_idea(self, api_client):
        """Test deleting an idea"""
        # Create an idea to delete
        create_resp = api_client.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Delete_Idea",
            "category": "inne",
            "created_by": "pytest"
        })
        idea_id = create_resp.json()["id"]
        
        # Delete it
        delete_resp = api_client.delete(f"{BASE_URL}/api/ideas/{idea_id}")
        assert delete_resp.status_code == 200
        print(f"✓ Deleted idea: {idea_id}")


class TestTasks:
    """Tasks CRUD tests"""
    
    def test_create_task(self, api_client):
        """Test creating a new task"""
        task_data = {
            "title": "TEST_Task_API",
            "description": "Test task from pytest",
            "assigned_to": "oboje",
            "due_date": "2026-02-28",
            "created_by": "pytest"
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == task_data["title"]
        assert "id" in data
        assert data["status"] == "todo"
        print(f"✓ Created task: {data['id']}")
        return data["id"]
    
    def test_get_tasks(self, api_client):
        """Test getting tasks list"""
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} tasks")
    
    def test_update_task_status(self, api_client):
        """Test updating task status to done"""
        # Create task
        create_resp = api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Status_Task",
            "assigned_to": "kacper"
        })
        task_id = create_resp.json()["id"]
        
        # Update status
        update_resp = api_client.put(f"{BASE_URL}/api/tasks/{task_id}", json={
            "status": "done"
        })
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "done"
        print(f"✓ Updated task status to done: {task_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}")
    
    def test_delete_task(self, api_client):
        """Test deleting a task"""
        create_resp = api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Delete_Task"
        })
        task_id = create_resp.json()["id"]
        
        delete_resp = api_client.delete(f"{BASE_URL}/api/tasks/{task_id}")
        assert delete_resp.status_code == 200
        print(f"✓ Deleted task: {task_id}")


class TestCosts:
    """Costs CRUD tests"""
    
    def test_create_cost(self, api_client):
        """Test creating a new cost entry"""
        cost_data = {
            "date": "2026-02-23",
            "shop_id": 1,
            "category": "tiktok",
            "amount": 150.50,
            "description": "TEST cost from pytest"
        }
        response = api_client.post(f"{BASE_URL}/api/costs", json=cost_data)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 150.50
        assert data["category"] == "tiktok"
        assert "id" in data
        print(f"✓ Created cost: {data['id']}")
        return data["id"]
    
    def test_get_costs(self, api_client):
        """Test getting costs list"""
        response = api_client.get(f"{BASE_URL}/api/costs", params={"shop_id": 1})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} costs for shop 1")


class TestReminders:
    """Reminders CRUD tests"""
    
    def test_create_reminder(self, api_client):
        """Test creating a new reminder"""
        reminder_data = {
            "title": "TEST_Reminder_API",
            "date": "2026-02-28",
            "created_by": "pytest"
        }
        response = api_client.post(f"{BASE_URL}/api/reminders", json=reminder_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == reminder_data["title"]
        assert data["done"] == False
        assert "id" in data
        print(f"✓ Created reminder: {data['id']}")
        return data["id"]
    
    def test_get_reminders(self, api_client):
        """Test getting reminders list"""
        response = api_client.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} reminders")
    
    def test_mark_reminder_done(self, api_client):
        """Test marking reminder as done"""
        # Create reminder
        create_resp = api_client.post(f"{BASE_URL}/api/reminders", json={
            "title": "TEST_Done_Reminder",
            "date": "2026-02-23"
        })
        reminder_id = create_resp.json()["id"]
        
        # Mark as done
        update_resp = api_client.put(f"{BASE_URL}/api/reminders/{reminder_id}", json={
            "done": True
        })
        assert update_resp.status_code == 200
        assert update_resp.json()["done"] == True
        print(f"✓ Marked reminder as done: {reminder_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/reminders/{reminder_id}")


class TestProducts:
    """Products CRUD tests"""
    
    def test_create_product(self, api_client):
        """Test creating a new product"""
        product_data = {
            "name": "TEST_Product_API",
            "sku": "TEST-001",
            "price": 99.99,
            "extra_payment": 15.00,
            "shop_id": 1,
            "category": "test"
        }
        response = api_client.post(f"{BASE_URL}/api/products", json=product_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["extra_payment"] == 15.00
        assert "id" in data
        print(f"✓ Created product: {data['id']}")
        return data["id"]
    
    def test_get_products(self, api_client):
        """Test getting products list"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} products")


class TestMonthlyStats:
    """Monthly stats tests"""
    
    def test_get_combined_monthly_stats(self, api_client):
        """Test getting combined monthly stats"""
        response = api_client.get(f"{BASE_URL}/api/combined-monthly-stats", params={
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_income" in data
        assert "total_profit" in data
        assert "days" in data
        assert isinstance(data["days"], list)
        print(f"✓ Got combined stats: income={data['total_income']}, profit={data['total_profit']}")
    
    def test_get_shop_monthly_stats(self, api_client):
        """Test getting monthly stats for specific shop"""
        response = api_client.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1,
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert "shop_id" in data
        assert data["shop_id"] == 1
        assert "days" in data
        print(f"✓ Got shop 1 stats: income={data['total_income']}")


class TestSync:
    """Sync functionality tests"""
    
    def test_sync_all(self, api_client):
        """Test sync all endpoint (MOCKED - no real Shopify/TikTok)"""
        response = api_client.post(f"{BASE_URL}/api/sync/all", params={
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert "shopify" in data
        assert "tiktok" in data
        print(f"✓ Sync all completed: shopify={len(data['shopify'])}, tiktok={len(data['tiktok'])}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, api_client):
        """Clean up TEST_ prefixed data"""
        # Get and delete test ideas
        ideas = api_client.get(f"{BASE_URL}/api/ideas").json()
        for idea in ideas:
            if idea.get("title", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/ideas/{idea['id']}")
                print(f"  Deleted test idea: {idea['title']}")
        
        # Get and delete test tasks
        tasks = api_client.get(f"{BASE_URL}/api/tasks").json()
        for task in tasks:
            if task.get("title", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/tasks/{task['id']}")
                print(f"  Deleted test task: {task['title']}")
        
        # Get and delete test products
        products = api_client.get(f"{BASE_URL}/api/products").json()
        for product in products:
            if product.get("name", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/products/{product['id']}")
                print(f"  Deleted test product: {product['name']}")
        
        # Get and delete test reminders
        reminders = api_client.get(f"{BASE_URL}/api/reminders").json()
        for reminder in reminders:
            if reminder.get("title", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/reminders/{reminder['id']}")
                print(f"  Deleted test reminder: {reminder['title']}")
        
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
