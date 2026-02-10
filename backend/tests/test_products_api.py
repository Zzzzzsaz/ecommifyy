"""
Tests for Products API endpoints (/api/products)
Features tested:
- CRUD operations for products (GET, POST, PUT, DELETE)
- Extra payment calculation when creating orders
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecommerce-dashboard-9.preview.emergentagent.com').rstrip('/')


class TestProductsAPI:
    """Test suite for /api/products endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data prefix for cleanup"""
        self.test_prefix = "TEST_PRODUCTS_"
    
    def test_get_products_empty_or_list(self):
        """GET /api/products should return list of products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/products returns list with {len(data)} products")
    
    def test_create_product_success(self):
        """POST /api/products should create a new product"""
        payload = {
            "name": f"{self.test_prefix}Bluza Premium",
            "sku": f"TEST-{uuid.uuid4().hex[:6].upper()}",
            "price": 199.99,
            "extra_payment": 35.00,
            "shop_id": 1,
            "category": "Odziez"
        }
        response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["sku"] == payload["sku"]
        assert data["price"] == payload["price"]
        assert data["extra_payment"] == payload["extra_payment"]
        assert data["shop_id"] == payload["shop_id"]
        assert data["category"] == payload["category"]
        print(f"✓ POST /api/products creates product with id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{data['id']}")
    
    def test_create_product_minimal(self):
        """POST /api/products with minimal data (only name and shop_id)"""
        payload = {
            "name": f"{self.test_prefix}Minimal Product",
            "shop_id": 1
        }
        response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["price"] == 0  # Default
        assert data["extra_payment"] == 0  # Default
        print(f"✓ POST /api/products works with minimal data")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{data['id']}")
    
    def test_get_products_by_shop_id(self):
        """GET /api/products?shop_id=1 should filter by shop"""
        # Create product for shop 1
        product1 = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}Shop1 Product",
            "shop_id": 1,
            "extra_payment": 10
        }).json()
        
        # Create product for shop 2
        product2 = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}Shop2 Product",
            "shop_id": 2,
            "extra_payment": 20
        }).json()
        
        # Filter by shop_id=1
        response = requests.get(f"{BASE_URL}/api/products?shop_id=1")
        assert response.status_code == 200
        data = response.json()
        
        # All returned products should have shop_id=1
        shop1_products = [p for p in data if p.get("name", "").startswith(self.test_prefix)]
        for p in shop1_products:
            assert p["shop_id"] == 1
        print(f"✓ GET /api/products?shop_id=1 filters correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{product1['id']}")
        requests.delete(f"{BASE_URL}/api/products/{product2['id']}")
    
    def test_update_product(self):
        """PUT /api/products/{id} should update product"""
        # Create product
        create_resp = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}To Update",
            "sku": "UPDATE-001",
            "price": 100,
            "extra_payment": 20,
            "shop_id": 1,
            "category": "Original"
        })
        product_id = create_resp.json()["id"]
        
        # Update product
        update_payload = {
            "name": f"{self.test_prefix}Updated Name",
            "price": 150,
            "extra_payment": 30,
            "category": "Updated Category"
        }
        response = requests.put(f"{BASE_URL}/api/products/{product_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_payload["name"]
        assert data["price"] == update_payload["price"]
        assert data["extra_payment"] == update_payload["extra_payment"]
        assert data["category"] == update_payload["category"]
        # SKU should remain unchanged
        assert data["sku"] == "UPDATE-001"
        print(f"✓ PUT /api/products/{product_id} updates correctly")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/products")
        products = [p for p in get_resp.json() if p["id"] == product_id]
        assert len(products) == 1
        assert products[0]["name"] == update_payload["name"]
        print(f"✓ GET confirms update persisted")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{product_id}")
    
    def test_update_nonexistent_product(self):
        """PUT /api/products/{invalid_id} should return 404"""
        response = requests.put(f"{BASE_URL}/api/products/nonexistent-id-12345", json={"name": "Test"})
        assert response.status_code == 404
        print(f"✓ PUT /api/products/invalid_id returns 404")
    
    def test_delete_product(self):
        """DELETE /api/products/{id} should delete product"""
        # Create product
        create_resp = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}To Delete",
            "shop_id": 1
        })
        product_id = create_resp.json()["id"]
        
        # Delete product
        response = requests.delete(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ DELETE /api/products/{product_id} returns status ok")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/products")
        products = [p for p in get_resp.json() if p["id"] == product_id]
        assert len(products) == 0
        print(f"✓ GET confirms product deleted")


class TestOrderExtraPaymentCalculation:
    """Test extra_payment calculation when creating orders with products"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data prefix"""
        self.test_prefix = "TEST_EXTRAPAY_"
    
    def test_order_calculates_extra_payment_from_products(self):
        """POST /api/orders should calculate extra_payment based on product matching"""
        # Create a product with extra_payment
        product_name = f"{self.test_prefix}Premium Item"
        product_resp = requests.post(f"{BASE_URL}/api/products", json={
            "name": product_name,
            "sku": "PREMIUM-001",
            "price": 200,
            "extra_payment": 45.00,
            "shop_id": 1
        })
        product = product_resp.json()
        
        # Create order with item matching product name
        order_payload = {
            "order_number": f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "customer_name": "Test Customer Extra Pay",
            "customer_email": "test@example.com",
            "items": [
                {"name": product_name, "quantity": 2, "price": 200}  # 2x product with 45 extra each
            ],
            "total": 400,
            "date": "2026-01-15",
            "shop_id": 1
        }
        order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
        assert order_resp.status_code == 200
        order = order_resp.json()
        
        # Check fulfillment was created with calculated extra_payment
        fulfill_resp = requests.get(f"{BASE_URL}/api/fulfillment")
        fulfillments = [f for f in fulfill_resp.json() if f.get("order_id") == order["id"]]
        
        assert len(fulfillments) == 1
        # extra_payment should be 45 * 2 = 90
        assert fulfillments[0]["extra_payment"] == 90.00, f"Expected 90, got {fulfillments[0]['extra_payment']}"
        print(f"✓ Order creates fulfillment with calculated extra_payment=90 (45*2)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/orders/{order['id']}")
        requests.delete(f"{BASE_URL}/api/products/{product['id']}")
    
    def test_order_no_match_zero_extra_payment(self):
        """POST /api/orders with no matching products should have 0 extra_payment"""
        order_payload = {
            "order_number": f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "customer_name": "Test No Match",
            "items": [
                {"name": "NonexistentProduct12345", "quantity": 1, "price": 100}
            ],
            "total": 100,
            "date": "2026-01-15",
            "shop_id": 1
        }
        order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
        assert order_resp.status_code == 200
        order = order_resp.json()
        
        # Check fulfillment extra_payment is 0
        fulfill_resp = requests.get(f"{BASE_URL}/api/fulfillment")
        fulfillments = [f for f in fulfill_resp.json() if f.get("order_id") == order["id"]]
        
        assert len(fulfillments) == 1
        assert fulfillments[0]["extra_payment"] == 0
        print(f"✓ Order with no matching product has extra_payment=0")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/orders/{order['id']}")
    
    def test_order_multiple_products_extra_payment(self):
        """POST /api/orders with multiple products sums extra_payments"""
        # Create two products
        product1 = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}Product A",
            "extra_payment": 20,
            "shop_id": 1
        }).json()
        
        product2 = requests.post(f"{BASE_URL}/api/products", json={
            "name": f"{self.test_prefix}Product B",
            "extra_payment": 15,
            "shop_id": 1
        }).json()
        
        # Create order with both products
        order_payload = {
            "order_number": f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "customer_name": "Test Multi Products",
            "items": [
                {"name": f"{self.test_prefix}Product A", "quantity": 1, "price": 100},
                {"name": f"{self.test_prefix}Product B", "quantity": 3, "price": 50}  # 3x15=45
            ],
            "total": 250,
            "date": "2026-01-15",
            "shop_id": 1
        }
        order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
        order = order_resp.json()
        
        # Check fulfillment
        fulfill_resp = requests.get(f"{BASE_URL}/api/fulfillment")
        fulfillments = [f for f in fulfill_resp.json() if f.get("order_id") == order["id"]]
        
        # 20*1 + 15*3 = 20 + 45 = 65
        assert fulfillments[0]["extra_payment"] == 65.00, f"Expected 65, got {fulfillments[0]['extra_payment']}"
        print(f"✓ Multiple products sum extra_payments correctly (20 + 45 = 65)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/orders/{order['id']}")
        requests.delete(f"{BASE_URL}/api/products/{product1['id']}")
        requests.delete(f"{BASE_URL}/api/products/{product2['id']}")


class TestLoginAPI:
    """Test login with PIN"""
    
    def test_login_admin_pin(self):
        """POST /api/auth/login with Admin PIN 2409"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Admin"
        assert data["user"]["role"] == "admin"
        assert "shops" in data
        print(f"✓ Login with PIN 2409 returns Admin user")
    
    def test_login_kacper_pin(self):
        """POST /api/auth/login with Kacper PIN 2609"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2609"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Kacper"
        print(f"✓ Login with PIN 2609 returns Kacper user")
    
    def test_login_szymon_pin(self):
        """POST /api/auth/login with Szymon PIN 2509"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2509"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Szymon"
        print(f"✓ Login with PIN 2509 returns Szymon user")
    
    def test_login_invalid_pin(self):
        """POST /api/auth/login with invalid PIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "0000"})
        assert response.status_code == 401
        print(f"✓ Invalid PIN returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
