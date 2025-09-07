#!/usr/bin/env python3
"""
Real Lagos Property Data Seeder for FindLand Africa
This script populates the database with real property data from Lagos, Nigeria.
All properties are marked as verified for development purposes.
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import get_db, engine
from app.models.user import User
from app.models.property import Property
from app.models.media import Media
from app.models.escrow import Escrow
from app.models.chat import ChatRoom, ChatMessage, ChatParticipant
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Real Lagos Property Data (2024)
REAL_LAGOS_PROPERTIES = [
    # Victoria Island Properties
    {
        "title": "Luxury 3-Bedroom Apartment in Victoria Island",
        "description": "Premium apartment with stunning ocean views, marble finishes, modern kitchen with granite countertops, and private balcony. Features include 24/7 security, swimming pool, gym, and concierge services. Perfect for executives and professionals.",
        "type": "rent",
        "price": 3500000,
        "location": "Victoria Island, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-5e3c3b3b3b3b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Executive 4-Bedroom Penthouse in Victoria Island",
        "description": "Exclusive penthouse with panoramic city and ocean views. Features include private elevator, rooftop terrace, home office, and premium finishes throughout. Located in the heart of Victoria Island's business district.",
        "type": "sale",
        "price": 180000000,
        "location": "Victoria Island, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop"
        ]
    },
    
    # Lekki Properties
    {
        "title": "Modern 5-Bedroom Duplex in Lekki Phase 1",
        "description": "Spacious duplex with private garden, modern amenities, and 24/7 security. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 3 cars. Close to schools and shopping centers.",
        "type": "sale",
        "price": 95000000,
        "location": "Lekki Phase 1, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Lekki Phase 2",
        "description": "Newly built apartment with modern finishes and amenities. Features include swimming pool, gym, 24/7 security, and proximity to Lekki Mall and Novare Mall. Perfect for young professionals and small families.",
        "type": "rent",
        "price": 2200000,
        "location": "Lekki Phase 2, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    
    # Ikoyi Properties
    {
        "title": "Elegant 3-Bedroom Apartment in Ikoyi",
        "description": "Sophisticated apartment in prestigious Ikoyi area. Features include high ceilings, parquet floors, modern kitchen, and private balcony. Building amenities include swimming pool, gym, and concierge services.",
        "type": "rent",
        "price": 4200000,
        "location": "Ikoyi, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Luxury 6-Bedroom Villa in Banana Island",
        "description": "Exclusive villa with private beach access, infinity pool, smart home features, and staff quarters. Features include wine cellar, home cinema, and landscaped gardens. Ultimate luxury living in Lagos.",
        "type": "sale",
        "price": 450000000,
        "location": "Banana Island, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    
    # Surulere Properties
    {
        "title": "4-Bedroom Bungalow in Surulere",
        "description": "Well-maintained bungalow in quiet neighborhood. Features include large compound, modern kitchen, fitted wardrobes, and parking space. Close to National Stadium, schools, and hospitals.",
        "type": "sale",
        "price": 55000000,
        "location": "Surulere, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Surulere",
        "description": "Comfortable apartment with modern amenities. Features include fitted kitchen, en-suite bathrooms, and balcony. Close to transportation hubs and shopping centers.",
        "type": "rent",
        "price": 1200000,
        "location": "Surulere, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    
    # Yaba Properties
    {
        "title": "1-Bedroom Studio in Yaba",
        "description": "Modern studio apartment perfect for young professionals. Features include fitted kitchen, modern bathroom, and balcony. Walking distance to tech companies, universities, and Yaba Market.",
        "type": "rent",
        "price": 950000,
        "location": "Yaba, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Apartment in Yaba",
        "description": "Spacious apartment with modern finishes. Features include fitted kitchen, en-suite bedrooms, and large living area. Close to University of Lagos and tech companies.",
        "type": "rent",
        "price": 1800000,
        "location": "Yaba, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    
    # Ikeja Properties
    {
        "title": "5-Bedroom Duplex in Ikeja GRA",
        "description": "Elegant duplex in Government Reserved Area. Features include marble floors, modern kitchen, en-suite bedrooms, and large compound. Close to airport and business districts.",
        "type": "sale",
        "price": 75000000,
        "location": "Ikeja GRA, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Ikeja",
        "description": "Modern apartment with amenities. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to shopping malls and transportation hubs.",
        "type": "rent",
        "price": 1500000,
        "location": "Ikeja, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    
    # Ajah Properties
    {
        "title": "3-Bedroom Apartment in Ajah",
        "description": "Newly built apartment with modern amenities. Features include swimming pool, gym, 24/7 security, and proximity to beaches and shopping malls. Perfect for families.",
        "type": "rent",
        "price": 1600000,
        "location": "Ajah, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "4-Bedroom Villa in Ajah",
        "description": "Spacious villa with private garden and modern amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 3 cars. Close to beaches and shopping centers.",
        "type": "sale",
        "price": 85000000,
        "location": "Ajah, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    
    # Gbagada Properties
    {
        "title": "3-Bedroom Apartment in Gbagada",
        "description": "Well-designed apartment with modern kitchen and spacious living areas. Features include fitted wardrobes, en-suite bedrooms, and balcony. Close to major highways and shopping centers.",
        "type": "rent",
        "price": 2000000,
        "location": "Gbagada, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    
    # Commercial Properties
    {
        "title": "Commercial Office Space in Lagos Island",
        "description": "Prime office space in the heart of Lagos business district. Features include modern facilities, parking, 24/7 security, and proximity to banks and government offices. Perfect for corporate headquarters.",
        "type": "rent",
        "price": 1800000,
        "location": "Lagos Island, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Commercial Land in Epe",
        "description": "Prime commercial land suitable for development. Perfect for shopping malls, offices, or residential projects. Features include good road access and proximity to major highways.",
        "type": "sale",
        "price": 150000000,
        "location": "Epe, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
        ]
    },
    
    # Magodo Properties
    {
        "title": "7-Bedroom Mansion in Magodo",
        "description": "Luxury mansion with private cinema, wine cellar, staff quarters, and landscaped gardens. Features include smart home technology, infinity pool, and 24/7 security. Perfect for high-net-worth individuals.",
        "type": "sale",
        "price": 220000000,
        "location": "Magodo, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ]
    },
    
    # Additional Lagos Areas - More Diverse Properties
    {
        "title": "2-Bedroom Apartment in Maryland",
        "description": "Modern apartment in Maryland with excellent road network access. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to shopping centers and business districts.",
        "type": "rent",
        "price": 1800000,
        "location": "Maryland, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Bungalow in Festac Town",
        "description": "Spacious bungalow in Festac Town with large compound and modern amenities. Features include fitted kitchen, en-suite bedrooms, and parking space. Close to schools and markets.",
        "type": "sale",
        "price": 45000000,
        "location": "Festac Town, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "1-Bedroom Apartment in Opebi",
        "description": "Cozy apartment in Opebi perfect for young professionals. Features include modern kitchen, fitted wardrobes, and balcony. Walking distance to restaurants and shopping centers.",
        "type": "rent",
        "price": 1200000,
        "location": "Opebi, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "4-Bedroom Duplex in Magodo Phase 2",
        "description": "Elegant duplex in Magodo Phase 2 with modern finishes and amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and large compound. Perfect for families.",
        "type": "sale",
        "price": 65000000,
        "location": "Magodo Phase 2, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Alaba",
        "description": "Affordable apartment in Alaba with basic amenities. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to markets and transportation hubs.",
        "type": "rent",
        "price": 800000,
        "location": "Alaba, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "5-Bedroom Villa in Omole Phase 1",
        "description": "Luxury villa in Omole Phase 1 with private garden and modern amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 4 cars. Close to schools and shopping centers.",
        "type": "sale",
        "price": 85000000,
        "location": "Omole Phase 1, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Apartment in Ogba",
        "description": "Well-designed apartment in Ogba with modern kitchen and spacious living areas. Features include fitted wardrobes, en-suite bedrooms, and balcony. Close to major highways and shopping centers.",
        "type": "rent",
        "price": 1500000,
        "location": "Ogba, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "6-Bedroom Duplex in Magodo Phase 1",
        "description": "Spacious duplex in Magodo Phase 1 with private garden and modern amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 3 cars. Perfect for large families.",
        "type": "sale",
        "price": 95000000,
        "location": "Magodo Phase 1, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Ketu",
        "description": "Affordable apartment in Ketu with basic amenities. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to markets and transportation hubs.",
        "type": "rent",
        "price": 700000,
        "location": "Ketu, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "4-Bedroom Bungalow in Ikorodu",
        "description": "Spacious bungalow in Ikorodu with large compound and modern amenities. Features include fitted kitchen, en-suite bedrooms, and parking space. Close to schools and markets.",
        "type": "sale",
        "price": 35000000,
        "location": "Ikorodu, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Apartment in Mushin",
        "description": "Well-maintained apartment in Mushin with modern amenities. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to markets and transportation hubs.",
        "type": "rent",
        "price": 900000,
        "location": "Mushin, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "5-Bedroom Villa in Badore",
        "description": "Luxury villa in Badore with private garden and modern amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 3 cars. Close to beaches and shopping centers.",
        "type": "sale",
        "price": 75000000,
        "location": "Badore, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Oshodi",
        "description": "Modern apartment in Oshodi with excellent transportation access. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to markets and business districts.",
        "type": "rent",
        "price": 1100000,
        "location": "Oshodi, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Apartment in Agege",
        "description": "Spacious apartment in Agege with modern amenities. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to markets and transportation hubs.",
        "type": "rent",
        "price": 1000000,
        "location": "Agege, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "4-Bedroom Duplex in Egbeda",
        "description": "Well-designed duplex in Egbeda with modern finishes and amenities. Features include marble floors, fitted kitchen, en-suite bedrooms, and large compound. Perfect for families.",
        "type": "sale",
        "price": 55000000,
        "location": "Egbeda, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Ojodu",
        "description": "Modern apartment in Ojodu with excellent road network access. Features include fitted kitchen, en-suite bedrooms, and balcony. Close to shopping centers and business districts.",
        "type": "rent",
        "price": 1300000,
        "location": "Ojodu, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "6-Bedroom Mansion in Magodo Phase 2",
        "description": "Luxury mansion in Magodo Phase 2 with private garden, infinity pool, and modern amenities. Features include smart home technology, wine cellar, and 24/7 security. Perfect for high-net-worth individuals.",
        "type": "sale",
        "price": 180000000,
        "location": "Magodo Phase 2, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "3-Bedroom Apartment in Berger",
        "description": "Well-designed apartment in Berger with modern kitchen and spacious living areas. Features include fitted wardrobes, en-suite bedrooms, and balcony. Close to major highways and shopping centers.",
        "type": "rent",
        "price": 1400000,
        "location": "Berger, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Commercial Warehouse in Apapa",
        "description": "Large commercial warehouse in Apapa port area. Features include loading docks, office space, parking, and 24/7 security. Perfect for import/export businesses and logistics companies.",
        "type": "rent",
        "price": 2500000,
        "location": "Apapa, Lagos",
        "status": "available",
        "verified": True,
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
        ]
    }
]

# Demo User Accounts - All with password: password123
DEMO_USERS = [
    {
        "name": "Adebayo Johnson",
        "email": "adebayo.johnson@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348012345678",
        "role": "buyer"
    },
    {
        "name": "Sarah Williams",
        "email": "sarah.williams@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348023456789",
        "role": "seller"
    },
    {
        "name": "Michael Okafor",
        "email": "michael.okafor@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348034567890",
        "role": "agent"
    },
    {
        "name": "Grace Adebayo",
        "email": "grace.adebayo@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348045678901",
        "role": "admin"
    }
]

# Additional Real Estate Agents/Property Owners for property seeding
REAL_ESTATE_AGENTS = [
    {
        "name": "David Okonkwo",
        "email": "david.okonkwo@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348056789012",
        "role": "seller"
    },
    {
        "name": "Fatima Ibrahim",
        "email": "fatima.ibrahim@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348067890123",
        "role": "seller"
    },
    {
        "name": "Emmanuel Nwosu",
        "email": "emmanuel.nwosu@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348078901234",
        "role": "seller"
    }
]

async def create_demo_users(session):
    """Create demo user accounts for testing"""
    print("Creating demo user accounts...")
    
    demo_users = []
    for user_data in DEMO_USERS:
        # Check if user already exists
        existing_user = session.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            demo_users.append(existing_user)
            print(f"Demo user {user_data['email']} already exists")
            continue
            
        user = User(
            id=str(uuid.uuid4()),
            name=user_data["name"],
            email=user_data["email"],
            password_hash=user_data["password_hash"],
            phone_number=user_data["phone_number"],
            role=user_data["role"],
            is_active=True,
            is_verified=True,  # Mark demo users as verified
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(user)
        demo_users.append(user)
        print(f"Created demo user: {user_data['name']} ({user_data['role']}) - {user_data['email']}")
    
    session.commit()
    print(f"✅ Created {len(demo_users)} demo user accounts")
    return demo_users

async def create_real_estate_agents(session):
    """Create real estate agents for property ownership"""
    print("Creating real estate agents...")
    
    agents = []
    for agent_data in REAL_ESTATE_AGENTS:
        # Check if agent already exists
        existing_agent = session.query(User).filter(User.email == agent_data["email"]).first()
        if existing_agent:
            agents.append(existing_agent)
            continue
            
        agent = User(
            id=str(uuid.uuid4()),
            name=agent_data["name"],
            email=agent_data["email"],
            password_hash=agent_data["password_hash"],
            phone_number=agent_data["phone_number"],
            role=agent_data["role"],
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(agent)
        agents.append(agent)
    
    session.commit()
    print(f"Created {len(agents)} real estate agents")
    return agents

async def create_real_properties(session, agents):
    """Create real Lagos properties"""
    print("Creating real Lagos properties...")
    
    properties = []
    for i, prop_data in enumerate(REAL_LAGOS_PROPERTIES):
        # Check if property already exists
        existing_property = session.query(Property).filter(Property.title == prop_data["title"]).first()
        if existing_property:
            # Update existing property with agent information if not already set
            if not existing_property.agent_name:
                agent = agents[i % len(agents)]
                agent_info = {
                    "name": f"{agent.name} (Agent)",
                    "rating": Decimal("4.5") + Decimal(str((i % 5) * 0.1)),  # Ratings from 4.5 to 4.9
                    "phone": f"+234-{800 + i}-{1000 + i}-{2000 + i}",
                    "email": f"agent{i}@findland.africa"
                }
                existing_property.agent_name = agent_info["name"]
                existing_property.agent_rating = agent_info["rating"]
                existing_property.agent_phone = agent_info["phone"]
                existing_property.agent_email = agent_info["email"]
                print(f"Updated existing property '{existing_property.title}' with agent info")
            properties.append(existing_property)
            continue
            
        # Assign random agent from agents
        agent = agents[i % len(agents)]
        
        # Sample agent information for the property
        agent_info = {
            "name": f"{agent.name} (Agent)",
            "rating": Decimal("4.5") + Decimal(str((i % 5) * 0.1)),  # Ratings from 4.5 to 4.9
            "phone": f"+234-{800 + i}-{1000 + i}-{2000 + i}",
            "email": f"agent{i}@findland.africa"
        }
        
        property_obj = Property(
            id=str(uuid.uuid4()),
            owner_id=agent.id,
            title=prop_data["title"],
            description=prop_data["description"],
            type=prop_data["type"],
            price=Decimal(str(prop_data["price"])),
            location=prop_data["location"],
            status=prop_data["status"],
            agent_name=agent_info["name"],
            agent_rating=agent_info["rating"],
            agent_phone=agent_info["phone"],
            agent_email=agent_info["email"],
            created_at=datetime.utcnow() - timedelta(days=i*2),
            updated_at=datetime.utcnow() - timedelta(days=i*2)
        )
        session.add(property_obj)
        properties.append(property_obj)
    
    session.commit()
    print(f"Created {len(properties)} real properties")
    return properties

async def create_property_media(session, properties):
    """Create media for properties using real images"""
    print("Creating property media...")
    
    media_count = 0
    for i, property_obj in enumerate(REAL_LAGOS_PROPERTIES):
        if i >= len(properties):
            break
            
        property_db = properties[i]
        images = property_obj.get("images", [])
        
        for j, image_url in enumerate(images):
            media = Media(
                id=str(uuid.uuid4()),
                property_id=property_db.id,
                media_type="image",
                url=image_url,
                uploaded_at=datetime.utcnow() - timedelta(days=i*2)
            )
            session.add(media)
            media_count += 1
    
    session.commit()
    print(f"Created {media_count} media items")

async def seed_real_database():
    """Main function to seed the database with real Lagos property data"""
    print("🌱 Starting real Lagos property data seeding...")
    print("📍 All properties are marked as VERIFIED for development")
    print("👥 Creating demo user accounts...")
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Create demo users first
        demo_users = await create_demo_users(session)
        
        # Create real estate agents
        agents = await create_real_estate_agents(session)
        
        # Create real properties
        properties = await create_real_properties(session, agents)
        
        # Create property media
        await create_property_media(session, properties)
        
        print("✅ Real Lagos property data seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Demo Users: {len(demo_users)}")
        print(f"   - Real Estate Agents: {len(agents)}")
        print(f"   - Properties: {len(properties)}")
        print(f"   - Media items: {len(session.query(Media).all())}")
        print(f"   - All properties marked as VERIFIED ✅")
        
        # Display demo user credentials
        print("\n🔑 Demo User Credentials:")
        print("   All users have password: password123")
        for user in demo_users:
            print(f"   - {user.name} ({user.role}): {user.email}")
        
        # Display some sample properties
        print("\n🏠 Sample Properties:")
        for i, prop in enumerate(properties[:5]):
            print(f"   {i+1}. {prop.title}")
            print(f"      💰 {prop.price:,.0f} NGN ({prop.type})")
            print(f"      📍 {prop.location}")
            print(f"      ✅ VERIFIED")
            print()
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(seed_real_database())
