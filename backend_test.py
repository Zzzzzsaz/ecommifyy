#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone

class EcommifyAPITester:
    def __init__(self, base_url="https://ads-revenue-sync.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                details += f", Response: {response.json()}"
            self.log_result("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_result("API Health Check", False, f"Error: {str(e)}")
            return False

    def test_login_valid_pin(self):
        """Test login with valid PIN (Admin: 2409)"""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", 
                                       json={"pin": "2409"})
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", User: {data.get('user', {}).get('name', 'Unknown')}"
                details += f", Shops: {len(data.get('shops', []))}"
            self.log_result("Login Valid PIN (Admin: 2409)", success, details)
            return success
        except Exception as e:
            self.log_result("Login Valid PIN (Admin: 2409)", False, f"Error: {str(e)}")
            return False

    def test_login_invalid_pin(self):
        """Test login with invalid PIN"""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", 
                                       json={"pin": "9999"})
            success = response.status_code == 401
            details = f"Status: {response.status_code} (Expected 401)"
            if success:
                data = response.json()
                details += f", Error: {data.get('detail', 'Unknown')}"
            self.log_result("Login Invalid PIN", success, details)
            return success
        except Exception as e:
            self.log_result("Login Invalid PIN", False, f"Error: {str(e)}")
            return False

    def test_monthly_stats(self):
        """Test monthly stats endpoint"""
        try:
            now = datetime.now()
            params = {
                "shop_id": 1,
                "year": now.year,
                "month": now.month
            }
            response = self.session.get(f"{self.base_url}/monthly-stats", params=params)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Shop: {data.get('shop_id')}, Days: {len(data.get('days', []))}"
                details += f", Total Income: {data.get('total_income', 0)}"
            self.log_result("Monthly Stats", success, details)
            return success
        except Exception as e:
            self.log_result("Monthly Stats", False, f"Error: {str(e)}")
            return False

    def test_create_income(self):
        """Test creating income entry"""
        try:
            income_data = {
                "amount": 100.50,
                "date": "2024-12-09",
                "description": "Test income",
                "shop_id": 1
            }
            response = self.session.post(f"{self.base_url}/incomes", json=income_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Income ID: {data.get('id', 'Unknown')}"
                details += f", Amount: {data.get('amount', 0)}"
                # Store ID for cleanup
                self.test_income_id = data.get('id')
            self.log_result("Create Income", success, details)
            return success
        except Exception as e:
            self.log_result("Create Income", False, f"Error: {str(e)}")
            return False

    def test_create_expense(self):
        """Test creating expense entry"""
        try:
            expense_data = {
                "amount": 50.25,
                "date": "2024-12-09",
                "campaign_name": "Test campaign",
                "shop_id": 1
            }
            response = self.session.post(f"{self.base_url}/expenses", json=expense_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Expense ID: {data.get('id', 'Unknown')}"
                details += f", Amount: {data.get('amount', 0)}"
                # Store ID for cleanup
                self.test_expense_id = data.get('id')
            self.log_result("Create Expense", success, details)
            return success
        except Exception as e:
            self.log_result("Create Expense", False, f"Error: {str(e)}")
            return False

    def test_get_tasks(self):
        """Test fetching tasks"""
        try:
            response = self.session.get(f"{self.base_url}/tasks")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Tasks count: {len(data)}"
            self.log_result("Get Tasks", success, details)
            return success
        except Exception as e:
            self.log_result("Get Tasks", False, f"Error: {str(e)}")
            return False

    def test_create_task(self):
        """Test creating a task"""
        try:
            task_data = {
                "title": "Test Task",
                "description": "Test task description",
                "assigned_to": "oboje",
                "created_by": "Admin"
            }
            response = self.session.post(f"{self.base_url}/tasks", json=task_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Task ID: {data.get('id', 'Unknown')}"
                details += f", Status: {data.get('status', 'Unknown')}"
                # Store ID for cleanup
                self.test_task_id = data.get('id')
            self.log_result("Create Task", success, details)
            return success
        except Exception as e:
            self.log_result("Create Task", False, f"Error: {str(e)}")
            return False

    def test_update_task(self):
        """Test updating a task status"""
        if not hasattr(self, 'test_task_id'):
            self.log_result("Update Task", False, "No task ID from create test")
            return False
        
        try:
            update_data = {"status": "in_progress"}
            response = self.session.put(f"{self.base_url}/tasks/{self.test_task_id}", 
                                       json=update_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", New Status: {data.get('status', 'Unknown')}"
            self.log_result("Update Task", success, details)
            return success
        except Exception as e:
            self.log_result("Update Task", False, f"Error: {str(e)}")
            return False

    def test_shopify_configs(self):
        """Test Shopify configs endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/shopify-configs")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Configs count: {len(data)}"
            self.log_result("Get Shopify Configs", success, details)
            return success
        except Exception as e:
            self.log_result("Get Shopify Configs", False, f"Error: {str(e)}")
            return False

    def test_tiktok_configs(self):
        """Test TikTok configs endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/tiktok-configs")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Configs count: {len(data)}"
            self.log_result("Get TikTok Configs", success, details)
            return success
        except Exception as e:
            self.log_result("Get TikTok Configs", False, f"Error: {str(e)}")
            return False

    def test_chat_history(self):
        """Test chat history endpoint"""
        try:
            params = {"shop_id": 1, "limit": 10}
            response = self.session.get(f"{self.base_url}/chat-history", params=params)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Messages count: {len(data)}"
            self.log_result("Get Chat History", success, details)
            return success
        except Exception as e:
            self.log_result("Get Chat History", False, f"Error: {str(e)}")
            return False

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test task
        if hasattr(self, 'test_task_id'):
            try:
                response = self.session.delete(f"{self.base_url}/tasks/{self.test_task_id}")
                if response.status_code == 200:
                    print("✅ Deleted test task")
                else:
                    print(f"⚠️ Failed to delete test task: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error deleting test task: {str(e)}")

        # Delete test income
        if hasattr(self, 'test_income_id'):
            try:
                response = self.session.delete(f"{self.base_url}/incomes/{self.test_income_id}")
                if response.status_code == 200:
                    print("✅ Deleted test income")
                else:
                    print(f"⚠️ Failed to delete test income: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error deleting test income: {str(e)}")

        # Delete test expense
        if hasattr(self, 'test_expense_id'):
            try:
                response = self.session.delete(f"{self.base_url}/expenses/{self.test_expense_id}")
                if response.status_code == 200:
                    print("✅ Deleted test expense")
                else:
                    print(f"⚠️ Failed to delete test expense: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error deleting test expense: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Ecommify Backend API Tests")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 60)

        # Core functionality tests
        self.test_health_check()
        self.test_login_valid_pin()
        self.test_login_invalid_pin()
        
        # Data operations tests
        self.test_monthly_stats()
        self.test_create_income()
        self.test_create_expense()
        
        # Task management tests
        self.test_get_tasks()
        self.test_create_task()
        self.test_update_task()
        
        # Configuration tests
        self.test_shopify_configs()
        self.test_tiktok_configs()
        
        # Chat functionality
        self.test_chat_history()
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 BACKEND TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return {
            "total": self.tests_run,
            "passed": self.tests_passed,
            "failed": self.tests_run - self.tests_passed,
            "success_rate": self.tests_passed/self.tests_run*100,
            "results": self.results
        }

def main():
    tester = EcommifyAPITester()
    results = tester.run_all_tests()
    
    # Return exit code based on success rate
    if results["success_rate"] >= 80:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())