"""
Test cases for Ecommify Returns (Zwroty) and Fulfillment (Realizacja) APIs
Tests: POST/GET/DELETE /api/returns, POST/GET/PUT/DELETE /api/fulfillment, bulk-status, reminder-check
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestReturnsAPI:
    """Tests for Returns (Zwroty) CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup_test_order(self, api_client):
        """Create a test order for returns tests"""
        self.test_order = None
        order_data = {
            "customer_name": f"TEST_Return_{uuid.uuid4().hex[:8]}",
            "customer_email": "test@test.com",
            "total": 100.0,
            "date": "2026-02-15",
            "shop_id": 1,
            "items": [{"name": "Test Product", "quantity": 1, "price": 100.0}]
        }
        resp = api_client.post(f"{BASE_URL}/api/orders", json=order_data)
        if resp.status_code == 200:
            self.test_order = resp.json()
        yield
        # Cleanup
        if self.test_order:
            api_client.delete(f"{BASE_URL}/api/orders/{self.test_order['id']}")
    
    def test_create_return_from_order(self, api_client):
        """POST /api/returns creates return from order and marks order as 'returned'"""
        assert self.test_order is not None, "Test order not created"
        
        return_data = {
            "order_id": self.test_order["id"],
            "reason": "Test return reason"
        }
        resp = api_client.post(f"{BASE_URL}/api/returns", json=return_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "id" in data
        assert data["order_id"] == self.test_order["id"]
        assert data["reason"] == "Test return reason"
        assert data["refund_amount"] == self.test_order["total"]  # Defaults to order total
        assert data["customer_name"] == self.test_order["customer_name"]
        
        # Verify order status changed to 'returned'
        order_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = order_resp.json()
        matching_order = next((o for o in orders if o["id"] == self.test_order["id"]), None)
        assert matching_order is not None
        assert matching_order["status"] == "returned", f"Expected 'returned', got {matching_order['status']}"
        
        # Cleanup the return
        api_client.delete(f"{BASE_URL}/api/returns/{data['id']}")
        print(f"SUCCESS: Return created, order marked as 'returned'")
    
    def test_create_return_with_custom_refund(self, api_client):
        """POST /api/returns with custom refund_amount"""
        assert self.test_order is not None
        
        return_data = {
            "order_id": self.test_order["id"],
            "reason": "Partial refund test",
            "refund_amount": 50.0
        }
        resp = api_client.post(f"{BASE_URL}/api/returns", json=return_data)
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["refund_amount"] == 50.0, f"Expected 50.0, got {data['refund_amount']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/returns/{data['id']}")
        print("SUCCESS: Custom refund amount works")
    
    def test_get_returns_list(self, api_client):
        """GET /api/returns returns list"""
        resp = api_client.get(f"{BASE_URL}/api/returns", params={"year": 2026, "month": 2})
        assert resp.status_code == 200
        
        data = resp.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/returns returned {len(data)} returns")
    
    def test_get_returns_with_filters(self, api_client):
        """GET /api/returns with shop_id filter"""
        resp = api_client.get(f"{BASE_URL}/api/returns", params={"year": 2026, "month": 2, "shop_id": 1})
        assert resp.status_code == 200
        print("SUCCESS: GET /api/returns with shop filter works")
    
    def test_delete_return_restores_order_status(self, api_client):
        """DELETE /api/returns/{id} deletes return and restores order status"""
        assert self.test_order is not None
        
        # Create return
        return_data = {"order_id": self.test_order["id"], "reason": "Delete test"}
        resp = api_client.post(f"{BASE_URL}/api/returns", json=return_data)
        assert resp.status_code == 200
        return_id = resp.json()["id"]
        
        # Delete return
        del_resp = api_client.delete(f"{BASE_URL}/api/returns/{return_id}")
        assert del_resp.status_code == 200
        
        # Verify order status restored to 'new'
        order_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = order_resp.json()
        matching_order = next((o for o in orders if o["id"] == self.test_order["id"]), None)
        assert matching_order is not None
        assert matching_order["status"] == "new", f"Expected 'new', got {matching_order['status']}"
        print("SUCCESS: Delete return restores order status to 'new'")
    
    def test_create_return_invalid_order(self, api_client):
        """POST /api/returns with invalid order_id returns 404"""
        return_data = {"order_id": "nonexistent-id", "reason": "Test"}
        resp = api_client.post(f"{BASE_URL}/api/returns", json=return_data)
        assert resp.status_code == 404
        print("SUCCESS: Invalid order_id returns 404")


class TestFulfillmentAPI:
    """Tests for Fulfillment (Realizacja) CRUD and pipeline"""
    
    @pytest.fixture(autouse=True)
    def setup_fulfillment_order(self, api_client):
        """Create a test order for fulfillment tests"""
        self.test_order = None
        self.test_fulfillment = None
        order_data = {
            "customer_name": f"TEST_Fulfill_{uuid.uuid4().hex[:8]}",
            "customer_email": "fulfill@test.com",
            "total": 200.0,
            "date": "2026-02-10",
            "shop_id": 1,
            "items": [{"name": "Fulfillment Product", "quantity": 1, "price": 200.0}]
        }
        resp = api_client.post(f"{BASE_URL}/api/orders", json=order_data)
        if resp.status_code == 200:
            self.test_order = resp.json()
        yield
        # Cleanup
        if self.test_fulfillment:
            api_client.delete(f"{BASE_URL}/api/fulfillment/{self.test_fulfillment['id']}")
        if self.test_order:
            api_client.delete(f"{BASE_URL}/api/orders/{self.test_order['id']}")
    
    def test_create_fulfillment_with_extra_payment(self, api_client):
        """POST /api/fulfillment creates fulfillment record with extra_payment"""
        assert self.test_order is not None
        
        fulfillment_data = {
            "order_id": self.test_order["id"],
            "extra_payment": 50.0,
            "notes": "Test fulfillment notes"
        }
        resp = api_client.post(f"{BASE_URL}/api/fulfillment", json=fulfillment_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        self.test_fulfillment = data
        
        assert "id" in data
        assert data["order_id"] == self.test_order["id"]
        assert data["extra_payment"] == 50.0
        assert data["extra_payment_paid"] == False
        assert data["status"] == "waiting"
        assert data["source_month"] == "2026-02"
        assert data["notes"] == "Test fulfillment notes"
        
        # Verify order status changed to 'processing'
        order_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = order_resp.json()
        matching_order = next((o for o in orders if o["id"] == self.test_order["id"]), None)
        assert matching_order["status"] == "processing"
        print("SUCCESS: Fulfillment created, order marked as 'processing'")
    
    def test_fulfillment_duplicate_prevention(self, api_client):
        """POST /api/fulfillment prevents duplicate entries for same order"""
        assert self.test_order is not None
        
        # Create first fulfillment
        resp1 = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": self.test_order["id"]})
        assert resp1.status_code == 200
        self.test_fulfillment = resp1.json()
        
        # Try to create duplicate
        resp2 = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": self.test_order["id"]})
        assert resp2.status_code == 400
        assert "juz jest w realizacji" in resp2.json().get("detail", "").lower()
        print("SUCCESS: Duplicate fulfillment prevented with 400 error")
    
    def test_get_fulfillment_with_auto_check_ready(self, api_client):
        """GET /api/fulfillment returns records with auto_check_ready flag"""
        resp = api_client.get(f"{BASE_URL}/api/fulfillment", params={"source_month": "2026-02"})
        assert resp.status_code == 200
        
        data = resp.json()
        assert isinstance(data, list)
        # Items in reminder_sent status should have auto_check_ready or days_until_check
        for item in data:
            if item.get("status") == "reminder_sent":
                assert "auto_check_ready" in item or "days_until_check" in item
        print(f"SUCCESS: GET /api/fulfillment returned {len(data)} items")
    
    def test_get_fulfillment_with_status_filter(self, api_client):
        """GET /api/fulfillment with status filter"""
        resp = api_client.get(f"{BASE_URL}/api/fulfillment", params={"status": "waiting"})
        assert resp.status_code == 200
        
        data = resp.json()
        for item in data:
            assert item["status"] == "waiting"
        print("SUCCESS: Status filter works")
    
    def test_update_fulfillment_status_pipeline(self, api_client):
        """PUT /api/fulfillment/{id} updates status through pipeline stages"""
        assert self.test_order is not None
        
        # Create fulfillment
        resp = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": self.test_order["id"], "extra_payment": 30.0})
        assert resp.status_code == 200
        self.test_fulfillment = resp.json()
        fid = self.test_fulfillment["id"]
        
        # Stage 1: waiting -> reminder_sent
        update_resp = api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "reminder_sent"})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "reminder_sent"
        assert "reminder_sent_at" in data and data["reminder_sent_at"] is not None
        print("  - waiting -> reminder_sent: OK (reminder_sent_at set)")
        
        # Stage 2: reminder_sent -> check_payment
        update_resp = api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "check_payment"})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "check_payment"
        assert "payment_checked_at" in data and data["payment_checked_at"] is not None
        print("  - reminder_sent -> check_payment: OK (payment_checked_at set)")
        
        # Stage 3: check_payment -> to_ship (marking as paid)
        update_resp = api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "to_ship", "extra_payment_paid": True})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "to_ship"
        assert data["extra_payment_paid"] == True
        print("  - check_payment -> to_ship (paid): OK")
        
        # Stage 4: to_ship -> archived
        update_resp = api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "archived"})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "archived"
        assert "shipped_at" in data and data["shipped_at"] is not None
        print("  - to_ship -> archived: OK (shipped_at set, order delivered)")
        
        # Verify order status is now 'delivered'
        order_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = order_resp.json()
        matching_order = next((o for o in orders if o["id"] == self.test_order["id"]), None)
        assert matching_order["status"] == "delivered"
        print("SUCCESS: Full pipeline test passed (waiting->reminder_sent->check_payment->to_ship->archived)")
    
    def test_update_fulfillment_unpaid_branch(self, api_client):
        """PUT /api/fulfillment/{id} unpaid branch from check_payment"""
        assert self.test_order is not None
        
        # Create fulfillment
        resp = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": self.test_order["id"]})
        assert resp.status_code == 200
        self.test_fulfillment = resp.json()
        fid = self.test_fulfillment["id"]
        
        # Move to check_payment
        api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "reminder_sent"})
        api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "check_payment"})
        
        # Mark as unpaid
        update_resp = api_client.put(f"{BASE_URL}/api/fulfillment/{fid}", json={"status": "unpaid", "extra_payment_paid": False})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["status"] == "unpaid"
        assert data["extra_payment_paid"] == False
        print("SUCCESS: Unpaid branch works (check_payment -> unpaid)")
    
    def test_bulk_status_update(self, api_client):
        """POST /api/fulfillment/bulk-status updates multiple items"""
        # Create test order and fulfillment
        order_data = {
            "customer_name": f"TEST_Bulk_{uuid.uuid4().hex[:8]}",
            "total": 100.0,
            "date": "2026-02-05",
            "shop_id": 1
        }
        order_resp = api_client.post(f"{BASE_URL}/api/orders", json=order_data)
        test_order = order_resp.json()
        
        # Create fulfillment in waiting status
        f_resp = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": test_order["id"]})
        test_fulfill = f_resp.json()
        
        # Bulk update waiting -> reminder_sent for 2026-02
        bulk_resp = api_client.post(
            f"{BASE_URL}/api/fulfillment/bulk-status",
            params={"source_month": "2026-02", "from_status": "waiting", "to_status": "reminder_sent"}
        )
        assert bulk_resp.status_code == 200
        data = bulk_resp.json()
        assert "updated" in data
        print(f"SUCCESS: Bulk status update - {data['updated']} items updated")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/fulfillment/{test_fulfill['id']}")
        api_client.delete(f"{BASE_URL}/api/orders/{test_order['id']}")
    
    def test_reminder_check_endpoint(self, api_client):
        """GET /api/fulfillment/reminder-check returns reminder info"""
        resp = api_client.get(f"{BASE_URL}/api/fulfillment/reminder-check")
        assert resp.status_code == 200
        
        data = resp.json()
        assert "is_15th" in data
        assert "prev_month" in data
        assert "waiting_for_reminder" in data
        assert "ready_for_check" in data
        assert "show_reminder" in data
        
        # is_15th should be boolean based on current day
        assert isinstance(data["is_15th"], bool)
        assert isinstance(data["waiting_for_reminder"], int)
        assert isinstance(data["ready_for_check"], int)
        print(f"SUCCESS: Reminder check - is_15th: {data['is_15th']}, waiting: {data['waiting_for_reminder']}, ready: {data['ready_for_check']}")
    
    def test_delete_fulfillment_restores_order(self, api_client):
        """DELETE /api/fulfillment/{id} restores order status to 'new'"""
        assert self.test_order is not None
        
        # Create fulfillment
        resp = api_client.post(f"{BASE_URL}/api/fulfillment", json={"order_id": self.test_order["id"]})
        assert resp.status_code == 200
        fid = resp.json()["id"]
        
        # Delete fulfillment
        del_resp = api_client.delete(f"{BASE_URL}/api/fulfillment/{fid}")
        assert del_resp.status_code == 200
        
        # Verify order status restored
        order_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = order_resp.json()
        matching_order = next((o for o in orders if o["id"] == self.test_order["id"]), None)
        assert matching_order["status"] == "new"
        print("SUCCESS: Delete fulfillment restores order to 'new'")
        
        # Clear test_fulfillment since it's deleted
        self.test_fulfillment = None


class TestOrderStatusIntegration:
    """Test order status changes with returns/fulfillment"""
    
    def test_order_shows_returned_badge(self, api_client):
        """Returned orders have status='returned' visible in orders list"""
        # Create order
        order_data = {
            "customer_name": f"TEST_Badge_{uuid.uuid4().hex[:8]}",
            "total": 150.0,
            "date": "2026-02-20",
            "shop_id": 1
        }
        order_resp = api_client.post(f"{BASE_URL}/api/orders", json=order_data)
        test_order = order_resp.json()
        
        # Create return
        ret_resp = api_client.post(f"{BASE_URL}/api/returns", json={"order_id": test_order["id"], "reason": "Badge test"})
        test_return = ret_resp.json()
        
        # Get orders and check status
        orders_resp = api_client.get(f"{BASE_URL}/api/orders", params={"shop_id": 1, "year": 2026, "month": 2})
        orders = orders_resp.json()
        matching = next((o for o in orders if o["id"] == test_order["id"]), None)
        assert matching is not None
        assert matching["status"] == "returned"
        print("SUCCESS: Returned order shows 'returned' status")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/returns/{test_return['id']}")
        api_client.delete(f"{BASE_URL}/api/orders/{test_order['id']}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
