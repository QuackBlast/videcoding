#!/usr/bin/env python3
"""
Backend API Testing for Student Platform MVP
Tests all API endpoints with comprehensive coverage
"""

import requests
import sys
import json
import time
from datetime import datetime
import tempfile
import os

class StudentPlatformTester:
    def __init__(self, base_url="https://265d8ece-c4cb-4572-8972-ff031e5fac86.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_note_id = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, data=data, files=files, timeout=30)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "university": "Test University"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/register",
            200,
            data=test_user
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = test_user
            self.log(f"   Registered user: {test_user['email']}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            self.log("❌ No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"   Logged in user: {login_data['email']}")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "api/login",
            401,
            data=invalid_login
        )
        return success

    def create_test_pdf(self):
        """Create a simple test PDF file"""
        try:
            # Create a simple text file that we'll treat as PDF for testing
            content = """
            Test PDF Content for Student Platform
            
            This is a sample document for testing the upload functionality.
            It contains some basic text that should be processed by the AI system.
            
            Topics covered:
            - Data Structures
            - Algorithms
            - Computer Science Fundamentals
            
            This document is used for testing purposes only.
            """
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', mode='w')
            temp_file.write(content)
            temp_file.close()
            
            return temp_file.name
        except Exception as e:
            self.log(f"Error creating test PDF: {e}")
            return None

    def test_note_upload(self):
        """Test PDF note upload"""
        if not self.token:
            self.log("❌ No authentication token for upload test")
            return False
            
        pdf_path = self.create_test_pdf()
        if not pdf_path:
            return False
            
        try:
            upload_data = {
                'title': 'Test Computer Science Notes',
                'university': 'Test University',
                'course_code': 'CS101',
                'book_reference': 'Introduction to Computer Science',
                'description': 'Test notes for computer science fundamentals',
                'price': '0.0'
            }
            
            with open(pdf_path, 'rb') as f:
                files = {'file': ('test_notes.pdf', f, 'application/pdf')}
                
                success, response = self.run_test(
                    "Note Upload",
                    "POST",
                    "api/upload-note",
                    200,
                    data=upload_data,
                    files=files
                )
                
            if success and 'note_id' in response:
                self.uploaded_note_id = response['note_id']
                self.log(f"   Uploaded note ID: {self.uploaded_note_id}")
                self.log(f"   AI Summary: {response.get('summary', 'N/A')[:100]}...")
                self.log(f"   Flashcards generated: {len(response.get('flashcards', []))}")
                self.log(f"   Quiz questions generated: {len(response.get('quiz', []))}")
                return True
                
        except Exception as e:
            self.log(f"Error in note upload: {e}")
        finally:
            # Clean up temp file
            try:
                os.unlink(pdf_path)
            except:
                pass
                
        return False

    def test_search_notes(self):
        """Test note search functionality"""
        # Test search without parameters
        success1, response1 = self.run_test(
            "Search Notes (No Params)",
            "GET",
            "api/search-notes",
            200
        )
        
        # Test search with university parameter
        success2, response2 = self.run_test(
            "Search Notes (University)",
            "GET",
            "api/search-notes",
            200,
            params={'university': 'Test University'}
        )
        
        # Test search with course code
        success3, response3 = self.run_test(
            "Search Notes (Course Code)",
            "GET",
            "api/search-notes",
            200,
            params={'course_code': 'CS101'}
        )
        
        # Test search with keyword
        success4, response4 = self.run_test(
            "Search Notes (Keyword)",
            "GET",
            "api/search-notes",
            200,
            params={'keyword': 'computer'}
        )
        
        if success1 and 'notes' in response1:
            self.log(f"   Found {len(response1['notes'])} notes in general search")
            
        return success1 and success2 and success3 and success4

    def test_get_note_details(self):
        """Test getting note details"""
        if not self.uploaded_note_id:
            self.log("❌ No uploaded note ID for details test")
            return False
            
        success, response = self.run_test(
            "Get Note Details",
            "GET",
            f"api/note/{self.uploaded_note_id}",
            200
        )
        
        if success:
            self.log(f"   Note title: {response.get('title', 'N/A')}")
            self.log(f"   Note price: {response.get('price', 'N/A')}")
            self.log(f"   Has access required: {response.get('access_required', False)}")
            return True
            
        return False

    def test_note_comment(self):
        """Test adding comment to note"""
        if not self.uploaded_note_id:
            self.log("❌ No uploaded note ID for comment test")
            return False
            
        comment_data = {
            "note_id": self.uploaded_note_id,
            "comment": "This is a test comment for the uploaded note. Great content!",
            "rating": 5
        }
        
        success, response = self.run_test(
            "Add Note Comment",
            "POST",
            "api/comment-note",
            200,
            data=comment_data
        )
        
        return success

    def test_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log("❌ No authentication token for profile test")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "api/profile",
            200
        )
        
        if success:
            self.log(f"   User email: {response.get('email', 'N/A')}")
            self.log(f"   Notes uploaded: {response.get('notes_uploaded', 0)}")
            self.log(f"   Earnings: {response.get('earnings', 0)} SEK")
            return True
            
        return False

    def test_my_notes(self):
        """Test getting user's uploaded notes"""
        if not self.token:
            self.log("❌ No authentication token for my notes test")
            return False
            
        success, response = self.run_test(
            "Get My Notes",
            "GET",
            "api/my-notes",
            200
        )
        
        if success and 'notes' in response:
            self.log(f"   User has {len(response['notes'])} uploaded notes")
            return True
            
        return False

    def test_my_purchases(self):
        """Test getting user's purchased notes"""
        if not self.token:
            self.log("❌ No authentication token for purchases test")
            return False
            
        success, response = self.run_test(
            "Get My Purchases",
            "GET",
            "api/my-purchases",
            200
        )
        
        if success and 'notes' in response:
            self.log(f"   User has {len(response['notes'])} purchased notes")
            return True
            
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "api/profile",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("🚀 Starting Student Platform Backend Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Authentication Tests
        self.log("\n📝 Authentication Tests")
        self.test_user_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # Note Management Tests
        self.log("\n📚 Note Management Tests")
        self.test_note_upload()
        self.test_search_notes()
        self.test_get_note_details()
        self.test_note_comment()
        
        # User Profile Tests
        self.log("\n👤 User Profile Tests")
        self.test_user_profile()
        self.test_my_notes()
        self.test_my_purchases()
        
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test execution"""
    tester = StudentPlatformTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())