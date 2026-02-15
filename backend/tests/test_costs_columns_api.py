"""
Test suite for new Costs and Custom Columns endpoints:
- /api/costs - CRUD for categorized costs (tiktok, meta, google, zwroty, inne)
- /api/custom-columns - CRUD for user-defined columns
- /api/monthly-stats - Verify profit_per_person and categorized costs returned
- /api/combined-monthly-stats - Verify same data for all shops
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestCostsAPI:
    """Tests for /api/costs endpoint - categorized costs CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_date = "2026-01-15"
        self.test_shop_id = 1
        self.created_ids = []
        yield
        # Cleanup
        for cost_id in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/costs/{cost_id}")
            except:
                pass
    
    def test_get_costs_empty(self):
        """GET /api/costs returns empty list or existing costs"""
        response = self.session.get(f"{BASE_URL}/api/costs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: GET /api/costs returns list")
    
    def test_create_tiktok_cost(self):
        """POST /api/costs creates TikTok cost"""
        payload = {
            "date": self.test_date,
            "shop_id": self.test_shop_id,
            "category": "tiktok",
            "amount": 150.50,
            "description": "TEST_tiktok_campaign"
        }
        response = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["category"] == "tiktok"
        assert data["amount"] == 150.50
        assert data["shop_id"] == self.test_shop_id
        assert data["date"] == self.test_date
        self.created_ids.append(data["id"])
        print(f"PASS: Created TikTok cost with id={data['id']}")
    
    def test_create_meta_cost(self):
        """POST /api/costs creates Meta cost"""
        payload = {
            "date": self.test_date,
            "shop_id": self.test_shop_id,
            "category": "meta",
            "amount": 250.00,
            "description": "TEST_meta_ads"
        }
        response = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["category"] == "meta"
        assert data["amount"] == 250.00
        self.created_ids.append(data["id"])
        print(f"PASS: Created Meta cost with id={data['id']}")
    
    def test_create_google_cost(self):
        """POST /api/costs creates Google cost"""
        payload = {
            "date": self.test_date,
            "shop_id": self.test_shop_id,
            "category": "google",
            "amount": 100.00,
            "description": "TEST_google_ads"
        }
        response = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["category"] == "google"
        assert data["amount"] == 100.00
        self.created_ids.append(data["id"])
        print(f"PASS: Created Google cost with id={data['id']}")
    
    def test_create_zwroty_cost(self):
        """POST /api/costs creates Zwroty (returns) cost"""
        payload = {
            "date": self.test_date,
            "shop_id": self.test_shop_id,
            "category": "zwroty",
            "amount": 75.00,
            "description": "TEST_refund"
        }
        response = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["category"] == "zwroty"
        assert data["amount"] == 75.00
        self.created_ids.append(data["id"])
        print(f"PASS: Created Zwroty cost with id={data['id']}")
    
    def test_get_costs_by_shop_and_date(self):
        """GET /api/costs with shop_id and date filters"""
        # Create a cost first
        payload = {
            "date": "2026-01-16",
            "shop_id": 2,
            "category": "tiktok",
            "amount": 200.00,
            "description": "TEST_filter_test"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        data = create_resp.json()
        self.created_ids.append(data["id"])
        
        # Filter by shop_id
        response = self.session.get(f"{BASE_URL}/api/costs", params={"shop_id": 2})
        assert response.status_code == 200
        costs = response.json()
        assert len(costs) >= 1
        assert any(c["shop_id"] == 2 for c in costs)
        print("PASS: GET /api/costs filters by shop_id")
        
        # Filter by date
        response = self.session.get(f"{BASE_URL}/api/costs", params={"date": "2026-01-16"})
        assert response.status_code == 200
        costs = response.json()
        assert any(c["date"] == "2026-01-16" for c in costs)
        print("PASS: GET /api/costs filters by date")
    
    def test_get_costs_by_year_month(self):
        """GET /api/costs with year and month filter"""
        # Create a cost
        payload = {
            "date": "2026-02-10",
            "shop_id": 1,
            "category": "meta",
            "amount": 300.00,
            "description": "TEST_feb_cost"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        data = create_resp.json()
        self.created_ids.append(data["id"])
        
        # Filter by year/month
        response = self.session.get(f"{BASE_URL}/api/costs", params={"year": 2026, "month": 2})
        assert response.status_code == 200
        costs = response.json()
        assert any(c["date"].startswith("2026-02") for c in costs)
        print("PASS: GET /api/costs filters by year/month")
    
    def test_get_costs_by_category(self):
        """GET /api/costs with category filter"""
        # Create a google cost
        payload = {
            "date": "2026-01-20",
            "shop_id": 1,
            "category": "google",
            "amount": 50.00,
            "description": "TEST_category_filter"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        data = create_resp.json()
        self.created_ids.append(data["id"])
        
        response = self.session.get(f"{BASE_URL}/api/costs", params={"category": "google"})
        assert response.status_code == 200
        costs = response.json()
        assert all(c["category"] == "google" for c in costs)
        print("PASS: GET /api/costs filters by category")
    
    def test_update_cost(self):
        """PUT /api/costs/{id} updates cost"""
        # Create
        payload = {
            "date": "2026-01-21",
            "shop_id": 1,
            "category": "tiktok",
            "amount": 100.00,
            "description": "TEST_to_update"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        data = create_resp.json()
        cost_id = data["id"]
        self.created_ids.append(cost_id)
        
        # Update
        update_payload = {"amount": 200.00, "description": "TEST_updated"}
        response = self.session.put(f"{BASE_URL}/api/costs/{cost_id}", json=update_payload)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["amount"] == 200.00
        assert updated["description"] == "TEST_updated"
        print(f"PASS: PUT /api/costs/{cost_id} updates amount and description")
    
    def test_update_nonexistent_cost(self):
        """PUT /api/costs/{invalid_id} returns 404"""
        response = self.session.put(f"{BASE_URL}/api/costs/nonexistent-id", json={"amount": 100})
        assert response.status_code == 404
        print("PASS: PUT /api/costs/invalid returns 404")
    
    def test_delete_cost(self):
        """DELETE /api/costs/{id} removes cost"""
        # Create
        payload = {
            "date": "2026-01-22",
            "shop_id": 1,
            "category": "meta",
            "amount": 50.00,
            "description": "TEST_to_delete"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/costs", json=payload)
        data = create_resp.json()
        cost_id = data["id"]
        
        # Delete
        response = self.session.delete(f"{BASE_URL}/api/costs/{cost_id}")
        assert response.status_code == 200
        assert response.json().get("status") == "ok"
        
        # Verify deleted - get all and check not present
        get_resp = self.session.get(f"{BASE_URL}/api/costs", params={"date": "2026-01-22"})
        costs = get_resp.json()
        assert not any(c["id"] == cost_id for c in costs)
        print(f"PASS: DELETE /api/costs/{cost_id} removed cost")


class TestCustomColumnsAPI:
    """Tests for /api/custom-columns endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = []
        yield
        # Cleanup
        for col_id in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/custom-columns/{col_id}")
            except:
                pass
    
    def test_get_custom_columns(self):
        """GET /api/custom-columns returns list"""
        response = self.session.get(f"{BASE_URL}/api/custom-columns")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: GET /api/custom-columns returns list")
    
    def test_create_expense_column(self):
        """POST /api/custom-columns creates expense type column"""
        payload = {
            "name": "TEST_Influencerzy",
            "column_type": "expense",
            "color": "#ff6b6b"
        }
        response = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_Influencerzy"
        assert data["column_type"] == "expense"
        assert data["color"] == "#ff6b6b"
        self.created_ids.append(data["id"])
        print(f"PASS: Created expense column with id={data['id']}")
    
    def test_create_income_column(self):
        """POST /api/custom-columns creates income type column"""
        payload = {
            "name": "TEST_Sponsoring",
            "column_type": "income",
            "color": "#10b981"
        }
        response = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Sponsoring"
        assert data["column_type"] == "income"
        self.created_ids.append(data["id"])
        print(f"PASS: Created income column with id={data['id']}")
    
    def test_create_duplicate_column_fails(self):
        """POST /api/custom-columns with duplicate name returns 400"""
        payload = {
            "name": "TEST_DuplicateCol",
            "column_type": "expense",
            "color": "#888888"
        }
        # Create first
        resp1 = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        assert resp1.status_code == 200
        self.created_ids.append(resp1.json()["id"])
        
        # Try duplicate
        resp2 = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        assert resp2.status_code == 400
        print("PASS: Duplicate column name returns 400")
    
    def test_update_custom_column(self):
        """PUT /api/custom-columns/{id} updates column"""
        # Create
        payload = {
            "name": "TEST_ToUpdate",
            "column_type": "expense",
            "color": "#888888"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        data = create_resp.json()
        col_id = data["id"]
        self.created_ids.append(col_id)
        
        # Update
        update_payload = {"color": "#ff0000", "column_type": "income"}
        response = self.session.put(f"{BASE_URL}/api/custom-columns/{col_id}", json=update_payload)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["color"] == "#ff0000"
        assert updated["column_type"] == "income"
        print(f"PASS: PUT /api/custom-columns/{col_id} updates column")
    
    def test_delete_custom_column(self):
        """DELETE /api/custom-columns/{id} removes column"""
        # Create column
        payload = {
            "name": "TEST_ToDelete",
            "column_type": "expense",
            "color": "#888888"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/custom-columns", json=payload)
        col_id = create_resp.json()["id"]
        
        # Delete
        response = self.session.delete(f"{BASE_URL}/api/custom-columns/{col_id}")
        assert response.status_code == 200
        
        # Verify
        get_resp = self.session.get(f"{BASE_URL}/api/custom-columns")
        cols = get_resp.json()
        assert not any(c["id"] == col_id for c in cols)
        print(f"PASS: DELETE /api/custom-columns/{col_id} removed column")
    
    def test_delete_column_deletes_associated_costs(self):
        """DELETE /api/custom-columns also removes costs with that category"""
        # Create column
        col_payload = {
            "name": "TEST_ColWithCosts",
            "column_type": "expense",
            "color": "#888888"
        }
        col_resp = self.session.post(f"{BASE_URL}/api/custom-columns", json=col_payload)
        col_id = col_resp.json()["id"]
        col_name = col_resp.json()["name"]
        
        # Create cost with column name as category
        cost_payload = {
            "date": "2026-01-25",
            "shop_id": 1,
            "category": col_name,
            "amount": 100.00,
            "description": "TEST_associated_cost"
        }
        cost_resp = self.session.post(f"{BASE_URL}/api/costs", json=cost_payload)
        cost_id = cost_resp.json()["id"]
        
        # Delete column (should cascade delete costs)
        del_resp = self.session.delete(f"{BASE_URL}/api/custom-columns/{col_id}")
        assert del_resp.status_code == 200
        
        # Verify cost deleted
        costs = self.session.get(f"{BASE_URL}/api/costs", params={"category": col_name}).json()
        assert not any(c["id"] == cost_id for c in costs)
        print("PASS: DELETE column also removes associated costs")


class TestMonthlyStatsWithCosts:
    """Tests for /api/monthly-stats and /api/combined-monthly-stats with new cost fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_cost_ids = []
        self.created_col_ids = []
        yield
        # Cleanup
        for cost_id in self.created_cost_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/costs/{cost_id}")
            except:
                pass
        for col_id in self.created_col_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/custom-columns/{col_id}")
            except:
                pass
    
    def test_monthly_stats_returns_categorized_costs(self):
        """GET /api/monthly-stats includes tiktok_ads, meta_ads, google_ads, zwroty totals"""
        response = self.session.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1, "year": 2026, "month": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "total_tiktok" in data
        assert "total_meta" in data
        assert "total_google" in data
        assert "total_zwroty" in data
        assert "profit_per_person" in data
        assert "days" in data
        
        # Check day structure
        if data["days"]:
            day = data["days"][0]
            assert "tiktok_ads" in day
            assert "meta_ads" in day
            assert "google_ads" in day
            assert "zwroty" in day
            assert "profit_pp" in day  # per person profit per day
            assert "custom_costs" in day
        
        print("PASS: /api/monthly-stats returns categorized cost fields")
    
    def test_monthly_stats_profit_per_person(self):
        """GET /api/monthly-stats returns profit_per_person"""
        response = self.session.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1, "year": 2026, "month": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "profit_per_person" in data
        # profit_per_person should be total_profit / split (default 2)
        assert isinstance(data["profit_per_person"], (int, float))
        print(f"PASS: monthly-stats profit_per_person = {data['profit_per_person']}")
    
    def test_monthly_stats_includes_custom_columns(self):
        """GET /api/monthly-stats returns custom_columns list"""
        response = self.session.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1, "year": 2026, "month": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "custom_columns" in data
        assert isinstance(data["custom_columns"], list)
        print("PASS: monthly-stats includes custom_columns")
    
    def test_combined_stats_returns_categorized_costs(self):
        """GET /api/combined-monthly-stats includes all categorized costs"""
        response = self.session.get(f"{BASE_URL}/api/combined-monthly-stats", params={
            "year": 2026, "month": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check totals
        assert "total_tiktok" in data
        assert "total_meta" in data
        assert "total_google" in data
        assert "total_zwroty" in data
        assert "profit_per_person" in data
        assert "custom_columns" in data
        
        # Check day structure
        if data["days"]:
            day = data["days"][0]
            assert "tiktok_ads" in day
            assert "meta_ads" in day
            assert "google_ads" in day
            assert "zwroty" in day
            assert "shops" in day
            
            # Check per-shop breakdown
            if day["shops"]:
                shop_day = day["shops"][0]
                assert "tiktok_ads" in shop_day
                assert "meta_ads" in shop_day
                assert "google_ads" in shop_day
                assert "zwroty" in shop_day
                assert "profit_pp" in shop_day
        
        print("PASS: /api/combined-monthly-stats returns categorized costs and per-shop breakdown")
    
    def test_costs_aggregated_in_stats(self):
        """Create costs and verify they appear in monthly stats"""
        # Create a test cost
        cost_payload = {
            "date": "2026-03-15",
            "shop_id": 1,
            "category": "tiktok",
            "amount": 500.00,
            "description": "TEST_stats_aggregation"
        }
        cost_resp = self.session.post(f"{BASE_URL}/api/costs", json=cost_payload)
        self.created_cost_ids.append(cost_resp.json()["id"])
        
        # Get monthly stats
        stats_resp = self.session.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1, "year": 2026, "month": 3
        })
        data = stats_resp.json()
        
        assert data["total_tiktok"] >= 500.00
        
        # Check specific day
        day_15 = next((d for d in data["days"] if d["date"] == "2026-03-15"), None)
        assert day_15 is not None
        assert day_15["tiktok_ads"] >= 500.00
        
        print("PASS: Costs are correctly aggregated in monthly stats")
    
    def test_custom_column_costs_in_stats(self):
        """Create custom column and verify costs appear in stats"""
        # Create custom column
        col_payload = {
            "name": "TEST_StatsCustom",
            "column_type": "expense",
            "color": "#ff0000"
        }
        col_resp = self.session.post(f"{BASE_URL}/api/custom-columns", json=col_payload)
        col_data = col_resp.json()
        self.created_col_ids.append(col_data["id"])
        
        # Create cost with custom category
        cost_payload = {
            "date": "2026-03-20",
            "shop_id": 1,
            "category": "TEST_StatsCustom",
            "amount": 250.00,
            "description": "TEST_custom_category_cost"
        }
        cost_resp = self.session.post(f"{BASE_URL}/api/costs", json=cost_payload)
        self.created_cost_ids.append(cost_resp.json()["id"])
        
        # Get stats
        stats_resp = self.session.get(f"{BASE_URL}/api/monthly-stats", params={
            "shop_id": 1, "year": 2026, "month": 3
        })
        data = stats_resp.json()
        
        # Check custom column appears
        assert "custom_columns" in data
        assert any(c["name"] == "TEST_StatsCustom" for c in data["custom_columns"])
        
        # Check total_custom
        assert "total_custom" in data
        assert "TEST_StatsCustom" in data["total_custom"]
        assert data["total_custom"]["TEST_StatsCustom"] >= 250.00
        
        # Check day data
        day_20 = next((d for d in data["days"] if d["date"] == "2026-03-20"), None)
        assert day_20 is not None
        assert "custom_costs" in day_20
        assert day_20["custom_costs"]["TEST_StatsCustom"] >= 250.00
        
        print("PASS: Custom column costs appear in monthly stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
