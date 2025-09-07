# Seller Account Setup Guide

## 🎯 Overview
This guide explains how to test the full conversation flow between buyers and sellers using the seller account that has been set up.

## 🔐 Seller Account Credentials

**Email:** `seller@example.com`  
**Password:** `password123`  
**Name:** Michael Okafor  
**Role:** Seller  

## 🏠 Properties Setup

✅ **All 38 properties** in the database have been assigned to the seller account  
✅ **Properties include:**
- Luxury 3-Bedroom Apartment in Victoria Island (₦3,500,000)
- Modern 5-Bedroom Duplex in Lekki Phase 1 (₦95,000,000)
- Elegant 3-Bedroom Apartment in Ikoyi (₦4,200,000)
- 2-Bedroom Apartment in Yaba (₦1,800,000)
- And 34 more properties across Lagos

## 🧪 Testing the Conversation Flow

### Step 1: Login as Seller
1. Go to the frontend application
2. Login with seller credentials:
   - Email: `seller@example.com`
   - Password: `password123`
3. You should see the seller dashboard with all 38 properties

### Step 2: Login as Buyer (in another browser/incognito)
1. Use any existing buyer account or create a new one
2. Browse properties and click "Chat" on any property
3. Send a message like: "I'm interested in this property"

### Step 3: Switch Back to Seller Account
1. Go to the seller dashboard
2. Navigate to the "Chats" tab
3. You should see the conversation from the buyer
4. Reply to the buyer's message

### Step 4: Test Full Flow
1. Continue the conversation between buyer and seller
2. Test features like:
   - Message delivery status (purple double checkmarks)
   - Online status indicators
   - Property information in chat
   - Back navigation

## 🔧 Technical Details

### Database Changes Made:
- Created seller account: `Michael Okafor (seller@example.com)`
- Updated all 38 properties to be owned by the seller
- Fixed model relationship issues for testing

### API Endpoints Available:
- `POST /api/v1/auth/login` - Login with form data
- `GET /api/v1/auth/me` - Get current user info
- `GET /api/v1/fast/properties` - Get seller's properties
- `GET /api/v1/fast/chat/rooms` - Get seller's chat rooms

## 🚀 Next Steps

1. **Test Buyer-Seller Chat Flow:**
   - Login as buyer in one browser
   - Login as seller in another browser
   - Start a conversation about a property
   - Test message delivery and online status

2. **Test Seller Dashboard:**
   - Verify all properties are visible
   - Check property management features
   - Test chat room management

3. **Test Real-time Features:**
   - Online/offline status
   - Message delivery indicators
   - Chat room creation and management

## 🐛 Troubleshooting

### If login fails:
- Check that the backend is running on `http://localhost:8000`
- Verify the seller account exists in the database
- Check browser console for any errors

### If properties don't show:
- Verify the seller account is properly assigned as owner
- Check the API response in browser network tab
- Ensure the frontend is calling the correct endpoints

### If chat rooms don't appear:
- Make sure a buyer has started a conversation
- Check that the chat room is properly created
- Verify the seller has access to the chat room

## 📝 Notes

- The seller account has been set up with all necessary permissions
- All properties are now owned by the seller for testing purposes
- The chat system supports real-time messaging between buyers and sellers
- Online status indicators show when users are active in chat rooms
- Message delivery status shows purple double checkmarks when messages are read

---

**Happy Testing! 🎉**
