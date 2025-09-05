#!/bin/bash

# Setup script for FindLand Africa Backend Environment Variables

echo "🚀 Setting up FindLand Africa Backend Environment Variables"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env for development
echo "📝 Creating .env file for local development..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_hTy8GDVpuB2m@ep-sparkling-paper-ad684c9m-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Security
SECRET_KEY=september9
JWT_SECRET=september9

# Environment
ENVIRONMENT=development
DEBUG=True

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://findland-africa.vercel.app

# Third-party Services
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_BUCKET_NAME=findland-africa
AWS_REGION=eu-north-1
AWS_S3_ACCESS_POINT_ARN=arn:aws:s3:eu-north-1:623102672512:accesspoint/findland-africa-access
AWS_S3_ACCESS_POINT_ALIAS=findland-africa-acce-kh3e53s6ffgpupnmxpzi663u1dzceeun1b-s3alias
AWS_ACCOUNT_ID=623102672512

# KYC Services
NIN_VERIFICATION_API_KEY=your-nin-api-key
BVN_VERIFICATION_API_KEY=your-bvn-api-key
EOF

echo "✅ .env file created for local development"
echo ""

echo "🎉 Environment setup complete!"
echo ""
echo "📋 Key Environment Variables:"
echo "   Database: Neon PostgreSQL (Production)"
echo "   AWS S3: findland-africa bucket (eu-north-1)"
echo "   Security: JWT and Secret keys configured"
echo "   CORS: Local and Vercel origins allowed"
echo ""
echo "💡 To start development server:"
echo "   python main.py"
echo ""
echo "💡 To install dependencies:"
echo "   pip install -r requirements.txt"
echo ""
echo "⚠️  Note: Update third-party service keys (Flutterwave, Twilio, KYC) as needed"
