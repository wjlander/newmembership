#!/bin/bash
# Fix Cache Issues - Deploy Script
# This script applies the bulletproof cache fix to your production server

set -e

echo "🔧 Applying Cache Fix to Production Server"
echo "=========================================="

# 1. Rebuild the application with new Vite config (hash-based filenames)
echo ""
echo "Step 1: Building application with cache-busting..."
npm run build

# 2. Update Nginx configuration
echo ""
echo "Step 2: Updating Nginx configuration..."
sudo cp etc/nginx/sites-available/membership-system /etc/nginx/sites-available/membership-system

# 3. Test Nginx configuration
echo ""
echo "Step 3: Testing Nginx configuration..."
sudo nginx -t

# 4. Reload Nginx
echo ""
echo "Step 4: Reloading Nginx..."
sudo systemctl reload nginx

# 5. Restart the Node.js server via PM2
echo ""
echo "Step 5: Restarting Node.js server..."
pm2 restart membership-system

# 6. Clear any Nginx cache
echo ""
echo "Step 6: Clearing Nginx cache..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

echo ""
echo "✅ Cache fix applied successfully!"
echo ""
echo "🧹 Manual Steps Required:"
echo "1. Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)"
echo "2. Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Test the site in a new incognito/private window"
echo ""
echo "📋 What was fixed:"
echo "  ✓ HTML files now have 'no-cache' headers (server.js)"
echo "  ✓ HTML files blocked from caching in Nginx"
echo "  ✓ Vite builds with hash-based filenames for cache busting"
echo "  ✓ Meta tags added to prevent HTML caching"
echo "  ✓ Static assets (JS/CSS) cached with immutable headers"
echo ""
echo "🎯 Result: Site will ALWAYS load fresh, no more stale cache!"
