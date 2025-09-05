#!/bin/bash

# Setup script for FindLand Africa Frontend Environment Variables

echo "🚀 Setting up FindLand Africa Frontend Environment Variables"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env for development
echo "📝 Creating .env file for local development..."
cat > .env << EOF
# Development environment variables
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
EOF

echo "✅ .env file created for local development"
echo ""

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    echo "⚠️  .env.production file already exists. Backing up to .env.production.backup"
    cp .env.production .env.production.backup
fi

# Create .env.production for production
echo "📝 Creating .env.production file for production..."
cat > .env.production << EOF
# Production environment variables
REACT_APP_API_URL=https://findland-africa-backend.onrender.com
REACT_APP_WS_URL=wss://findland-africa-backend.onrender.com
EOF

echo "✅ .env.production file created for production"
echo ""

echo "🎉 Environment setup complete!"
echo ""
echo "📋 Environment Variables:"
echo "   Development:"
echo "   - REACT_APP_API_URL=http://localhost:8000"
echo "   - REACT_APP_WS_URL=ws://localhost:8000"
echo ""
echo "   Production:"
echo "   - REACT_APP_API_URL=https://findland-africa-backend.onrender.com"
echo "   - REACT_APP_WS_URL=wss://findland-africa-backend.onrender.com"
echo ""
echo "💡 To start development:"
echo "   npm start"
echo ""
echo "💡 To build for production:"
echo "   npm run build"
