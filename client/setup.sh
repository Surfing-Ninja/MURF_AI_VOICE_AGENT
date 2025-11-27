#!/bin/bash

echo "🎙️ Voice Agent Frontend Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure the backend is running on http://localhost:3000"
echo "   2. Start the frontend: npm run dev"
echo "   3. Open browser: http://localhost:5173"
echo ""
echo "🚀 To start now, run: npm run dev"
