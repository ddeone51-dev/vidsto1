# Vidisto Production Deployment Checklist

Use this checklist to ensure all production requirements are met before going live.

## Pre-Deployment

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables set with production values
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is strong and unique (32+ characters)
- [ ] `CORS_ORIGIN` set to production domain
- [ ] All API keys and credentials configured
- [ ] `.env` file has correct permissions (600)
- [ ] `.env` is in `.gitignore` (not committed)

### API Keys & Services
- [ ] Google API Key configured
- [ ] Google Cloud Project ID set
- [ ] Vertex AI service account JSON file present
- [ ] Service account has correct permissions
- [ ] Vertex AI API enabled in Google Cloud Console
- [ ] Text-to-Speech API enabled
- [ ] Speech-to-Text API enabled
- [ ] Payment gateway credentials configured
- [ ] Payment callback URL configured
- [ ] All API quotas checked and sufficient

### Database
- [ ] Database directory created (`data/`)
- [ ] Database initialized (first run creates it)
- [ ] Admin user created
- [ ] Database permissions set correctly
- [ ] Backup strategy configured
- [ ] Database backup tested

### Security
- [ ] Strong JWT secret generated
- [ ] HTTPS/SSL certificate configured
- [ ] CORS properly configured
- [ ] File permissions set correctly:
  - [ ] `.env`: 600
  - [ ] `vertex-sa.json`: 600
  - [ ] `data/`: 755
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Rate limiting configured
- [ ] Security headers configured (nginx)
- [ ] Dependencies audited: `npm audit`
- [ ] Vulnerabilities fixed: `npm audit fix`

### Build & Assets
- [ ] Frontend built: `cd web && npm run build`
- [ ] Build output verified in `web/dist/`
- [ ] All images and assets present
- [ ] Character thumbnails generated
- [ ] Style thumbnails generated
- [ ] Voice thumbnails generated
- [ ] No broken links or missing assets

### Server Configuration
- [ ] Node.js version correct (v18+)
- [ ] FFmpeg installed and accessible
- [ ] PM2 or process manager installed
- [ ] Nginx or reverse proxy configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Server resources adequate (RAM, CPU, storage)

## Deployment

### Application Setup
- [ ] Dependencies installed: `npm install`
- [ ] Frontend dependencies installed: `cd web && npm install`
- [ ] Application starts without errors
- [ ] Health check endpoint responds: `/api/health`
- [ ] All API endpoints accessible
- [ ] Frontend loads correctly

### Testing
- [ ] User registration works
- [ ] User login works
- [ ] Story generation works
- [ ] Image generation works
- [ ] Audio generation works
- [ ] Video generation works
- [ ] Payment processing works
- [ ] Admin panel accessible
- [ ] File uploads work
- [ ] Error handling works correctly

### Monitoring
- [ ] Logging configured
- [ ] Log rotation set up
- [ ] Monitoring tools configured
- [ ] Alerts configured
- [ ] Uptime monitoring set up
- [ ] Error tracking configured (optional)

### Backup & Recovery
- [ ] Database backup script created
- [ ] Backup automation configured
- [ ] Backup storage configured
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

## Post-Deployment

### Verification
- [ ] Website accessible via domain
- [ ] HTTPS working correctly
- [ ] All pages load correctly
- [ ] API endpoints respond correctly
- [ ] No console errors in browser
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested

### Performance
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Image optimization working
- [ ] Caching configured correctly
- [ ] CDN configured (if applicable)

### Documentation
- [ ] Production setup documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide available
- [ ] API documentation updated
- [ ] Admin guide available

### Team Access
- [ ] Admin accounts created
- [ ] Access credentials shared securely
- [ ] Team trained on admin panel
- [ ] Support process documented

## Ongoing Maintenance

### Regular Tasks
- [ ] Weekly: Review logs for errors
- [ ] Weekly: Check disk space
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review security audit
- [ ] Monthly: Test backup restoration
- [ ] Quarterly: Review and update documentation

### Monitoring
- [ ] Daily: Check application uptime
- [ ] Daily: Monitor error rates
- [ ] Weekly: Review performance metrics
- [ ] Weekly: Check API quota usage
- [ ] Monthly: Review user feedback

### Security
- [ ] Weekly: Review security logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Quarterly: Review access logs
- [ ] Annually: SSL certificate renewal

## Sign-Off

- [ ] Technical Lead: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______
- [ ] Security: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

---

## Notes

- Keep this checklist updated as requirements change
- Review before each major deployment
- Document any deviations or exceptions



