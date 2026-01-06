# Vidisto Deployment Guide

This guide covers deployment options for Vidisto on various platforms.

## Table of Contents

1. [VPS Deployment (Ubuntu/Debian)](#vps-deployment-ubuntudebian)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Platform Deployment](#cloud-platform-deployment)
4. [Serverless Deployment](#serverless-deployment)

---

## VPS Deployment (Ubuntu/Debian)

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name configured
- SSH access

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Application Setup

```bash
# Create application user
sudo adduser --disabled-password --gecos "" vidsto
sudo su - vidsto

# Clone repository
git clone <your-repo-url> vidsto1
cd vidsto1

# Install dependencies
npm install
cd web && npm install && cd ..

# Create .env file
cp .env.example .env
nano .env  # Configure production values

# Build frontend
cd web && npm run build && cd ..
```

### Step 3: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/vidsto
```

Add configuration (see `nginx.conf` for complete config):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    root /home/vidsto/vidsto1/web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /images {
        alias /home/vidsto/vidsto1/web/public/images;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/vidsto /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

### Step 5: Start Application

```bash
# As vidsto user
cd ~/vidsto1
pm2 start pm2.config.js
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### Step 6: Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Docker Deployment

### Prerequisites

- Docker installed
- Docker Compose installed

### Step 1: Build Docker Image

```bash
docker build -t vidsto:latest .
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with production values
```

### Step 3: Start with Docker Compose

```bash
docker-compose up -d
```

### Step 4: View Logs

```bash
docker-compose logs -f
```

### Step 5: Update Application

```bash
git pull
docker-compose build
docker-compose up -d
```

---

## Cloud Platform Deployment

### AWS EC2

1. Launch EC2 instance (Ubuntu 20.04+)
2. Follow VPS Deployment steps
3. Configure Security Groups:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
4. Attach Elastic IP
5. Configure Route 53 for domain

### Google Cloud Platform

1. Create Compute Engine instance
2. Follow VPS Deployment steps
3. Configure Firewall Rules
4. Reserve static IP
5. Configure Cloud DNS

### DigitalOcean

1. Create Droplet (Ubuntu 20.04+)
2. Follow VPS Deployment steps
3. Configure Firewall
4. Add domain in Networking

### Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create vidsto-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set GOOGLE_API_KEY=your-key
# ... set all required vars

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=1
```

**Note**: Heroku has limitations:
- Ephemeral filesystem (use external storage for videos)
- 30-second request timeout
- May need adjustments for video processing

### Railway

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push
4. Configure custom domain

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `cd web && npm install && npm run build`
4. Set start command: `node server/index.js`
5. Add environment variables
6. Deploy

---

## Serverless Deployment

### AWS Lambda + API Gateway

**Note**: Requires significant refactoring due to:
- 15-minute execution limit
- Stateless architecture
- File storage limitations

Consider using:
- Lambda for API endpoints
- S3 for file storage
- CloudFront for CDN
- RDS for database (instead of SQLite)

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Note**: Vercel is best for frontend. Backend needs separate deployment.

---

## Systemd Service (Alternative to PM2)

Create service file:

```bash
sudo nano /etc/systemd/system/vidsto.service
```

```ini
[Unit]
Description=Vidisto Application
After=network.target

[Service]
Type=simple
User=vidsto
WorkingDirectory=/home/vidsto/vidsto1
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=vidsto

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vidsto
sudo systemctl start vidsto
sudo systemctl status vidsto
```

---

## Load Balancing (Multiple Servers)

### Nginx Load Balancer

```nginx
upstream vidsto_backend {
    least_conn;
    server 10.0.0.1:4000;
    server 10.0.0.2:4000;
    server 10.0.0.3:4000;
}

server {
    location /api {
        proxy_pass http://vidsto_backend;
    }
}
```

### Considerations

- Shared database (migrate from SQLite to PostgreSQL/MySQL)
- Shared file storage (S3, NFS, or similar)
- Session management (Redis or database sessions)
- Sticky sessions if needed

---

## Database Migration (SQLite to PostgreSQL)

For production with multiple servers, consider PostgreSQL:

1. Install PostgreSQL
2. Create database
3. Export SQLite data
4. Import to PostgreSQL
5. Update database connection in code

See `MIGRATION_GUIDE.md` for detailed steps.

---

## Monitoring Setup

### PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Log Aggregation

Consider:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki + Grafana**
- **CloudWatch** (AWS)
- **Stackdriver** (GCP)

---

## Backup Automation

### Cron Job for Database Backup

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/vidsto/vidsto1/scripts/backup.sh
```

### Backup Script

See `scripts/backup.sh` for automated backup script.

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs
# or
journalctl -u vidsto -f

# Check environment
node -e "console.log(process.env)"

# Test database
sqlite3 data/vidsto.db "SELECT COUNT(*) FROM users;"
```

### Nginx Errors

```bash
# Test configuration
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log
```

### Port Conflicts

```bash
# Find process using port
sudo lsof -i :4000
sudo netstat -tulpn | grep 4000
```

---

## Performance Optimization

1. **Enable Gzip** in Nginx
2. **Enable HTTP/2**
3. **Configure caching** for static assets
4. **Use CDN** for images and videos
5. **Optimize images** before upload
6. **Enable database indexes**
7. **Use connection pooling** (if using PostgreSQL)

---

## Security Hardening

1. **Fail2ban** for SSH protection
2. **Automatic security updates**
3. **Regular dependency updates**
4. **Security headers** in Nginx
5. **Rate limiting** at Nginx level
6. **WAF** (Web Application Firewall) if needed

---

## Next Steps

1. Choose deployment method
2. Follow platform-specific guide
3. Complete production checklist
4. Set up monitoring
5. Configure backups
6. Test thoroughly
7. Go live!



