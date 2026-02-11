#!/bin/bash

set -e

echo "Deploying Bangumi Manager..."

# Deploy backend
echo "Deploying backend..."
cd backend
npm install
wrangler deploy
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Deployment complete!"
echo ""
echo "Backend: https://bangumi-manager-api.<your-subdomain>.workers.dev"
echo "Frontend: Build output in frontend/dist"
echo ""
echo "To deploy frontend to GitHub Pages:"
echo "1. Push frontend/dist to gh-pages branch"
echo "2. Enable GitHub Pages in repository settings"