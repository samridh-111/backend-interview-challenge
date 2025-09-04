#!/bin/bash

# Task Sync API Deployment Script
echo "🚀 Task Sync API Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix tests before deploying."
    exit 1
fi

# Type check
echo "🔍 Running type check..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type check failed. Please fix TypeScript errors before deploying."
    exit 1
fi

# Build
echo "🔨 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Pre-deployment checks passed!"
echo ""
echo "🌐 Choose your deployment option:"
echo "1. Railway (Recommended - Easiest)"
echo "2. Render (Free tier available)"
echo "3. Vercel (Serverless)"
echo "4. Docker (Any cloud provider)"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🔗 Quick Railway deployment:"
echo "1. Fork this repository to your GitHub"
echo "2. Go to https://railway.app"
echo "3. Connect your GitHub repository"
echo "4. Deploy automatically!"
echo ""
echo "🎉 Your API will be live and ready to use!"
