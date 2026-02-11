#!/bin/bash

set -e

echo "Deploying Bangmio to GitHub Pages..."

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git add .
  git commit -m "Initial commit"
fi

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Create orphan branch for GitHub Pages
echo "Creating gh-pages branch..."
git checkout --orphan gh-pages
git rm -rf .

# Copy built files
echo "Copying built files..."
cp -r frontend/dist/* .
cp frontend/dist/.gitignore . 2>/dev/null || true

# Add and commit
git add .
git commit -m "Deploy to GitHub Pages"

# Push to GitHub (user needs to set remote)
echo ""
echo "To deploy to GitHub Pages:"
echo "1. Create a new repository on GitHub"
echo "2. Add remote: git remote add origin https://github.com/YOUR_USERNAME/bangumi-manager.git"
echo "3. Push: git push -u origin gh-pages"
echo "4. Go to repository Settings > Pages > Source: select gh-pages branch"
echo ""
echo "Or if you already have a remote:"
echo "git push -f origin gh-pages"