#!/bin/bash

# Pull latest changes
git pull origin server_vps

# Install dependencies
npm install

# Build client (if applicable)
cd client && npm install && npm run build && cd ..

# Restart the Node.js application (assuming you're using PM2)
pm2 restart server_pleer

# Reload Nginx
sudo systemctl reload nginx

