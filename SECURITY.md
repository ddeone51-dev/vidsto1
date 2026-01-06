# Security Guide for Vidisto Production

## Security Best Practices

### 1. Environment Variables

- **Never commit `.env` to version control**
- Use strong, unique values for all secrets
- Rotate secrets regularly
- Use different secrets for staging and production

### 2. Authentication

- JWT tokens expire after 24 hours
- Passwords are hashed with bcrypt (10 rounds)
- Implement rate limiting on login endpoints
- Use HTTPS only in production

### 3. API Security

- All API endpoints require authentication (except public endpoints)
- CORS is configured to only allow your domain
- Rate limiting is enabled
- Input validation with Zod schemas

### 4. Database Security

- SQLite database file permissions: 600 (owner read/write only)
- Regular backups with encryption
- No sensitive data stored in plain text
- User passwords are hashed

### 5. File Upload Security

- File size limits enforced (500MB max)
- File type validation
- Uploaded files stored outside web root
- Virus scanning recommended for production

### 6. API Keys

- Store API keys in environment variables only
- Rotate keys regularly
- Use least-privilege service accounts
- Monitor API usage for anomalies

### 7. Server Security

- Keep system updated: `sudo apt update && sudo apt upgrade`
- Enable firewall (UFW)
- Disable root SSH login
- Use SSH keys instead of passwords
- Regular security audits

### 8. SSL/TLS

- Use Let's Encrypt for free SSL certificates
- Enable HSTS headers
- Use strong cipher suites
- Regular certificate renewal

### 9. Monitoring

- Monitor failed login attempts
- Track API usage patterns
- Set up alerts for unusual activity
- Regular log review

### 10. Backup Security

- Encrypt backups
- Store backups off-site
- Test backup restoration regularly
- Secure backup storage access

## Security Headers

Nginx configuration includes:
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Content-Security-Policy

## Vulnerability Management

1. **Regular Updates:**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Dependency Monitoring:**
   - Use Dependabot or similar
   - Review security advisories
   - Update promptly

3. **Security Scanning:**
   - Use tools like Snyk, npm audit
   - Regular penetration testing
   - Code reviews

## Incident Response

1. **If breach detected:**
   - Immediately rotate all secrets
   - Review access logs
   - Notify affected users
   - Document incident

2. **Prevention:**
   - Regular security audits
   - Penetration testing
   - Security training for team

## Compliance

- GDPR: User data handling
- PCI DSS: Payment processing (if applicable)
- Data retention policies
- User privacy rights

## Reporting Security Issues

If you discover a security vulnerability:
1. Do NOT create a public issue
2. Email security@yourdomain.com
3. Include detailed description
4. Allow time for fix before disclosure



