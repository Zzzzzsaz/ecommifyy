"""
Ecommify API Tests - Sales Records (Ewidencja), Calendar, Reminders, Notes
Tests all new features after replacing Paragony with Ewidencja sprzedazy
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealth:
    """Health check tests"""
    
    def test_api_root(self):
        """API root returns status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API Health: {data}")


class TestAuth:
    """Authentication tests"""
    
    def test_login_valid_pin_admin(self):
        """Login with admin PIN 2409"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "2409"})
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["name"] == "Admin"
        assert data["user"]["role"] == "admin"
        assert "shops" in data
        assert len(data["shops"]) == 4
        print(f"Login successful: {data['user']['name']}")
    
    def test_login_invalid_pin(self):
        """Login with invalid PIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"pin": "0000"})
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid PIN handled correctly: {data}")


class TestSalesRecords:
    """Sales Records (Ewidencja sprzedazy) CRUD tests"""
    
    def test_get_sales_records(self):
        """GET /api/sales-records returns records"""
        response = requests.get(f"{BASE_URL}/api/sales-records", params={"year": 2026, "month": 2})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Sales records count: {len(data)}")
        if data:
            record = data[0]
            assert "id" in record
            assert "date" in record
            assert "brutto" in record
            assert "netto" in record
            assert "vat_rate" in record
            assert "vat_amount" in record
            print(f"Sample record: {record.get('product_name', 'N/A')}, Brutto: {record.get('brutto')}")
    
    def test_create_sales_record_manual(self):
        """POST /api/sales-records creates manual record"""
        payload = {
            "date": "2026-02-15",
            "order_number": "TEST-001",
            "product_name": "Test Produkt Manual",
            "quantity": 2,
            "netto": 81.30,
            "vat_rate": 23,
            "brutto": 100.00,
            "payment_method": "Karta",
            "shop_id": 1
        }
        response = requests.post(f"{BASE_URL}/api/sales-records", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["product_name"] == "Test Produkt Manual"
        assert data["brutto"] == 100.00
        assert data["netto"] == 81.30
        assert data["vat_rate"] == 23
        assert "vat_amount" in data
        assert data["source"] == "manual"
        assert "id" in data
        print(f"Created sales record: {data['id']}")
        
        # Cleanup
        del_resp = requests.delete(f"{BASE_URL}/api/sales-records/{data['id']}")
        assert del_resp.status_code == 200
        print(f"Deleted test record: {data['id']}")
    
    def test_delete_sales_record(self):
        """DELETE /api/sales-records/{id} deletes record"""
        # Create first
        payload = {
            "date": "2026-02-16",
            "product_name": "Test Delete",
            "quantity": 1,
            "netto": 40.65,
            "vat_rate": 23,
            "brutto": 50.00,
            "payment_method": "Gotowka",
            "shop_id": 2
        }
        create_resp = requests.post(f"{BASE_URL}/api/sales-records", json=payload)
        assert create_resp.status_code == 200
        record_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/sales-records/{record_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "ok"
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/sales-records", params={"year": 2026, "month": 2})
        records = get_resp.json()
        assert not any(r["id"] == record_id for r in records)
        print(f"Successfully deleted record {record_id}")
    
    def test_generate_from_orders(self):
        """POST /api/sales-records/generate-from-orders generates from orders"""
        response = requests.post(
            f"{BASE_URL}/api/sales-records/generate-from-orders",
            params={"year": 2026, "month": 2}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "generated" in data
        assert "message" in data
        print(f"Generate from orders result: {data}")
    
    def test_generate_from_orders_with_shop_filter(self):
        """Generate from orders with shop_id filter"""
        response = requests.post(
            f"{BASE_URL}/api/sales-records/generate-from-orders",
            params={"year": 2026, "month": 2, "shop_id": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"Generate from orders (shop 1): {data}")


class TestSalesRecordsPDF:
    """Sales Records PDF download tests"""
    
    def test_daily_pdf(self):
        """GET /api/sales-records/pdf/daily returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/sales-records/pdf/daily",
            params={"date": "2026-02-10"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("Content-Type", "")
        assert len(response.content) > 0
        print(f"Daily PDF size: {len(response.content)} bytes")
    
    def test_monthly_pdf(self):
        """GET /api/sales-records/pdf/monthly returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/sales-records/pdf/monthly",
            params={"year": 2026, "month": 2}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("Content-Type", "")
        assert len(response.content) > 0
        print(f"Monthly PDF size: {len(response.content)} bytes")
    
    def test_daily_pdf_with_shop_filter(self):
        """Daily PDF with shop_id filter"""
        response = requests.get(
            f"{BASE_URL}/api/sales-records/pdf/daily",
            params={"date": "2026-02-10", "shop_id": 1}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("Content-Type", "")
        print(f"Daily PDF (shop 1) size: {len(response.content)} bytes")


class TestReminders:
    """Reminders CRUD tests (for Calendar page)"""
    
    def test_get_reminders(self):
        """GET /api/reminders returns list"""
        response = requests.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Reminders count: {len(data)}")
    
    def test_create_reminder_no_recurring(self):
        """Create reminder without recurring"""
        payload = {
            "title": "Test Reminder Single",
            "date": "2026-02-20",
            "time": "14:00",
            "recurring": "none",
            "created_by": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Reminder Single"
        assert data["date"] == "2026-02-20"
        assert data["time"] == "14:00"
        assert data["recurring"] == "none"
        assert data["done"] == False
        assert "id" in data
        print(f"Created reminder: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reminders/{data['id']}")
    
    def test_create_reminder_daily_recurring(self):
        """Create daily recurring reminder"""
        payload = {
            "title": "Test Daily Reminder",
            "date": "2026-02-01",
            "time": "09:00",
            "recurring": "daily",
            "created_by": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["recurring"] == "daily"
        print(f"Created daily recurring reminder: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reminders/{data['id']}")
    
    def test_create_reminder_weekly_recurring(self):
        """Create weekly recurring reminder"""
        payload = {
            "title": "Test Weekly Reminder",
            "date": "2026-02-03",
            "time": "10:00",
            "recurring": "weekly",
            "created_by": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["recurring"] == "weekly"
        print(f"Created weekly recurring reminder: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reminders/{data['id']}")
    
    def test_create_reminder_monthly_recurring(self):
        """Create monthly recurring reminder"""
        payload = {
            "title": "Test Monthly Reminder",
            "date": "2026-02-15",
            "recurring": "monthly",
            "created_by": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["recurring"] == "monthly"
        print(f"Created monthly recurring reminder: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reminders/{data['id']}")
    
    def test_update_reminder_toggle_done(self):
        """Toggle reminder done status"""
        # Create
        payload = {"title": "Test Toggle", "date": "2026-02-25", "recurring": "none", "created_by": "Test"}
        create_resp = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        assert create_resp.status_code == 200
        reminder_id = create_resp.json()["id"]
        
        # Update done to True
        update_resp = requests.put(f"{BASE_URL}/api/reminders/{reminder_id}", json={"done": True})
        assert update_resp.status_code == 200
        assert update_resp.json()["done"] == True
        
        # Update done back to False
        update_resp2 = requests.put(f"{BASE_URL}/api/reminders/{reminder_id}", json={"done": False})
        assert update_resp2.status_code == 200
        assert update_resp2.json()["done"] == False
        
        print(f"Toggle done test passed for {reminder_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reminders/{reminder_id}")
    
    def test_delete_reminder(self):
        """Delete reminder"""
        # Create
        payload = {"title": "Test Delete", "date": "2026-02-26", "recurring": "none", "created_by": "Test"}
        create_resp = requests.post(f"{BASE_URL}/api/reminders", json=payload)
        reminder_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/reminders/{reminder_id}")
        assert del_resp.status_code == 200
        print(f"Deleted reminder {reminder_id}")


class TestNotes:
    """Notes CRUD tests (for Calendar page)"""
    
    def test_get_notes(self):
        """GET /api/notes returns list"""
        response = requests.get(f"{BASE_URL}/api/notes", params={"year": 2026, "month": 2})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Notes count: {len(data)}")
    
    def test_get_notes_by_date(self):
        """Get notes for specific date"""
        response = requests.get(f"{BASE_URL}/api/notes", params={"date": "2026-02-10"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Notes for 2026-02-10: {len(data)}")
    
    def test_create_note(self):
        """Create note"""
        payload = {
            "date": "2026-02-18",
            "shop_id": 0,
            "content": "Test notatka dla kalendarza",
            "created_by": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/notes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Test notatka dla kalendarza"
        assert data["date"] == "2026-02-18"
        assert "id" in data
        print(f"Created note: {data['id']}")
        
        # Verify it shows up in GET
        get_resp = requests.get(f"{BASE_URL}/api/notes", params={"date": "2026-02-18"})
        notes = get_resp.json()
        assert any(n["id"] == data["id"] for n in notes)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/notes/{data['id']}")
    
    def test_delete_note(self):
        """Delete note"""
        # Create
        payload = {"date": "2026-02-19", "content": "Delete me", "created_by": "Test"}
        create_resp = requests.post(f"{BASE_URL}/api/notes", json=payload)
        note_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/notes/{note_id}")
        assert del_resp.status_code == 200
        print(f"Deleted note {note_id}")


class TestOrders:
    """Orders CRUD tests"""
    
    def test_get_orders(self):
        """GET /api/orders returns list"""
        response = requests.get(f"{BASE_URL}/api/orders", params={"year": 2026, "month": 2})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Orders count: {len(data)}")
        if data:
            order = data[0]
            assert "id" in order
            assert "total" in order
            assert "date" in order
            print(f"Sample order: {order.get('order_number', 'N/A')}, Total: {order.get('total')}")
    
    def test_create_order(self):
        """Create order"""
        payload = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "123456789",
            "shipping_address": "Test Street 123",
            "payment_gateway": "Stripe",
            "total": 199.99,
            "date": "2026-02-20",
            "shop_id": 1,
            "items": [{"name": "Test Product", "quantity": 2, "price": 99.99}]
        }
        response = requests.post(f"{BASE_URL}/api/orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["customer_name"] == "Test Customer"
        assert data["total"] == 199.99
        assert "id" in data
        print(f"Created order: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/orders/{data['id']}")
    
    def test_delete_order(self):
        """Delete order"""
        # Create
        payload = {"customer_name": "Delete Test", "total": 50.00, "date": "2026-02-21", "shop_id": 2}
        create_resp = requests.post(f"{BASE_URL}/api/orders", json=payload)
        order_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/orders/{order_id}")
        assert del_resp.status_code == 200
        print(f"Deleted order {order_id}")


class TestCompanySettings:
    """Company settings tests"""
    
    def test_get_company_settings(self):
        """GET /api/company-settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/company-settings")
        assert response.status_code == 200
        data = response.json()
        print(f"Company settings: {data.get('name', 'Not set')}")


class TestStats:
    """Statistics endpoints tests"""
    
    def test_combined_monthly_stats(self):
        """GET /api/combined-monthly-stats returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/combined-monthly-stats",
            params={"year": 2026, "month": 2}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_income" in data
        assert "total_ads" in data
        assert "total_profit" in data
        assert "days" in data
        print(f"Monthly stats: Income={data['total_income']}, Profit={data['total_profit']}")
    
    def test_weekly_stats(self):
        """GET /api/weekly-stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/weekly-stats")
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "previous" in data
        print(f"Weekly stats: Current income={data['current']['income']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
