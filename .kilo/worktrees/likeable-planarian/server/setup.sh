#!/bin/bash
set -e

echo "=== ABM TaskIQ Server Setup ==="

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js not found. Install Node.js first."
  exit 1
fi

echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# Install only production dependencies
echo "Installing production dependencies..."
npm install --production

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

echo "=== Setup Complete ==="
echo "Start app with: npm start"
echo "Or: node server/index.js"
