# 🔧 FindLand Africa – API & Database Blueprint

## Database Schema (PostgreSQL)

### Users Table
- **id** (UUID, PK)
- **name** (Text)
- **email** (Text, unique)
- **password_hash** (Text)
- **phone_number** (Text)
- **role** (Enum: buyer, seller, agent, admin)
- **created_at** (Timestamp)
- **updated_at** (Timestamp)

### Properties Table
- **id** (UUID, PK)
- **owner_id** (FK → Users.id)
- **title** (Text)
- **description** (Text)
- **type** (Enum: rent, sale)
- **price** (Decimal)
- **location** (Text / GIS)
- **status** (Enum: available, pending, sold, rented)
- **created_at** (Timestamp)
- **updated_at** (Timestamp)

### Media Table
- **id** (UUID, PK)
- **property_id** (FK → Properties.id)
- **media_type** (Enum: image, video, document)
- **url** (Text)
- **uploaded_at** (Timestamp)

### Escrows Table
- **id** (UUID, PK)
- **buyer_id** (FK → Users.id)
- **seller_id** (FK → Users.id)
- **property_id** (FK → Properties.id)
- **amount** (Decimal)
- **status** (Enum: pending, funded, released, cancelled)
- **created_at** (Timestamp)

### Chats Table
- **id** (UUID, PK)
- **escrow_id** (FK → Escrows.id, nullable)
- **sender_id** (FK → Users.id)
- **receiver_id** (FK → Users.id)
- **message** (Text)
- **type** (Enum: text, file, audio, video)
- **file_url** (Nullable)
- **sent_at** (Timestamp)

---

## API Endpoints (FastAPI) — Versioned /v1

### Auth
- **POST /api/v1/auth/register** – Create user
- **POST /api/v1/auth/login** – JWT login
- **GET /api/v1/auth/me** – Get profile

### Users
- **GET /api/v1/users/{id}** – Get user by ID
- **PATCH /api/v1/users/{id}** – Update profile

### Properties
- **POST /api/v1/properties** – Create property listing
- **GET /api/v1/properties** – List all properties (filters: type, location, price)
- **GET /api/v1/properties/{id}** – Get property details
- **PATCH /api/v1/properties/{id}** – Update property
- **DELETE /api/v1/properties/{id}** – Delete property

### Media
- **POST /api/v1/properties/{id}/media** – Upload images/videos/docs
- **GET /api/v1/properties/{id}/media** – Fetch property media

### Escrow
- **POST /api/v1/escrow** – Initiate escrow transaction
- **GET /api/v1/escrow/{id}** – View escrow status
- **PATCH /api/v1/escrow/{id}/fund** – Fund escrow
- **PATCH /api/v1/escrow/{id}/release** – Release escrow funds
- **PATCH /api/v1/escrow/{id}/cancel** – Cancel escrow

### Chat
- **POST /api/v1/chat/send** – Send message/file
- **GET /api/v1/chat/{user_id}** – Get chat with another user
- **WS /api/v1/chat/ws/{room_id}** – Real-time chat (WebSocket)

### Video/Audio Calls
- Integrate via **WebRTC + signaling server**
- **WS /api/v1/call/ws/{room_id}** – Signaling channel
- Peer-to-peer media exchange handled on client

---

## Technical Stack & Deployment

### Backend (FastAPI)
- **Framework:** FastAPI with Python 3.11+
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Authentication:** JWT + refresh tokens
- **File Storage:** S3-compatible (Cloudflare R2 / AWS S3)
- **Real-time:** WebSockets for chat, WebRTC for calls

### Frontend (React)
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Query + Zustand
- **Real-time:** Socket.io client

### Deployment Strategy
- **Backend:** AWS EC2/Fargate or Render
- **Frontend:** Vercel or AWS S3 + CloudFront
- **Database:** AWS RDS PostgreSQL
- **Storage:** AWS S3 or Cloudflare R2
- **Monitoring:** Sentry, Logtail, PostHog

### Third-Party Integrations
- **Payments:** Flutterwave/Paystack for escrow
- **KYC:** NIN, BVN, CAC verification APIs
- **Communication:** Twilio for SMS/voice
- **Legal:** Contract generation automation

---

## MVP Development Phases

### Phase 1: Hello World (Current)
- Basic FastAPI server with health check
- Simple React frontend
- Database connection setup
- Basic deployment pipeline

### Phase 2: Core Features
- User authentication and registration
- Property CRUD operations
- Basic media upload
- Simple chat functionality

### Phase 3: Advanced Features
- Escrow system integration
- Real-time chat and calls
- Payment gateway integration
- KYC verification

### Phase 4: Production Ready
- Advanced security measures
- Performance optimization
- Comprehensive monitoring
- Load testing and scaling

---

## Cost Considerations

### Development Environment
- **Local Development:** Free (Docker, local PostgreSQL)
- **Staging:** $20-50/month (small AWS instances)

### Production (MVP Phase)
- **Backend:** $20-50/month (EC2 t3.medium)
- **Database:** $15-40/month (RDS db.t3.small)
- **Storage:** <$5/month (S3)
- **Frontend:** $0-20/month (Vercel/AWS S3)
- **Total:** $40-115/month

### Scaling Considerations
- Auto-scaling groups for traffic spikes
- Database read replicas for performance
- CDN for global content delivery
- Monitoring and alerting systems

---

## Security & Compliance

### Data Protection
- End-to-end encryption for sensitive data
- GDPR-compliant data handling
- Secure password hashing (bcrypt)
- JWT token expiration and refresh

### API Security
- Rate limiting and DDoS protection
- Input validation and sanitization
- CORS configuration
- API versioning strategy

### Financial Compliance
- PCI DSS compliance for payment processing
- Audit trails for all transactions
- Secure escrow fund management
- Regulatory reporting capabilities

---

*This blueprint provides the foundation for a scalable, secure, and cost-effective real estate platform that can grow from MVP to full production.*
