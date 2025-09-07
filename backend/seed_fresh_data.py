#!/usr/bin/env python3
"""
Fresh Data Seeder for FindLand Africa
This script creates new test accounts and properties for testing.
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
from app.models.user import User, UserRole
from app.models.property import Property
from app.models.media import Media
from app.models.chat import ChatRoom, ChatMessage, ChatParticipant
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# New Demo User Accounts - All with password: password123
NEW_DEMO_USERS = [
    {
        "name": "Adebayo Johnson",
        "email": "adebayo.johnson@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348012345678",
        "role": UserRole.BUYER
    },
    {
        "name": "Sarah Williams",
        "email": "sarah.williams@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348023456789",
        "role": UserRole.SELLER
    },
    {
        "name": "Michael Okafor",
        "email": "michael.okafor@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348034567890",
        "role": UserRole.AGENT
    },
    {
        "name": "Grace Adebayo",
        "email": "grace.adebayo@findland.africa",
        "password_hash": "$2b$12$tybyQF9oloUI5C9XMv.2H.0i218eZGX6iC33/fkcdQD41ob0xnlLS",  # password: "password123"
        "phone_number": "+2348045678901",
        "role": UserRole.ADMIN
    }
]

# Sample Properties for Testing
SAMPLE_PROPERTIES = [
    {
        "title": "Luxury 3-Bedroom Apartment in Victoria Island",
        "description": "Premium apartment with stunning ocean views, marble finishes, modern kitchen with granite countertops, and private balcony. Features include 24/7 security, swimming pool, gym, and concierge services.",
        "type": "rent",
        "price": 3500000,
        "location": "Victoria Island, Lagos",
        "status": "available",
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Modern 5-Bedroom Duplex in Lekki Phase 1",
        "description": "Spacious duplex with private garden, modern amenities, and 24/7 security. Features include marble floors, fitted kitchen, en-suite bedrooms, and parking for 3 cars.",
        "type": "sale",
        "price": 95000000,
        "location": "Lekki Phase 1, Lagos",
        "status": "available",
        "images": [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "Elegant 3-Bedroom Apartment in Ikoyi",
        "description": "Sophisticated apartment in prestigious Ikoyi area. Features include high ceilings, parquet floors, modern kitchen, and private balcony. Building amenities include swimming pool, gym, and concierge services.",
        "type": "rent",
        "price": 4200000,
        "location": "Ikoyi, Lagos",
        "status": "available",
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "4-Bedroom Bungalow in Surulere",
        "description": "Well-maintained bungalow in quiet neighborhood. Features include large compound, modern kitchen, fitted wardrobes, and parking space. Close to National Stadium, schools, and hospitals.",
        "type": "sale",
        "price": 55000000,
        "location": "Surulere, Lagos",
        "status": "available",
        "images": [
            "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&h=600&fit=crop"
        ]
    },
    {
        "title": "2-Bedroom Apartment in Yaba",
        "description": "Modern apartment perfect for young professionals. Features include fitted kitchen, modern bathroom, and balcony. Walking distance to tech companies, universities, and Yaba Market.",
        "type": "rent",
        "price": 1800000,
        "location": "Yaba, Lagos",
        "status": "available",
        "images": [
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ]
    }
]

async def create_demo_users(session):
    """Create demo user accounts for testing"""
    print("Creating demo user accounts...")
    
    demo_users = []
    for user_data in NEW_DEMO_USERS:
        user = User(
            id=str(uuid.uuid4()),
            name=user_data["name"],
            email=user_data["email"],
            password_hash=user_data["password_hash"],
            phone_number=user_data["phone_number"],
            role=user_data["role"],
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(user)
        demo_users.append(user)
        print(f"Created demo user: {user_data['name']} ({user_data['role']}) - {user_data['email']}")
    
    session.commit()
    print(f"✅ Created {len(demo_users)} demo user accounts")
    return demo_users

async def create_sample_properties(session, users):
    """Create sample properties"""
    print("Creating sample properties...")
    
    # Get seller and agent users
    seller = next((u for u in users if u.role == UserRole.SELLER), None)
    agent = next((u for u in users if u.role == UserRole.AGENT), None)
    
    if not seller or not agent:
        print("❌ Need both seller and agent users to create properties")
        return []
    
    properties = []
    for i, prop_data in enumerate(SAMPLE_PROPERTIES):
        # Alternate between seller and agent as property owners
        owner = seller if i % 2 == 0 else agent
        
        property_obj = Property(
            id=str(uuid.uuid4()),
            owner_id=owner.id,
            title=prop_data["title"],
            description=prop_data["description"],
            type=prop_data["type"],
            price=Decimal(str(prop_data["price"])),
            location=prop_data["location"],
            status=prop_data["status"],
            agent_name=f"{agent.name} (Agent)",
            agent_rating=Decimal("4.5") + Decimal(str((i % 5) * 0.1)),
            agent_phone=f"+234-{800 + i}-{1000 + i}-{2000 + i}",
            agent_email=f"agent{i}@findland.africa",
            created_at=datetime.utcnow() - timedelta(days=i*2),
            updated_at=datetime.utcnow() - timedelta(days=i*2)
        )
        session.add(property_obj)
        properties.append(property_obj)
        print(f"Created property: {prop_data['title']}")
    
    session.commit()
    print(f"✅ Created {len(properties)} sample properties")
    return properties

async def create_property_media(session, properties):
    """Create media for properties"""
    print("Creating property media...")
    
    media_count = 0
    for i, property_obj in enumerate(properties):
        if i >= len(SAMPLE_PROPERTIES):
            break
            
        images = SAMPLE_PROPERTIES[i].get("images", [])
        
        for j, image_url in enumerate(images):
            media = Media(
                id=str(uuid.uuid4()),
                property_id=property_obj.id,
                media_type="image",
                url=image_url,
                uploaded_at=datetime.utcnow() - timedelta(days=i*2)
            )
            session.add(media)
            media_count += 1
    
    session.commit()
    print(f"✅ Created {media_count} media items")

async def seed_fresh_database():
    """Main function to seed the database with fresh data"""
    print("🌱 Starting fresh data seeding...")
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Create demo users first
        demo_users = await create_demo_users(session)
        
        # Create sample properties
        properties = await create_sample_properties(session, demo_users)
        
        # Create property media
        await create_property_media(session, properties)
        
        print("✅ Fresh data seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Demo Users: {len(demo_users)}")
        print(f"   - Properties: {len(properties)}")
        print(f"   - Media items: {len(session.query(Media).all())}")
        
        # Display demo user credentials
        print("\n🔑 Demo User Credentials:")
        print("   All users have password: password123")
        for user in demo_users:
            print(f"   - {user.name} ({user.role.value}): {user.email}")
        
        # Display sample properties
        print("\n🏠 Sample Properties:")
        for i, prop in enumerate(properties):
            print(f"   {i+1}. {prop.title}")
            print(f"      💰 {prop.price:,.0f} NGN ({prop.type})")
            print(f"      📍 {prop.location}")
            print()
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(seed_fresh_database())
