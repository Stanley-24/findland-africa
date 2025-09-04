# 🔑 Demo User Credentials

This document contains the demo user credentials for testing the FindLand Africa platform.

## Demo Accounts

All demo accounts use the password: **`password123`**

### 👤 Buyer Account
- **Name:** Adebayo Johnson
- **Email:** adebayo.johnson@findland.africa
- **Password:** password123
- **Phone:** +2348012345678
- **Role:** buyer

### 🏠 Seller Account
- **Name:** Sarah Williams
- **Email:** sarah.williams@findland.africa
- **Password:** password123
- **Phone:** +2348023456789
- **Role:** seller

### 🤝 Agent Account
- **Name:** Michael Okafor
- **Email:** michael.okafor@findland.africa
- **Password:** password123
- **Phone:** +2348034567890
- **Role:** agent

### ⚙️ Admin Account
- **Name:** Grace Adebayo
- **Email:** grace.adebayo@findland.africa
- **Password:** password123
- **Phone:** +2348045678901
- **Role:** admin

## How to Use

1. **Login to the platform** using any of the above email addresses
2. **Use the password:** `password123` for all accounts
3. **Test different user roles** and their respective permissions
4. **Explore the platform features** based on each user's role

## Role Permissions

### Buyer
- Browse and search properties
- View property details
- Contact sellers/agents
- Initiate escrow transactions
- Access buyer dashboard

### Seller
- List properties for sale/rent
- Manage property listings
- Respond to buyer inquiries
- Access seller dashboard
- Manage escrow transactions

### Agent
- Manage multiple properties
- Assist buyers and sellers
- Access agent dashboard
- View all transactions
- Manage client relationships

### Admin
- Full platform access
- User management
- System monitoring
- Access admin dashboard
- Platform configuration

## Database Seeding

To create these demo accounts in your database, run:

```bash
cd backend
python seed_real_data.py
```

This will create all demo users along with sample property data for testing.

## Security Note

⚠️ **These are demo credentials for development/testing only.**
- Do not use these credentials in production
- Change all passwords before deploying to production
- These accounts are marked as verified for testing purposes
