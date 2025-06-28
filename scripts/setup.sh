#!/bin/bash

echo "🚀 Setting up 3D Measurement App..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install and build packages in order
echo "🔧 Installing and building shared packages..."
cd shared && npm install && npm run build && cd ..
cd packages/api-client && npm install && npm run build && cd ../..
cd packages/3d-tools && npm install && npm run build && cd ../..

# Install app dependencies
echo "📱 Installing app dependencies..."
cd client-portal && npm install && cd ..
cd company-dashboard && npm install && cd ..
cd api-server && npm install && cd ..

echo "🎨 Setting up 3D models..."
mkdir -p company-dashboard/public/sample-models
cp client-portal/public/sample-models/* company-dashboard/public/sample-models/ 2>/dev/null || echo "Models already in place"

echo "✅ Setup complete!"
echo ""
echo "🎯 Ready to start:"
echo "   npm run dev"
echo ""
echo "🌐 Services will be available at:"
echo "   Client Portal: http://localhost:3000"
echo "   Company Dashboard: http://localhost:3001"
echo "   API Server: http://localhost:8000"
echo ""
echo "🔐 Demo credentials:"
echo "   Company: admin@acme.com / admin123"
echo "   Client: client1@example.com / client123"