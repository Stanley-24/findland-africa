# 🚀 FindLand Africa - Production Deployment Guide

## Overview
This guide covers deploying the FindLand Africa MVP to production using:
- **Frontend:** Vercel (React)
- **Backend:** Render (FastAPI)
- **Database:** Neon (PostgreSQL)

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Render        │    │   Neon          │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   React App     │    │   FastAPI       │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

1. **GitHub Repository** - Code pushed to GitHub
2. **Vercel Account** - For frontend deployment
3. **Render Account** - For backend deployment
4. **Neon Account** - For database hosting

## 🗄️ Step 1: Set Up Neon Database

### Create Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create new project: `findland-africa`
3. Copy the connection string
4. Note the database URL format:
   ```
   postgresql://username:password@host:port/database_name
   ```

### Database Schema
The database will be created automatically when the backend connects. The schema is defined in `docs/APIDatabaseBlueprint.md`.

## ⚙️ Step 2: Deploy Backend to Render

### Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name:** `findland-africa-backend`
- **Environment:** `Python 3`
- **Build Command:** `pip install -r backend/requirements-minimal.txt`
- **Start Command:** `cd backend && python main.py`

**Environment Variables:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production
CORS_ORIGINS=https://findland-africa.vercel.app
```

### Health Check
- **Health Check Path:** `/health`
- Render will monitor this endpoint for service health

## 🎨 Step 3: Deploy Frontend to Vercel

### Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:

**Build Settings:**
- **Framework Preset:** Create React App
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `build`

**Environment Variables:**
```bash
REACT_APP_API_URL=https://findland-africa-backend.onrender.com
REACT_APP_ENVIRONMENT=production
```

### Custom Domain (Optional)
- Add custom domain in Vercel settings
- Update CORS_ORIGINS in Render with your domain

## 🔧 Step 4: Environment Variables Setup

### Backend Environment Variables (Render)
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database_name

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Environment
ENVIRONMENT=production
DEBUG=False

# CORS
CORS_ORIGINS=https://findland-africa.vercel.app

# Third-party Services (Future)
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

### Frontend Environment Variables (Vercel)
```bash
# API Configuration
REACT_APP_API_URL=https://findland-africa-backend.onrender.com
REACT_APP_ENVIRONMENT=production

# Third-party Services (Future)
REACT_APP_FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## 🧪 Step 5: Testing Production Deployment

### Test Backend
1. Visit: `https://findland-africa-backend.onrender.com/`
2. Check API docs: `https://findland-africa-backend.onrender.com/docs`
3. Health check: `https://findland-africa-backend.onrender.com/health`

### Test Frontend
1. Visit: `https://findland-africa.vercel.app`
2. Verify API connection is working
3. Check that all features load correctly

### Test Database Connection
1. Backend should connect automatically
2. Check Render logs for database connection status
3. Verify tables are created on first startup

## 📊 Step 6: Monitoring & Maintenance

### Render Monitoring
- **Logs:** Available in Render dashboard
- **Metrics:** CPU, Memory, Response time
- **Health Checks:** Automatic monitoring

### Vercel Monitoring
- **Analytics:** Built-in performance metrics
- **Logs:** Function logs and errors
- **Deployments:** Automatic deployments on git push

### Neon Monitoring
- **Query Performance:** Available in Neon console
- **Connection Pooling:** Automatic connection management
- **Backups:** Automatic daily backups

## 💰 Cost Estimation

### Monthly Costs (MVP Phase)
- **Vercel:** Free tier (sufficient for MVP)
- **Render:** Free tier (750 hours/month)
- **Neon:** Free tier (0.5GB storage, 1GB transfer)

### Scaling Costs
- **Render:** $7/month for always-on service
- **Neon:** $19/month for production database
- **Vercel:** $20/month for Pro features

**Total MVP Cost:** $0-46/month (well within $200-500 budget)

## 🔄 Step 7: Continuous Deployment

### Automatic Deployments
- **Frontend:** Deploys automatically on push to main branch
- **Backend:** Deploys automatically on push to main branch
- **Database:** Migrations run automatically on backend startup

### Manual Deployments
- **Frontend:** `vercel --prod`
- **Backend:** Triggered via Render dashboard
- **Database:** Managed through Neon console

## 🚨 Troubleshooting

### Common Issues

**Backend Won't Start:**
- Check environment variables in Render
- Verify database connection string
- Check build logs for dependency issues

**Frontend Can't Connect to Backend:**
- Verify REACT_APP_API_URL is correct
- Check CORS_ORIGINS in backend
- Ensure backend is running and healthy

**Database Connection Issues:**
- Verify DATABASE_URL format
- Check Neon database is active
- Review connection limits

### Support Resources
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Neon Docs:** https://neon.tech/docs

## 🎉 Success Checklist

- [ ] Neon database created and accessible
- [ ] Backend deployed to Render and healthy
- [ ] Frontend deployed to Vercel and loading
- [ ] API connection working between frontend and backend
- [ ] Database connection established
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Cost monitoring in place

---

**Your FindLand Africa MVP is now live in production!** 🏗️✨

The platform is ready for:
- User testing and feedback
- Feature development and iteration
- Scaling to handle more users
- Integration with payment and KYC services
