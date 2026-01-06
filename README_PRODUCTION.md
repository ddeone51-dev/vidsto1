# Vidisto - Production Deployment

Complete production deployment guide for Vidisto AI Story Creation Platform.

## Quick Start

1. **Read the guides in order:**
   - [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Complete setup instructions
   - [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Platform-specific deployment guides

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Install dependencies:**
   ```bash
   npm install
   cd web && npm install && cd ..
   ```

4. **Build frontend:**
   ```bash
   npm run build
   ```

5. **Run database migration:**
   ```bash
   npm run migrate
   ```

6. **Start application:**
   ```bash
   # Using PM2 (recommended)
   npm run start:pm2
   
   # Or directly
   npm start
   ```

## Production Files Overview

### Configuration Files
- `.env.example` - Environment variables template
- `pm2.config.js` - PM2 process manager configuration
- `nginx.conf` - Nginx reverse proxy configuration
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Docker Compose setup

### Documentation
- `PRODUCTION_SETUP.md` - Complete production setup guide
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist
- `DEPLOYMENT.md` - Platform-specific deployment instructions
- `README_PRODUCTION.md` - This file

### Scripts
- `scripts/backup.sh` - Automated backup script
- `scripts/migrate.js` - Database migration script

## Key Features

- ✅ User authentication and authorization
- ✅ Credit-based subscription system
- ✅ Payment processing (AzamPay)
- ✅ AI story generation (Gemini)
- ✅ Scene breakdown and narration
- ✅ Image generation (Google Imagen, Vertex AI, Leonardo AI)
- ✅ Text-to-speech audio generation
- ✅ Video assembly with FFmpeg
- ✅ Audio-only generation with per-minute pricing
- ✅ Admin panel
- ✅ User library for saved videos

## System Requirements

- Node.js 18+
- FFmpeg
- 2GB+ RAM
- 10GB+ storage
- SSL certificate (for production)

## Support

For issues or questions:
1. Check the troubleshooting sections in the guides
2. Review application logs
3. Check Google Cloud Console for API issues

## License

MIT



