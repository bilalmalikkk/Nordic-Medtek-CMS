#!/bin/bash

# NordicMedTek CMS Deployment Script for IT Plays
echo "🚀 Starting NordicMedTek CMS deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads/images
mkdir -p uploads/documents
mkdir -p database

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 uploads
chmod 755 uploads/images
chmod 755 uploads/documents
chmod 755 database

# Copy environment file
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp env.production .env
    echo "✅ Environment file created. Please edit .env with your settings."
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npm run migrate

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nordic-medtek-cms',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

echo "✅ Deployment script completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run: pm2 start ecosystem.config.js"
echo "3. Run: pm2 save"
echo "4. Run: pm2 startup"
