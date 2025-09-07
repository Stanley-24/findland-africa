#!/usr/bin/env python3
"""
Script to test seller login and view properties
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def login_seller():
    """Login as seller and get token"""
    login_data = {
        "username": "seller@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Successfully logged in as seller")
        print(f"🔑 Token: {token[:20]}...")
        
        # Get user info
        headers = {"Authorization": f"Bearer {token}"}
        user_response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
        if user_response.status_code == 200:
            user = user_response.json()
            print(f"👤 User: {user['name']} ({user['email']})")
            return token, user
        else:
            return token, None
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None, None

def get_seller_properties(token):
    """Get properties owned by the seller"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/v1/fast/properties", headers=headers)
    
    if response.status_code == 200:
        properties = response.json()
        print(f"\n🏠 Found {len(properties)} properties owned by seller:")
        for prop in properties[:5]:  # Show first 5
            print(f"  - {prop['title']} - {prop['location']} (₦{prop['price']:,.0f})")
        if len(properties) > 5:
            print(f"  ... and {len(properties) - 5} more properties")
        return properties
    else:
        print(f"❌ Failed to get properties: {response.status_code} - {response.text}")
        return []

def get_seller_chat_rooms(token):
    """Get chat rooms for the seller"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/v1/fast/chat/rooms", headers=headers)
    
    if response.status_code == 200:
        chat_rooms = response.json()
        print(f"\n💬 Found {len(chat_rooms)} chat rooms:")
        for room in chat_rooms[:3]:  # Show first 3
            print(f"  - {room.get('name', 'Chat Room')} - {room.get('property_title', 'No property')}")
        if len(chat_rooms) > 3:
            print(f"  ... and {len(chat_rooms) - 3} more chat rooms")
        return chat_rooms
    else:
        print(f"❌ Failed to get chat rooms: {response.status_code} - {response.text}")
        return []

def main():
    print("🔐 Testing Seller Login and Properties...")
    print("=" * 50)
    
    # Login as seller
    token, user = login_seller()
    if not token:
        return
    
    # Get seller's properties
    properties = get_seller_properties(token)
    
    # Get seller's chat rooms
    chat_rooms = get_seller_chat_rooms(token)
    
    print("\n" + "=" * 50)
    print("📋 Summary:")
    print(f"  - Seller: {user['name']} ({user['email']})")
    print(f"  - Properties: {len(properties)}")
    print(f"  - Chat Rooms: {len(chat_rooms)}")
    
    print("\n🚀 Next Steps:")
    print("1. Use the seller credentials to log in to the frontend:")
    print("   Email: seller@example.com")
    print("   Password: password123")
    print("2. You should see all properties in the seller dashboard")
    print("3. When buyers chat about properties, you'll see the conversations")
    print("4. Test the full conversation flow between buyer and seller")

if __name__ == "__main__":
    main()
