#!/bin/bash
# Inkwell — One-click EC2 Setup Script
# Ubuntu 22.04+ | Run from ~/inkwell directory

set -e
echo "======================================"
echo " Inkwell Platform — EC2 Setup"
echo "======================================"

# 1. Update system
echo "[1/8] Updating system packages..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

# 2. Install Node.js 20
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
sudo apt-get install -y nodejs -qq

# 3. Install MongoDB
echo "[3/8] Installing MongoDB 7..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update -qq
sudo apt-get install -y mongodb-org -qq
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. Install Nginx and PM2
echo "[4/8] Installing Nginx and PM2..."
sudo apt-get install -y nginx -qq
sudo npm install -g pm2 -q

# 5. Backend setup
echo "[5/8] Setting up backend..."
cd ~/inkwell/backend
npm install --production -q

# Create .env if not exists
if [ ! -f .env ]; then
  echo "PORT=5000
MONGO_URI=mongodb://localhost:27017/inkwell_db
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
OPENAI_API_KEY=your-openai-key-here" > .env
  echo "  .env created — update OPENAI_API_KEY to enable AI features"
fi

# 6. Frontend build
echo "[6/8] Building frontend..."
cd ~/inkwell/frontend
npm install -q
npm run build -q

# 7. Nginx config
echo "[7/8] Configuring Nginx..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

sudo tee /etc/nginx/sites-available/inkwell > /dev/null <<NGINX
server {
    listen 80;
    server_name $PUBLIC_IP;

    # Frontend
    root /home/ubuntu/inkwell/frontend/dist;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.io proxy
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/inkwell /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 8. Start backend with PM2
echo "[8/8] Starting Inkwell backend with PM2..."
cd ~/inkwell/backend
pm2 start src/index.js --name "inkwell-api" --env production
pm2 save
pm2 startup | grep "sudo" | bash || true

echo ""
echo "======================================"
echo " Inkwell is live!"
echo " http://$PUBLIC_IP"
echo "======================================"
echo ""
echo " Useful commands:"
echo "   pm2 status           — check backend"
echo "   pm2 logs inkwell-api — view logs"
echo "   pm2 restart all      — restart backend"
echo "   sudo systemctl reload nginx — reload nginx"
echo ""
echo " !! Update OPENAI_API_KEY in backend/.env for AI features !!"
