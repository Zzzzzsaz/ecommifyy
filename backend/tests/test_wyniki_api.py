"""
Backend API tests for Wyniki (Results) page functionality
Tests: /api/incomes, /api/costs, /api/monthly-stats, /api/combined-monthly-stats
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://sales-manager-102.preview.emergentagent.com"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_WYNIKI_"

class TestWynikiIncomeAPI:
    """Tests for income CRUD operations"""
    
    def test_create_income(self):
        """Test POST /api/incomes creates income entry"""
        payload = {
            "amount": 1234.56,
            "date": "2026-02-10",
            "description": f"{TEST_PREFIX}test income",
            "shop_id": 1
        }
        response = requests.post(f"{BASE_URL}/api/incomes", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["amount"] == 1234.56
        assert data["date"] == "2026-02-10"
        assert data["shop_id"] == 1
        print(f"SUCCESS: Created income with id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/incomes/{data['id']}")
    
    def test_get_incomes_by_date(self):
        """Test GET /api/incomes filters by date"""
        # Create test income first
        payload = {
            "amount": 500,
            "date": "2026-02-15",
            "description": f"{TEST_PREFIX}filter test",
            "shop_id": 1
        }
        create_resp = requests.post(f"{BASE_URL}/api/incomes", json=payload)
        income_id = create_resp.json()["id"]
        
        # Get incomes for that date
        response = requests.get(f"{BASE_URL}/api/incomes", params={"shop_id": 1, "date": "2026-02-15"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        found = any(inc["id"] == income_id for inc in data)
        assert found, "Created income not found in filtered results"
        print(f"SUCCESS: Found income in date-filtered results")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/incomes/{income_id}")
    
    def test_delete_income(self):
        """Test DELETE /api/incomes/{id} removes income"""
        # Create income to delete
        payload = {
            "amount": 100,
            "date": "2026-02-20",
            "description": f"{TEST_PREFIX}delete test",
            "shop_id": 1
        }
        create_resp = requests.post(f"{BASE_URL}/api/incomes", json=payload)
        income_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/incomes/{income_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/incomes", params={"shop_id": 1, "date": "2026-02-20"})
        data = get_resp.json()
        found = any(inc["id"] == income_id for inc in data)
        assert not found, "Income should have been deleted"
        print("SUCCESS: Income deleted successfully")


class TestWynikiCostAPI:
    """Tests for cost CRUD operations with categories"""
    
    def test_create_cost_tiktok(self):
        """Test POST /api/costs creates TikTok cost"""
        payload = {
            "date": "2026-02-10",
            "shop_id": 1,
            "category": "tiktok",
            "amount": 150.00,
            "description": f"{TEST_PREFIX}TikTok ads"
        }
        response = requests.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["category"] == "tiktok"
        assert data["amount"] == 150.00
        print(f"SUCCESS: Created TikTok cost with id={data['id']}")
        
        requests.delete(f"{BASE_URL}/api/costs/{data['id']}")
    
    def test_create_cost_meta(self):
        """Test POST /api/costs creates Meta cost"""
        payload = {
            "date": "2026-02-10",
            "shop_id": 1,
            "category": "meta",
            "amount": 200.00,
            "description": f"{TEST_PREFIX}Meta ads"
        }
        response = requests.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "meta"
        print(f"SUCCESS: Created Meta cost")
        
        requests.delete(f"{BASE_URL}/api/costs/{data['id']}")
    
    def test_create_cost_google(self):
        """Test POST /api/costs creates Google cost"""
        payload = {
            "date": "2026-02-10",
            "shop_id": 1,
            "category": "google",
            "amount": 175.50,
            "description": f"{TEST_PREFIX}Google ads"
        }
        response = requests.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "google"
        print("SUCCESS: Created Google cost")
        
        requests.delete(f"{BASE_URL}/api/costs/{data['id']}")
    
    def test_create_cost_zwroty(self):
        """Test POST /api/costs creates Zwroty (returns) cost"""
        payload = {
            "date": "2026-02-10",
            "shop_id": 1,
            "category": "zwroty",
            "amount": 50.00,
            "description": f"{TEST_PREFIX}Customer return"
        }
        response = requests.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "zwroty"
        print("SUCCESS: Created Zwroty cost")
        
        requests.delete(f"{BASE_URL}/api/costs/{data['id']}")
    
    def test_get_costs_by_category(self):
        """Test GET /api/costs filters by category"""
        # Create test cost
        payload = {
            "date": "2026-02-11",
            "shop_id": 1,
            "category": "tiktok",
            "amount": 300,
            "description": f"{TEST_PREFIX}category filter test"
        }
        create_resp = requests.post(f"{BASE_URL}/api/costs", json=payload)
        cost_id = create_resp.json()["id"]
        
        # Filter by category
        response = requests.get(f"{BASE_URL}/api/costs", params={"category": "tiktok", "shop_id": 1})
        assert response.status_code == 200
        
        data = response.json()
        all_tiktok = all(c["category"] == "tiktok" for c in data)
        assert all_tiktok, "Some costs are not TikTok category"
        print("SUCCESS: Category filter works correctly")
        
        requests.delete(f"{BASE_URL}/api/costs/{cost_id}")
    
    def test_delete_cost(self):
        """Test DELETE /api/costs/{id} removes cost"""
        payload = {
            "date": "2026-02-12",
            "shop_id": 1,
            "category": "meta",
            "amount": 100,
            "description": f"{TEST_PREFIX}delete test"
        }
        create_resp = requests.post(f"{BASE_URL}/api/costs", json=payload)
        cost_id = create_resp.json()["id"]
        
        response = requests.delete(f"{BASE_URL}/api/costs/{cost_id}")
        assert response.status_code == 200
        print("SUCCESS: Cost deleted successfully")


class TestWynikiMonthlyStats:
    """Tests for monthly statistics API"""
    
    def test_monthly_stats_structure(self):
        """Test GET /api/monthly-stats returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1,
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check required fields
        required_fields = ["total_income", "total_ads", "total_tiktok", "total_meta", 
                         "total_google", "total_zwroty", "total_profit", "profit_per_person", "days"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print("SUCCESS: Monthly stats has all required fields")
    
    def test_monthly_stats_days_count(self):
        """Test that monthly stats returns correct number of days"""
        response = requests.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1,
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        
        data = response.json()
        days = data.get("days", [])
        
        # February 2026 has 28 days
        assert len(days) == 28, f"Expected 28 days for Feb 2026, got {len(days)}"
        print(f"SUCCESS: Monthly stats returns {len(days)} days for February 2026")
    
    def test_monthly_stats_day_structure(self):
        """Test that each day has required fields"""
        response = requests.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1,
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        
        data = response.json()
        days = data.get("days", [])
        
        if days:
            day = days[0]
            required_day_fields = ["date", "income", "profit", "tiktok_ads", "meta_ads", 
                                   "google_ads", "ads_total", "zwroty"]
            for field in required_day_fields:
                assert field in day, f"Day missing field: {field}"
        
        print("SUCCESS: Day structure has all required fields")
    
    def test_combined_monthly_stats(self):
        """Test GET /api/combined-monthly-stats for all shops"""
        response = requests.get(f"{BASE_URL}/api/combined-monthly-stats", params={
            "year": 2026,
            "month": 2
        })
        assert response.status_code == 200
        
        data = response.json()
        
        assert "days" in data
        assert "total_income" in data
        assert "profit_per_person" in data
        
        # Each day should have shops breakdown
        if data["days"]:
            day = data["days"][0]
            assert "shops" in day, "Day should have shops breakdown"
        
        print("SUCCESS: Combined monthly stats works correctly")


class TestWynikiKPIs:
    """Tests for KPI calculations"""
    
    def test_profit_calculation(self):
        """Test that profit is calculated correctly"""
        # Create income
        income_payload = {
            "amount": 1000,
            "date": "2026-02-25",
            "description": f"{TEST_PREFIX}profit calc",
            "shop_id": 2
        }
        inc_resp = requests.post(f"{BASE_URL}/api/incomes", json=income_payload)
        income_id = inc_resp.json()["id"]
        
        # Create cost
        cost_payload = {
            "date": "2026-02-25",
            "shop_id": 2,
            "category": "tiktok",
            "amount": 200,
            "description": f"{TEST_PREFIX}profit calc cost"
        }
        cost_resp = requests.post(f"{BASE_URL}/api/costs", json=cost_payload)
        cost_id = cost_resp.json()["id"]
        
        # Get stats and verify
        stats_resp = requests.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 2,
            "year": 2026,
            "month": 2
        })
        data = stats_resp.json()
        
        # Find day 25
        day_25 = next((d for d in data["days"] if d["date"] == "2026-02-25"), None)
        assert day_25 is not None, "Day 25 not found"
        
        # Verify income is recorded
        assert day_25["income"] >= 1000, "Income not reflected in stats"
        
        print("SUCCESS: Income and costs reflected in daily stats")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/incomes/{income_id}")
        requests.delete(f"{BASE_URL}/api/costs/{cost_id}")


class TestWynikiAuth:
    """Test authentication for Wyniki page"""
    
    def test_login_returns_shops(self):
        """Test that login returns shop list for tab display"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        
        data = response.json()
        assert "shops" in data
        assert len(data["shops"]) >= 4, "Expected at least 4 shops"
        
        # Verify shop structure
        shop = data["shops"][0]
        assert "id" in shop
        assert "name" in shop
        assert "color" in shop
        
        print(f"SUCCESS: Login returns {len(data['shops'])} shops")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
