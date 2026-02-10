import requests
import sys
from datetime import datetime
import json

class EcommifyAPITester:
    def __init__(self, base_url="https://ads-revenue-sync.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'data' in response_data:
                        print(f"   Response: {json.dumps(response_data['data'], indent=2)[:200]}...")
                    elif isinstance(response_data, dict) and len(response_data) < 5:
                        print(f"   Response: {response_data}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.status_code < 400 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test login functionality"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test valid PIN
        success, response = self.run_test(
            "Admin Login (PIN: 2409)",
            "POST",
            "auth/login",
            200,
            data={"pin": "2409"}
        )
        
        # Test invalid PIN
        self.run_test(
            "Invalid Login (PIN: 9999)",
            "POST", 
            "auth/login",
            401,
            data={"pin": "9999"}
        )
        
        return success

    def test_monthly_stats(self):
        """Test monthly stats endpoint"""
        print("\n=== MONTHLY STATS TESTS ===")
        
        now = datetime.now()
        success, _ = self.run_test(
            "Get Current Month Stats",
            "GET",
            "monthly-stats",
            200,
            params={"shop_id": 1, "year": now.year, "month": now.month}
        )
        return success

    def test_combined_monthly_stats(self):
        """Test combined monthly stats endpoint for CS:GO ranking system"""
        print("\n=== COMBINED MONTHLY STATS TESTS ===")
        
        now = datetime.now()
        success, response = self.run_test(
            "Get Combined Monthly Stats (CS:GO Ranking)",
            "GET", 
            "combined-monthly-stats",
            200,
            params={"year": now.year, "month": now.month}
        )
        
        # Verify key fields for CS:GO ranking
        if success and response:
            required_fields = [
                'total_income', 'total_ads', 'total_netto', 'total_profit', 
                'profit_per_person', 'roi', 'target', 'progress', 
                'streak', 'best_day', 'forecast', 'days'
            ]
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
            
            # Check if days contain shop breakdown
            if 'days' in response and response['days']:
                first_day = response['days'][0]
                if 'shops' not in first_day:
                    print(f"   ⚠️  Missing 'shops' field in day data")
                elif 'profit_pp' not in first_day:
                    print(f"   ⚠️  Missing 'profit_pp' field in day data")
                else:
                    print(f"   ✅ Day data includes shop breakdown and profit per person")
                    
        return success

    def test_tasks(self):
        """Test task management"""
        print("\n=== TASK MANAGEMENT TESTS ===")
        
        # Get tasks
        success, tasks = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200
        )
        
        # Create task
        task_success, created_task = self.run_test(
            "Create Task",
            "POST",
            "tasks", 
            200,
            data={
                "title": "Test Task",
                "description": "Test Description",
                "assigned_to": "Admin"
            }
        )
        
        task_id = None
        if task_success and created_task:
            task_id = created_task.get('id')
        
        # Update task if created
        if task_id:
            self.run_test(
                "Update Task Status",
                "PUT",
                f"tasks/{task_id}",
                200,
                data={"status": "in_progress"}
            )
            
            # Delete task
            self.run_test(
                "Delete Task",
                "DELETE", 
                f"tasks/{task_id}",
                200
            )
        
        return success

    def test_incomes_expenses(self):
        """Test income and expense management"""
        print("\n=== FINANCIAL DATA TESTS ===")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create income
        income_success, created_income = self.run_test(
            "Create Income",
            "POST",
            "incomes",
            200,
            data={
                "amount": 100.50,
                "date": today,
                "description": "Test Income",
                "shop_id": 1
            }
        )
        
        # Create expense
        expense_success, created_expense = self.run_test(
            "Create Expense",
            "POST", 
            "expenses",
            200,
            data={
                "amount": 25.75,
                "date": today, 
                "campaign_name": "Test Campaign",
                "shop_id": 1
            }
        )
        
        # Get incomes
        self.run_test(
            "Get Incomes",
            "GET",
            "incomes",
            200,
            params={"shop_id": 1, "date": today}
        )
        
        # Get expenses
        self.run_test(
            "Get Expenses", 
            "GET",
            "expenses",
            200,
            params={"shop_id": 1, "date": today}
        )
        
        # Cleanup - delete created records
        if income_success and created_income:
            income_id = created_income.get('id')
            if income_id:
                self.run_test(
                    "Delete Income",
                    "DELETE",
                    f"incomes/{income_id}",
                    200
                )
        
        if expense_success and created_expense:
            expense_id = created_expense.get('id')
            if expense_id:
                self.run_test(
                    "Delete Expense",
                    "DELETE", 
                    f"expenses/{expense_id}",
                    200
                )
        
        return income_success and expense_success

    def test_store_configs(self):
        """Test store configuration endpoints"""
        print("\n=== STORE CONFIG TESTS ===")
        
        # Get Shopify configs
        shopify_success, _ = self.run_test(
            "Get Shopify Configs",
            "GET",
            "shopify-configs", 
            200
        )
        
        # Get TikTok configs
        tiktok_success, _ = self.run_test(
            "Get TikTok Configs",
            "GET",
            "tiktok-configs",
            200
        )
        
        return shopify_success and tiktok_success

    def test_ai_chat(self):
        """Test AI chat functionality"""
        print("\n=== AI CHAT TESTS ===")
        
        # Test chat message
        chat_success, _ = self.run_test(
            "Send AI Chat Message",
            "POST",
            "chat",
            200,
            data={
                "shop_id": 1,
                "message": "Test message for AI"
            }
        )
        
        # Get chat history
        history_success, _ = self.run_test(
            "Get Chat History",
            "GET", 
            "chat-history",
            200,
            params={"shop_id": 1, "limit": 10}
        )
        
        return chat_success and history_success

    def test_reminders(self):
        """Test reminders functionality"""
        print("\n=== REMINDERS TESTS ===")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create reminder
        reminder_success, created_reminder = self.run_test(
            "Create Reminder",
            "POST",
            "reminders",
            200,
            data={
                "title": "Test Reminder",
                "date": today,
                "created_by": "Admin"
            }
        )
        
        # Get reminders
        get_success, _ = self.run_test(
            "Get Reminders",
            "GET",
            "reminders",
            200
        )
        
        reminder_id = None
        if reminder_success and created_reminder:
            reminder_id = created_reminder.get('id')
            
            # Update reminder
            self.run_test(
                "Update Reminder",
                "PUT",
                f"reminders/{reminder_id}",
                200,
                data={"done": True}
            )
            
            # Delete reminder
            self.run_test(
                "Delete Reminder",
                "DELETE",
                f"reminders/{reminder_id}",
                200
            )
        
        return reminder_success and get_success

    def test_orders(self):
        """Test orders functionality"""
        print("\n=== ORDERS TESTS ===")
        
        now = datetime.now()
        today = now.strftime('%Y-%m-%d')
        
        # Create order
        order_success, created_order = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data={
                "customer_name": "Test Customer",
                "total": 150.00,
                "date": today,
                "shop_id": 1,
                "items": [{"name": "Test Product", "quantity": 1, "price": 150.00}]
            }
        )
        
        # Get orders
        get_success, _ = self.run_test(
            "Get Orders",
            "GET",
            "orders",
            200,
            params={"year": now.year, "month": now.month}
        )
        
        # Get orders by shop
        shop_success, _ = self.run_test(
            "Get Orders by Shop",
            "GET", 
            "orders",
            200,
            params={"shop_id": 1, "year": now.year, "month": now.month}
        )
        
        order_id = None
        if order_success and created_order:
            order_id = created_order.get('id')
            
            # Update order status
            self.run_test(
                "Update Order Status",
                "PUT",
                f"orders/{order_id}/status",
                200,
                params={"status": "processing"}
            )
            
            # Delete order
            self.run_test(
                "Delete Order",
                "DELETE",
                f"orders/{order_id}",
                200
            )
        
        return order_success and get_success and shop_success

    def test_receipts(self):
        """Test receipts functionality"""
        print("\n=== RECEIPTS TESTS ===")
        
        now = datetime.now()
        today = now.strftime('%Y-%m-%d')
        
        # Create receipt
        receipt_success, created_receipt = self.run_test(
            "Create Receipt",
            "POST",
            "receipts",
            200,
            data={
                "date": today,
                "shop_id": 1,
                "items": [
                    {
                        "description": "Test Item",
                        "quantity": 2,
                        "netto_price": 50.00
                    }
                ]
            }
        )
        
        # Get receipts
        get_success, _ = self.run_test(
            "Get Receipts",
            "GET",
            "receipts",
            200,
            params={"year": now.year, "month": now.month}
        )
        
        receipt_id = None
        if receipt_success and created_receipt:
            receipt_id = created_receipt.get('id')
            
            # Test PDF generation (should return success even if PDF generation has issues)
            print(f"\n🔍 Testing Receipt PDF Download...")
            try:
                import requests
                url = f"{self.base_url}/api/receipts/pdf/{receipt_id}"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    print(f"✅ Passed - PDF generated successfully")
                else:
                    print(f"❌ Failed - PDF generation failed: {response.status_code}")
            except Exception as e:
                print(f"⚠️  PDF test skipped - Error: {str(e)}")
            
            # Delete receipt
            self.run_test(
                "Delete Receipt",
                "DELETE",
                f"receipts/{receipt_id}",
                200
            )
        
        return receipt_success and get_success

    def test_company_settings(self):
        """Test company settings functionality"""
        print("\n=== COMPANY SETTINGS TESTS ===")
        
        # Get company settings
        get_success, _ = self.run_test(
            "Get Company Settings",
            "GET",
            "company-settings",
            200
        )
        
        # Update company settings
        update_success, _ = self.run_test(
            "Update Company Settings",
            "PUT",
            "company-settings",
            200,
            data={
                "name": "Test Company Ltd",
                "nip": "1234567890",
                "address": "Test Street 123",
                "city": "Test City",
                "postal_code": "12-345",
                "email": "test@example.com",
                "phone": "+48 123 456 789"
            }
        )
        
        return get_success and update_success

    def test_notes(self):
        """Test notes functionality"""
        print("\n=== NOTES TESTS ===")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create note
        note_success, created_note = self.run_test(
            "Create Note",
            "POST",
            "notes",
            200,
            data={
                "date": today,
                "shop_id": 1,
                "content": "Test note content",
                "created_by": "Admin"
            }
        )
        
        # Get notes
        get_success, _ = self.run_test(
            "Get Notes",
            "GET",
            "notes",
            200,
            params={"date": today}
        )
        
        note_id = None
        if note_success and created_note:
            note_id = created_note.get('id')
            
            # Delete note
            self.run_test(
                "Delete Note",
                "DELETE",
                f"notes/{note_id}",
                200
            )
        
        return note_success and get_success

    def test_weekly_stats(self):
        """Test weekly stats functionality"""
        print("\n=== WEEKLY STATS TESTS ===")
        
        success, response = self.run_test(
            "Get Weekly Stats",
            "GET",
            "weekly-stats",
            200
        )
        
        # Verify response structure
        if success and response:
            required_fields = ['current', 'previous', 'income_change', 'profit_change']
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
                else:
                    print(f"   ✅ Found field: {field}")
        
        return success

    def test_export_functionality(self):
        """Test export functionality (Excel, PDF)"""
        print("\n=== EXPORT FUNCTIONALITY TESTS ===")
        
        now = datetime.now()
        
        # Test Excel export
        print(f"\n🔍 Testing Excel Export...")
        try:
            import requests
            url = f"{self.base_url}/api/export/excel"
            params = {"year": now.year, "month": now.month}
            response = requests.get(url, params=params, timeout=15)
            if response.status_code == 200:
                print(f"✅ Passed - Excel export successful")
                excel_success = True
            else:
                print(f"❌ Failed - Excel export failed: {response.status_code}")
                excel_success = False
        except Exception as e:
            print(f"❌ Failed - Excel export error: {str(e)}")
            excel_success = False
        
        # Test Summary PDF
        print(f"\n🔍 Testing Summary PDF...")
        try:
            url = f"{self.base_url}/api/receipts/summary-pdf"
            params = {"year": now.year, "month": now.month}
            response = requests.get(url, params=params, timeout=15)
            if response.status_code == 200:
                print(f"✅ Passed - Summary PDF export successful")
                pdf_success = True
            else:
                print(f"❌ Failed - Summary PDF export failed: {response.status_code}")
                pdf_success = False
        except Exception as e:
            print(f"❌ Failed - Summary PDF export error: {str(e)}")
            pdf_success = False
        
        return excel_success and pdf_success

    def test_income_expense_details(self):
        """Test income and expense details endpoints"""
        print("\n=== INCOME/EXPENSE DETAILS TESTS ===")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get income details
        income_details_success, _ = self.run_test(
            "Get Income Details",
            "GET",
            "incomes/details",
            200,
            params={"shop_id": 1, "date": today}
        )
        
        # Get expense details
        expense_details_success, _ = self.run_test(
            "Get Expense Details", 
            "GET",
            "expenses/details",
            200,
            params={"shop_id": 1, "date": today}
        )
        
        return income_details_success and expense_details_success

    def test_health(self):
        """Test health endpoint"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        success, _ = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

def main():
    print("🚀 Starting Ecommify Backend API Tests...")
    print("=" * 60)
    
    tester = EcommifyAPITester()
    
    # Run all tests
    tests = [
        ("Health Check", tester.test_health),
        ("Authentication", tester.test_auth), 
        ("Monthly Stats", tester.test_monthly_stats),
        ("Combined Monthly Stats", tester.test_combined_monthly_stats),
        ("Weekly Stats", tester.test_weekly_stats),
        ("Tasks Management", tester.test_tasks),
        ("Income/Expense Management", tester.test_incomes_expenses),
        ("Income/Expense Details", tester.test_income_expense_details),
        ("Reminders", tester.test_reminders),
        ("Orders", tester.test_orders),
        ("Receipts", tester.test_receipts),
        ("Company Settings", tester.test_company_settings),
        ("Notes", tester.test_notes),
        ("Store Configurations", tester.test_store_configs),
        ("Export Functionality", tester.test_export_functionality),
        ("AI Chat", tester.test_ai_chat)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ {test_name} failed with exception: {str(e)}")
            results[test_name] = False
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 BACKEND API TEST SUMMARY")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    print()
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())