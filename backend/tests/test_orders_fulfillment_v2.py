"""
Test suite for Orders and Fulfillment features v2
Tests new features: 
- Order status editing (PUT /api/orders/{id}/status)
- Fulfillment notes CRUD
- Fulfillment pipeline stages and undo functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderStatusUpdate:
    """Test order status editing via API"""
    
    @pytest.fixture
    def test_order_id(self):
        """Create a test order and return its ID"""
        response = requests.post(f"{BASE_URL}/api/orders", json={
            "customer_name": "TEST Status Order",
            "customer_email": "test@status.com",
            "total": 150.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "shop_id": 1,
            "status": "new"
        })
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        return response.json()["id"]
    
    def test_update_order_status_new_to_processing(self, test_order_id):
        """Test updating order status from new to processing"""
        response = requests.put(f"{BASE_URL}/api/orders/{test_order_id}/status?status=processing")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert data["id"] == test_order_id
        
    def test_update_order_status_to_shipped(self, test_order_id):
        """Test updating order status to shipped"""
        response = requests.put(f"{BASE_URL}/api/orders/{test_order_id}/status?status=shipped")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "shipped"
        
    def test_update_order_status_to_delivered(self, test_order_id):
        """Test updating order status to delivered"""
        response = requests.put(f"{BASE_URL}/api/orders/{test_order_id}/status?status=delivered")
        assert response.status_code == 200
        assert response.json()["status"] == "delivered"
        
    def test_update_order_status_to_cancelled(self, test_order_id):
        """Test updating order status to cancelled"""
        response = requests.put(f"{BASE_URL}/api/orders/{test_order_id}/status?status=cancelled")
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
        
    def test_update_nonexistent_order_status(self):
        """Test updating status of non-existent order returns 404"""
        response = requests.put(f"{BASE_URL}/api/orders/nonexistent-id-123/status?status=processing")
        assert response.status_code == 404


class TestFulfillmentNotes:
    """Test fulfillment notes CRUD operations"""
    
    @pytest.fixture
    def source_month(self):
        return datetime.now().strftime("%Y-%m")
    
    def test_create_fulfillment_note(self, source_month):
        """Test creating a fulfillment note"""
        response = requests.post(f"{BASE_URL}/api/fulfillment-notes", json={
            "content": "TEST Note for testing",
            "source_month": source_month,
            "created_by": "Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "TEST Note for testing"
        assert data["source_month"] == source_month
        assert data["created_by"] == "Test User"
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fulfillment-notes/{data['id']}")
        
    def test_get_fulfillment_notes_by_month(self, source_month):
        """Test getting fulfillment notes for a specific month"""
        # Create test note first
        create_resp = requests.post(f"{BASE_URL}/api/fulfillment-notes", json={
            "content": "TEST Note for get test",
            "source_month": source_month,
            "created_by": "Tester"
        })
        note_id = create_resp.json()["id"]
        
        # Get notes
        response = requests.get(f"{BASE_URL}/api/fulfillment-notes", params={"source_month": source_month})
        assert response.status_code == 200
        notes = response.json()
        assert isinstance(notes, list)
        assert any(n["id"] == note_id for n in notes)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fulfillment-notes/{note_id}")
        
    def test_delete_fulfillment_note(self, source_month):
        """Test deleting a fulfillment note"""
        # Create note
        create_resp = requests.post(f"{BASE_URL}/api/fulfillment-notes", json={
            "content": "TEST Note to delete",
            "source_month": source_month,
            "created_by": "Tester"
        })
        note_id = create_resp.json()["id"]
        
        # Delete note
        response = requests.delete(f"{BASE_URL}/api/fulfillment-notes/{note_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/fulfillment-notes", params={"source_month": source_month})
        notes = get_resp.json()
        assert not any(n["id"] == note_id for n in notes)


class TestFulfillmentPipeline:
    """Test fulfillment pipeline stages and transitions"""
    
    @pytest.fixture
    def fulfillment_item_id(self):
        """Create a test order and fulfillment item, return fulfillment ID"""
        # Create order
        order_resp = requests.post(f"{BASE_URL}/api/orders", json={
            "customer_name": "TEST Pipeline Test",
            "customer_email": "pipeline@test.com",
            "total": 200.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "shop_id": 1,
            "status": "new"
        })
        order_id = order_resp.json()["id"]
        
        # Create fulfillment
        fulfill_resp = requests.post(f"{BASE_URL}/api/fulfillment", json={
            "order_id": order_id,
            "extra_payment": 50,
            "notes": "Test pipeline notes"
        })
        return fulfill_resp.json()["id"]
    
    def test_fulfillment_starts_at_waiting(self, fulfillment_item_id):
        """Test that new fulfillment items start at 'waiting' stage"""
        response = requests.get(f"{BASE_URL}/api/fulfillment")
        items = response.json()
        item = next((i for i in items if i["id"] == fulfillment_item_id), None)
        assert item is not None
        assert item["status"] == "waiting"
        
    def test_move_to_reminder_sent(self, fulfillment_item_id):
        """Test moving item from waiting to reminder_sent"""
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "reminder_sent"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reminder_sent"
        assert data["reminder_sent_at"] is not None
        
    def test_move_to_check_payment(self, fulfillment_item_id):
        """Test moving item to check_payment stage"""
        # First move to reminder_sent
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        
        # Then to check_payment
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "check_payment"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "check_payment"
        
    def test_mark_paid_moves_to_to_ship(self, fulfillment_item_id):
        """Test marking as paid moves to 'to_ship' stage"""
        # Move through pipeline
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        
        # Mark paid
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "extra_payment_paid": True,
            "status": "to_ship"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "to_ship"
        assert data["extra_payment_paid"] == True
        
    def test_mark_unpaid(self, fulfillment_item_id):
        """Test marking as unpaid moves to 'unpaid' stage"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "extra_payment_paid": False,
            "status": "unpaid"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "unpaid"
        
    def test_move_to_archived(self, fulfillment_item_id):
        """Test moving to archived (final stage)"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "to_ship", "extra_payment_paid": True})
        
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "archived"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "archived"
        assert data["shipped_at"] is not None
        
    def test_undo_from_reminder_sent_to_waiting(self, fulfillment_item_id):
        """Test undo: reminder_sent → waiting"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        
        # Undo
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "waiting"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "waiting"
        
    def test_undo_from_check_payment_to_reminder_sent(self, fulfillment_item_id):
        """Test undo: check_payment → reminder_sent"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        
        # Undo
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "reminder_sent"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "reminder_sent"
        
    def test_undo_from_to_ship_to_check_payment(self, fulfillment_item_id):
        """Test undo: to_ship → check_payment"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "to_ship", "extra_payment_paid": True})
        
        # Undo
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "check_payment"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "check_payment"
        
    def test_undo_from_archived_to_to_ship(self, fulfillment_item_id):
        """Test undo: archived → to_ship"""
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "reminder_sent"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "check_payment"})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "to_ship", "extra_payment_paid": True})
        requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={"status": "archived"})
        
        # Undo
        response = requests.put(f"{BASE_URL}/api/fulfillment/{fulfillment_item_id}", json={
            "status": "to_ship"
        })
        assert response.status_code == 200
        assert response.json()["status"] == "to_ship"


class TestFulfillmentStageFiltering:
    """Test filtering fulfillment by stage/status"""
    
    def test_get_fulfillment_by_status_waiting(self):
        """Test filtering by waiting status"""
        response = requests.get(f"{BASE_URL}/api/fulfillment", params={"status": "waiting"})
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list)
        for item in items:
            assert item["status"] == "waiting"
            
    def test_get_fulfillment_by_status_archived(self):
        """Test filtering by archived status"""
        response = requests.get(f"{BASE_URL}/api/fulfillment", params={"status": "archived"})
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list)
        for item in items:
            assert item["status"] == "archived"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
    def test_login_with_valid_pin(self):
        """Test login with valid PIN 2409"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["name"] == "Admin"
        assert "shops" in data
        

# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup():
    """Cleanup test data after each test"""
    yield
    # Optional: cleanup TEST prefixed orders/fulfillment
    # This runs after each test
