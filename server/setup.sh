#!/bin/bash

# 🚀 Voice Agent - Complete Setup & Start Script
# This script will install dependencies, ingest sample data, and start the server

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎙️  Voice Agent - Day 1 MVP Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed"
  echo ""
else
  echo "✅ Dependencies already installed"
  echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo "Please create a .env file with your API keys"
  exit 1
else
  echo "✅ Environment variables configured"
  echo ""
fi

# Ask if user wants to ingest sample data
read -p "📚 Do you want to ingest the sample knowledge base? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 Ingesting sample knowledge base..."
  node scripts/ingest.js ./documents/sample_knowledge.txt
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Starting Voice Agent Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the server
npm start
