# Vidisto Production Setup Guide

This guide covers everything needed to deploy Vidisto to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [API Keys & Credentials](#api-keys--credentials)
5. [Build & Deployment](#build--deployment)
6. [Server Configuration](#server-configuration)
7. [Security Checklist](#security-checklist)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **FFmpeg**: Required for video processing
- **SQLite3**: Included with better-sqlite3 package
- **Storage**: Minimum 10GB for videos and images
- **RAM**: Minimum 2GB (4GB+ recommended)
- **CPU**: 2+ cores recommended

### Required Services

1. **Google Cloud Platform Account**
   - Google Generative AI API access
   - Vertex AI API access (optional, for Imagen)
   - Google Cloud Text-to-Speech API
   - Google Cloud Speech-to-Text API

2. **Payment Gateway** (AzamPay or alternative)
   - API credentials
   - Webhook/callback URL configured

3. **Domain Name** (for production)
   - SSL certificate
   - DNS configuration

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd vidsto1
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd web
npm install
cd ..
```

### 3. Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your production values
nano .env  # or use your preferred editor
```

### 4. Required Environment Variables

See `.env.example` for complete list. Minimum required:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-strong-secret>
GOOGLE_API_KEY=<your-google-api-key>
GOOGLE_APPLICATION_CREDENTIALS=./vertex-sa.json
GOOGLE_CLOUD_PROJECT_ID=<your-project-id>
GOOGLE_CLOUD_LOCATION=us-central1
CORS_ORIGIN=https://yourdomain.com
```

### 5. Generate JWT Secret

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

Add the output to `JWT_SECRET` in `.env`.

---

## Database Setup

### 1. Initialize Database

The database is automatically created on first run. Ensure the `data` directory exists:

```bash
mkdir -p data
chmod 755 data
```

### 2. Create Admin User

```bash
node server/createAdmin.js
```

Follow prompts to create the first admin user.

### 3. Verify Database

```bash
# Check database file exists
ls -lh data/vidsto.db

# Verify schema (optional, using sqlite3 CLI)
sqlite3 data/vidsto.db ".schema"
```

### 4. Database Backup

Set up automated backups (see Backup Strategy section).

---

## API Keys & Credentials

### Google Cloud Platform Setup

1. **Create/Select Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing

2. **Enable APIs**
   - Generative Language API (Gemini)
   - Vertex AI API (for Imagen)
   - Cloud Text-to-Speech API
   - Cloud Speech-to-Text API

3. **Create Service Account** (for Vertex AI)
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Grant roles:
     - `Vertex AI User`
     - `Storage Object Viewer` (if using Cloud Storage)
   - Download JSON key file
   - Save as `vertex-sa.json` in project root
   - Set permissions: `chmod 600 vertex-sa.json`

4. **Get API Key** (for Gemini/Imagen)
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Add to `GOOGLE_API_KEY` in `.env`

### Payment Gateway Setup (AzamPay)

1. **Register with AzamPay**
   - Complete merchant registration
   - Get credentials from dashboard

2. **Configure Webhook**
   - Set callback URL: `https://yourdomain.com/api/payments/callback`
   - Add credentials to `.env`:
     ```env
     AZAMPAY_APP_NAME=your-app-name
     AZAMPAY_CLIENT_ID=your-client-id
     AZAMPAY_CLIENT_SECRET=your-client-secret
     AZAMPAY_VENDOR_ID=your-vendor-id
     AZAMPAY_CALLBACK_URL=https://yourdomain.com/api/payments/callback
     ```

---

## Build & Deployment

### 1. Build Frontend

```bash
cd web
npm run build
cd ..
```

This creates optimized production build in `web/dist/`.

### 2. Production Build Script

```bash
npm run build:production
```

### 3. Start Production Server

#### Option A: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start pm2.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### Option B: Systemd Service

See `DEPLOYMENT.md` for systemd service file.

#### Option C: Docker

```bash
docker-compose up -d
```

---

## Server Configuration

### Nginx Reverse Proxy

See `nginx.conf` for complete configuration.

Basic setup:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        root /path/to/vidsto1/web/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /images {
        alias /path/to/vidsto1/web/public/images;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL Certificate

Use Let's Encrypt (free):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly (`CORS_ORIGIN`)
- [ ] Set secure file permissions:
  ```bash
  chmod 600 .env
  chmod 600 vertex-sa.json
  chmod 755 data
  ```
- [ ] Enable firewall (UFW):
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] Disable unnecessary services
- [ ] Keep dependencies updated:
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] Set up rate limiting
- [ ] Configure secure headers (in nginx)
- [ ] Enable database encryption (if storing sensitive data)
- [ ] Set up log rotation
- [ ] Configure backup encryption

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor resources
pm2 monit

# View process info
pm2 status
```

### Application Logs

Logs are written to:
- Console (stdout/stderr)
- PM2 logs (if using PM2)
- System logs (if using systemd)

### Health Check Endpoint

```bash
curl http://localhost:4000/api/health
```

### Monitoring Tools

Consider integrating:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Performance**: New Relic, Datadog
- **Analytics**: Google Analytics

---

## Backup Strategy

### Database Backup

```bash
# Manual backup
cp data/vidsto.db data/backups/vidsto-$(date +%Y%m%d-%H%M%S).db

# Automated daily backup (add to crontab)
0 2 * * * cp /path/to/vidsto1/data/vidsto.db /path/to/backups/vidsto-$(date +\%Y\%m\%d).db
```

### Full Backup Script

See `scripts/backup.sh` for automated backup script.

### Backup Storage

- Local: External drive, NAS
- Cloud: AWS S3, Google Cloud Storage, Backblaze
- Frequency: Daily database, weekly full backup

---

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 4000
   lsof -i :4000
   # Kill process
   kill -9 <PID>
   ```

2. **Database locked**
   - Check for running processes
   - Restart application
   - Verify file permissions

3. **API errors**
   - Check API keys in `.env`
   - Verify service account permissions
   - Check API quotas in Google Cloud Console

4. **Build failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules web/node_modules
   npm install
   cd web && npm install
   ```

### Logs Location

- PM2: `~/.pm2/logs/`
- Systemd: `journalctl -u vidsto`
- Application: Check console output

### Support

For issues, check:
1. Application logs
2. System logs
3. Google Cloud Console logs
4. Error messages in browser console

---

## Next Steps

1. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific instructions
2. Complete [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
3. Set up monitoring and alerts
4. Configure automated backups
5. Test all features in production environment
6. Set up staging environment for testing

---

## Additional Resources

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)



