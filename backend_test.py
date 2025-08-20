import requests
import sys
from datetime import datetime
import json

class ModularAppAPITester:
    def __init__(self, base_url="https://sprite-orchestrator.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
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
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_create_status_check(self):
        """Test creating a status check"""
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data=test_data
        )
        
        if success and isinstance(response, dict):
            return response.get('id')
        return None

    def test_get_status_checks(self):
        """Test getting all status checks"""
        return self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )

    def test_cors_headers(self):
        """Test CORS headers are present"""
        url = f"{self.base_url}/api/"
        print(f"\n🔍 Testing CORS Headers...")
        print(f"   URL: {url}")
        
        try:
            response = requests.options(url, timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            found_headers = []
            for header in cors_headers:
                if header in headers:
                    found_headers.append(header)
                    print(f"   ✅ {header}: {headers[header]}")
                else:
                    print(f"   ❌ Missing: {header}")
            
            success = len(found_headers) > 0
            if success:
                self.tests_passed += 1
                print("✅ CORS headers present")
            else:
                print("❌ No CORS headers found")
                
            self.tests_run += 1
            return success
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.tests_run += 1
            return False

def main():
    print("🚀 Starting Modular Cross-Platform Application API Tests")
    print("=" * 60)
    
    # Setup
    tester = ModularAppAPITester()
    
    # Test basic API functionality
    print("\n📡 Testing Basic API Endpoints...")
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test status check creation
    status_id = tester.test_create_status_check()
    
    # Test getting status checks
    tester.test_get_status_checks()
    
    # Test CORS configuration
    tester.test_cors_headers()
    
    # Test error handling
    print("\n🔧 Testing Error Handling...")
    tester.run_test(
        "Invalid Endpoint",
        "GET",
        "nonexistent",
        404
    )
    
    tester.run_test(
        "Invalid Method",
        "DELETE",
        "",
        405
    )
    
    # Test malformed data
    tester.run_test(
        "Malformed POST Data",
        "POST",
        "status",
        422,  # Validation error
        data={"invalid_field": "test"}
    )

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 API Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All API tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())