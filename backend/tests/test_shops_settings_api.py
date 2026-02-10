"""
Backend API tests for Ecommify Campaign Calculator - Dynamic Shops & Settings

Tests:
- Login with PIN returns shops and settings
- Dynamic shops CRUD (create, read, update, delete)
- App settings CRUD
- Orders page uses dynamic shops
- Sales records (ewidencja) uses dynamic shops
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ===== AUTH TESTS =====
class TestAuth:
    """Login returns shops and settings in response"""

    def test_login_returns_user_shops_settings(self):
        """Login with PIN 2409 returns user, shops, and settings"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check user
        assert "user" in data, "Response should contain user"
        assert data["user"]["name"] == "Admin"
        assert data["user"]["role"] == "admin"
        
        # Check shops
        assert "shops" in data, "Response should contain shops"
        assert isinstance(data["shops"], list)
        assert len(data["shops"]) >= 1, "Should have at least 1 shop"
        
        # Verify shop structure
        shop = data["shops"][0]
        assert "id" in shop
        assert "name" in shop
        assert "color" in shop
        
        # Check settings
        assert "settings" in data, "Response should contain settings"
        assert "target_revenue" in data["settings"]
        assert "profit_split" in data["settings"]
        assert "vat_rate" in data["settings"]
        
        print(f"Login successful: user={data['user']['name']}, shops={len(data['shops'])}, target={data['settings']['target_revenue']}")

    def test_login_invalid_pin(self):
        """Invalid PIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "0000"})
        assert response.status_code == 401


# ===== SHOPS CRUD TESTS =====
class TestShopsCRUD:
    """Dynamic shops management - CRUD operations"""

    def test_get_shops_list(self):
        """GET /api/shops returns list of shops (seeded with defaults)"""
        response = requests.get(f"{BASE_URL}/api/shops")
        assert response.status_code == 200
        
        shops = response.json()
        assert isinstance(shops, list)
        assert len(shops) >= 4, "Should have at least 4 default shops"
        
        # Verify default shops exist
        shop_names = [s["name"] for s in shops]
        for default in ["ecom1", "ecom2", "ecom3", "ecom4"]:
            assert default in shop_names, f"Default shop {default} should exist"
        
        print(f"GET /api/shops returned {len(shops)} shops: {shop_names}")

    def test_create_shop(self):
        """POST /api/shops creates new shop with auto-incremented ID"""
        # Create a test shop
        payload = {"name": "TEST_NewShop", "color": "#ff5733"}
        response = requests.post(f"{BASE_URL}/api/shops", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        shop = response.json()
        assert shop["name"] == "TEST_NewShop"
        assert shop["color"] == "#ff5733"
        assert "id" in shop, "Shop should have auto-generated ID"
        assert shop["id"] > 4, "New shop ID should be > 4 (after defaults)"
        assert shop["is_active"] == True
        
        # Verify persistence by GET
        get_response = requests.get(f"{BASE_URL}/api/shops")
        all_shops = get_response.json()
        created_shop = next((s for s in all_shops if s["name"] == "TEST_NewShop"), None)
        assert created_shop is not None, "Created shop should be in list"
        
        print(f"Created shop: id={shop['id']}, name={shop['name']}")
        return shop

    def test_update_shop(self):
        """PUT /api/shops/{id} updates shop name and color"""
        # First create a shop to update
        create_resp = requests.post(f"{BASE_URL}/api/shops", json={"name": "TEST_ToUpdate", "color": "#111111"})
        shop_id = create_resp.json()["id"]
        
        # Update it
        update_payload = {"name": "TEST_Updated", "color": "#00ff00"}
        response = requests.put(f"{BASE_URL}/api/shops/{shop_id}", json=update_payload)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["name"] == "TEST_Updated"
        assert updated["color"] == "#00ff00"
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/shops")
        all_shops = get_response.json()
        found = next((s for s in all_shops if s["id"] == shop_id), None)
        assert found["name"] == "TEST_Updated"
        
        print(f"Updated shop {shop_id}: name={updated['name']}, color={updated['color']}")

    def test_delete_shop(self):
        """DELETE /api/shops/{id} deletes a shop"""
        # Create a shop to delete
        create_resp = requests.post(f"{BASE_URL}/api/shops", json={"name": "TEST_ToDelete", "color": "#999999"})
        shop_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/shops/{shop_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        
        # Verify shop is gone
        get_response = requests.get(f"{BASE_URL}/api/shops")
        all_shops = get_response.json()
        deleted = next((s for s in all_shops if s["id"] == shop_id), None)
        assert deleted is None, "Deleted shop should not be in list"
        
        print(f"Deleted shop {shop_id}")


# ===== APP SETTINGS TESTS =====
class TestAppSettings:
    """App settings management"""

    def test_get_app_settings(self):
        """GET /api/app-settings returns current settings"""
        response = requests.get(f"{BASE_URL}/api/app-settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert "target_revenue" in settings
        assert "profit_split" in settings
        assert "vat_rate" in settings
        assert "currency" in settings
        
        print(f"App settings: target={settings['target_revenue']}, split={settings['profit_split']}, vat={settings['vat_rate']}%")

    def test_update_app_settings(self):
        """PUT /api/app-settings updates settings and persists"""
        # Get current settings
        current = requests.get(f"{BASE_URL}/api/app-settings").json()
        original_target = current.get("target_revenue", 250000)
        
        # Update with test values
        new_target = 300000
        payload = {
            "target_revenue": new_target,
            "profit_split": 3,
            "vat_rate": 23,
            "currency": "PLN",
            "app_name": "TEST_Ecommify"
        }
        response = requests.put(f"{BASE_URL}/api/app-settings", json=payload)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["target_revenue"] == new_target
        assert updated["profit_split"] == 3
        assert updated["app_name"] == "TEST_Ecommify"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/app-settings")
        persisted = get_response.json()
        assert persisted["target_revenue"] == new_target
        
        # Restore original
        restore_payload = {"target_revenue": original_target, "profit_split": 2, "vat_rate": 23, "currency": "PLN", "app_name": "Ecommify Campaign Calculator"}
        requests.put(f"{BASE_URL}/api/app-settings", json=restore_payload)
        
        print(f"Updated app settings: target={new_target}, split=3")


# ===== ORDERS WITH DYNAMIC SHOPS =====
class TestOrdersWithShops:
    """Orders use dynamic shops"""

    def test_create_order_with_shop_id(self):
        """Create order with dynamic shop_id"""
        # Get available shops
        shops_resp = requests.get(f"{BASE_URL}/api/shops")
        shops = shops_resp.json()
        shop_id = shops[0]["id"]
        
        # Create order
        payload = {
            "customer_name": "TEST_Customer",
            "total": 199.99,
            "date": "2026-01-15",
            "shop_id": shop_id,
            "items": [{"name": "Test Product", "quantity": 1, "price": 199.99}]
        }
        response = requests.post(f"{BASE_URL}/api/orders", json=payload)
        assert response.status_code == 200
        
        order = response.json()
        assert order["shop_id"] == shop_id
        assert order["total"] == 199.99
        assert "id" in order
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/orders/{order['id']}")
        
        print(f"Created order for shop_id={shop_id}")

    def test_get_orders_filter_by_shop(self):
        """Get orders filtered by shop_id"""
        response = requests.get(f"{BASE_URL}/api/orders", params={"year": 2026, "month": 1, "shop_id": 1})
        assert response.status_code == 200
        assert isinstance(response.json(), list)


# ===== SALES RECORDS (EWIDENCJA) WITH DYNAMIC SHOPS =====
class TestSalesRecordsWithShops:
    """Sales records use dynamic shops"""

    def test_create_sales_record_with_shop_id(self):
        """Create sales record with dynamic shop_id"""
        # Get available shops
        shops_resp = requests.get(f"{BASE_URL}/api/shops")
        shops = shops_resp.json()
        shop_id = shops[1]["id"] if len(shops) > 1 else shops[0]["id"]
        
        payload = {
            "date": "2026-01-15",
            "product_name": "TEST_Product",
            "quantity": 2,
            "netto": 81.30,
            "vat_rate": 23,
            "brutto": 100.00,
            "payment_method": "Card",
            "shop_id": shop_id
        }
        response = requests.post(f"{BASE_URL}/api/sales-records", json=payload)
        assert response.status_code == 200
        
        record = response.json()
        assert record["shop_id"] == shop_id
        assert record["brutto"] == 100.00
        assert "id" in record
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/sales-records/{record['id']}")
        
        print(f"Created sales record for shop_id={shop_id}")


# ===== COMPANY SETTINGS =====
class TestCompanySettings:
    """Company settings for ewidencja"""

    def test_get_company_settings(self):
        """GET /api/company-settings returns company data"""
        response = requests.get(f"{BASE_URL}/api/company-settings")
        assert response.status_code == 200
        # May be empty initially
        data = response.json()
        assert isinstance(data, dict)

    def test_update_company_settings(self):
        """PUT /api/company-settings updates company data"""
        payload = {
            "name": "TEST Company Sp. z o.o.",
            "nip": "PL1234567890",
            "address": "Test Street 123",
            "city": "Krakow",
            "postal_code": "31-000"
        }
        response = requests.put(f"{BASE_URL}/api/company-settings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST Company Sp. z o.o."
        assert data["nip"] == "PL1234567890"
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/company-settings")
        persisted = get_resp.json()
        assert persisted["name"] == "TEST Company Sp. z o.o."
        
        print("Company settings updated and persisted")


# ===== SHOPIFY & TIKTOK CONFIGS =====
class TestIntegrationsConfig:
    """Shopify and TikTok configurations"""

    def test_get_shopify_configs(self):
        """GET /api/shopify-configs returns list"""
        response = requests.get(f"{BASE_URL}/api/shopify-configs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_save_shopify_config(self):
        """POST /api/shopify-configs saves config for shop"""
        # Get shops
        shops = requests.get(f"{BASE_URL}/api/shops").json()
        shop_id = shops[0]["id"]
        
        payload = {
            "shop_id": shop_id,
            "store_url": "test-store.myshopify.com",
            "api_token": "test_token_12345"
        }
        response = requests.post(f"{BASE_URL}/api/shopify-configs", json=payload)
        assert response.status_code == 200
        
        config = response.json()
        assert config["shop_id"] == shop_id
        assert config["store_url"] == "test-store.myshopify.com"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/shopify-configs/{shop_id}")
        
        print(f"Saved Shopify config for shop_id={shop_id}")

    def test_get_tiktok_configs(self):
        """GET /api/tiktok-configs returns list"""
        response = requests.get(f"{BASE_URL}/api/tiktok-configs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


# ===== CLEANUP HELPER =====
@pytest.fixture(autouse=True, scope="session")
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Delete test shops
    try:
        shops = requests.get(f"{BASE_URL}/api/shops").json()
        for shop in shops:
            if shop["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/shops/{shop['id']}")
                print(f"Cleaned up shop: {shop['name']}")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
