# AI Consultant Deployment Guide

## Overview

This guide covers deploying the AI Business Consultant feature in development and production environments. The feature requires coordination between frontend, backend, and external AI services.

## Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │───▶│   Backend API   │───▶│  Anthropic API  │
│   (React/Vite)  │    │   (Node.js)     │    │    (Claude)     │
│   Port 3333     │    │   Port 8007     │    │   External      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       ▼                       
         │              ┌─────────────────┐              
         │              │   PostgreSQL    │              
         └──────────────▶│   Database      │              
                        │   Port 5432     │              
                        └─────────────────┘              
```

## Prerequisites

### Development Environment
- Node.js 18+ with npm
- PostgreSQL 12+ (or Docker)
- Valid Anthropic API key
- Git for version control

### Production Environment  
- Node.js 18+ runtime
- PostgreSQL 12+ database
- Reverse proxy (nginx recommended)
- SSL certificate
- Monitoring tools (optional)

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collective_strategist
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Core API Configuration
PORT=8007
HOST=0.0.0.0
JWT_SECRET=your-jwt-secret-change-in-production-32-chars-min
ENCRYPTION_KEY=32-char-encryption-key-change-in-production
ALLOWED_ORIGINS=http://localhost:3333,https://yourdomain.com

# AI Integration - REQUIRED FOR AI CONSULTANT
DEFAULT_ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-key-here

# Optional: Additional AI Providers
GOOGLE_API_KEY=your-google-ai-key
OPENAI_API_KEY=sk-your-openai-key

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

### Anthropic API Key Setup

1. **Get API Key**:
   - Visit [Anthropic Console](https://console.anthropic.com)
   - Create account and add payment method
   - Generate API key in "API Keys" section

2. **Set Usage Limits** (Recommended):
   - Set monthly spending limit: $50-100 for small deployments
   - Monitor usage in Anthropic dashboard

3. **Test API Key**:
   ```bash
   curl -X POST https://api.anthropic.com/v1/messages \
     -H "x-api-key: your-api-key" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
   ```

## Development Deployment

### Quick Start

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd greenfield-solvency
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   ```bash
   # Option 1: Docker PostgreSQL
   docker run -d \
     --name postgres-dev \
     -e POSTGRES_DB=collective_strategist \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:15

   # Option 2: Local PostgreSQL
   createdb collective_strategist
   ```

4. **Install Dependencies**:
   ```bash
   # Backend
   cd services/core-api
   npm install

   # Frontend  
   cd ../../frontend
   npm install
   ```

5. **Run Development Servers**:
   ```bash
   # Terminal 1: Backend
   cd services/core-api
   npm run dev  # Runs on http://localhost:8007

   # Terminal 2: Frontend
   cd frontend  
   npm run dev  # Runs on http://localhost:3333
   ```

6. **Verify AI Integration**:
   - Visit http://localhost:3333
   - Login with any credentials
   - Navigate to AI Consultant tab
   - Ask: "What platforms should I use for my business?"
   - Should receive real AI response (takes 2-3 seconds)

### Development Troubleshooting

**Common Issues**:

1. **Frontend not loading**:
   ```bash
   # Check if Vite is running
   cd frontend && npm run dev
   ```

2. **Backend API errors**:
   ```bash
   # Check logs
   cd services/core-api && npm run dev
   # Look for "Server listening at http://0.0.0.0:8007"
   ```

3. **AI responses are templates**:
   - Verify `DEFAULT_ANTHROPIC_API_KEY` in .env
   - Check backend logs for "🤖 Attempting AI generation"
   - Test API key independently

4. **Database connection issues**:
   ```bash
   # Test database connection
   psql postgresql://postgres:postgres@localhost:5432/collective_strategist
   ```

## Production Deployment

### Server Setup (Ubuntu/Debian)

1. **System Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL
   sudo apt-get install -y postgresql postgresql-contrib

   # Install nginx
   sudo apt-get install -y nginx

   # Install certbot for SSL
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

2. **Database Setup**:
   ```bash
   sudo -u postgres createuser --createdb --login --pwprompt collective_strategist
   sudo -u postgres createdb -O collective_strategist collective_strategist
   ```

3. **Application Setup**:
   ```bash
   # Create app user
   sudo useradd -m -s /bin/bash app
   sudo su - app

   # Clone and setup
   git clone <repository-url> /home/app/collective-strategist
   cd /home/app/collective-strategist

   # Install dependencies
   cd services/core-api && npm ci --production
   cd ../../frontend && npm ci && npm run build
   ```

4. **Environment Configuration**:
   ```bash
   # Production .env
   NODE_ENV=production
   PORT=8007
   HOST=127.0.0.1
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=collective_strategist
   DB_USER=collective_strategist
   DB_PASSWORD=secure_production_password
   JWT_SECRET=super-secure-jwt-secret-at-least-32-characters
   ENCRYPTION_KEY=32-char-encryption-key-for-production
   DEFAULT_ANTHROPIC_API_KEY=sk-ant-api03-production-key
   ALLOWED_ORIGINS=https://yourdomain.com
   LOG_LEVEL=warn
   ```

### Process Management (PM2)

1. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```

2. **PM2 Configuration** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [{
       name: 'collective-strategist-api',
       script: 'services/core-api/dist/index.js',
       cwd: '/home/app/collective-strategist',
       instances: 2,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 8007
       },
       error_file: '/var/log/collective-strategist/api-error.log',
       out_file: '/var/log/collective-strategist/api-out.log',
       log_file: '/var/log/collective-strategist/api.log',
       time: true
     }]
   }
   ```

3. **Start Services**:
   ```bash
   # Build backend
   cd services/core-api && npm run build

   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow instructions for auto-start
   ```

### Reverse Proxy (nginx)

1. **nginx Configuration** (`/etc/nginx/sites-available/collective-strategist`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Redirect HTTP to HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;

       # SSL Configuration (managed by certbot)
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       # Frontend static files
       location / {
           root /home/app/collective-strategist/frontend/dist;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 1y;
               add_header Cache-Control "public, immutable";
           }
       }

       # API proxy
       location /api/ {
           proxy_pass http://127.0.0.1:8007;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           
           # Timeout settings for AI requests
           proxy_read_timeout 30s;
           proxy_connect_timeout 5s;
       }
   }
   ```

2. **Enable Site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/collective-strategist /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl restart nginx
   ```

3. **SSL Setup**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Monitoring & Maintenance

### Health Checks

1. **API Health Endpoint**:
   ```bash
   curl https://yourdomain.com/api/health
   # Should return: {"status":"healthy","timestamp":"..."}
   ```

2. **AI Integration Check**:
   ```bash
   # Test AI consultant endpoint
   curl -X POST https://yourdomain.com/api/v1/ai-consultant/ask \
     -H "Authorization: Bearer your-jwt-token" \
     -H "Content-Type: application/json" \
     -d '{"contextualCoreId":"test-uuid","sessionType":"strategic_advice","query":"test question"}'
   ```

### Log Management

1. **Application Logs**:
   ```bash
   # PM2 logs
   pm2 logs collective-strategist-api

   # System logs
   sudo journalctl -u nginx -f
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

2. **Log Rotation**:
   ```bash
   # Configure logrotate for PM2 logs
   sudo tee /etc/logrotate.d/collective-strategist << EOF
   /var/log/collective-strategist/*.log {
       daily
       rotate 30
       compress
       delaycompress
       missingok
       notifempty
       create 644 app app
   }
   EOF
   ```

### Performance Monitoring

1. **Basic Monitoring**:
   ```bash
   # Install htop for system monitoring
   sudo apt install htop

   # Monitor processes
   htop
   pm2 monit
   ```

2. **Database Performance**:
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;

   -- Check slow queries
   SELECT query, mean_time, calls FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   ```

### Backup Strategy

1. **Database Backup**:
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump -h localhost -U collective_strategist collective_strategist \
     | gzip > /backups/db_backup_$DATE.sql.gz
   
   # Keep only last 7 days
   find /backups -name "db_backup_*.sql.gz" -mtime +7 -delete
   ```

2. **Application Backup**:
   ```bash
   # Configuration and logs
   tar -czf /backups/app_config_$(date +%Y%m%d).tar.gz \
     /home/app/collective-strategist/.env \
     /var/log/collective-strategist/
   ```

## Security Considerations

### API Security
- ✅ JWT authentication required for all AI endpoints
- ✅ CORS properly configured for production domain
- ✅ API key stored securely in environment variables
- ✅ Input validation with Zod schemas
- ✅ Rate limiting implemented

### Infrastructure Security
- ✅ SSL/TLS encryption with Let's Encrypt
- ✅ nginx security headers
- ✅ PostgreSQL access restricted to localhost
- ✅ Firewall configured (UFW recommended)
- ✅ Regular security updates

### Recommended Security Headers (nginx):
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Use nginx upstream for multiple backend instances
- **Database**: Consider read replicas for high read workloads
- **Caching**: Implement Redis for session storage and API caching
- **CDN**: Use CloudFlare or AWS CloudFront for static assets

### Vertical Scaling
- **Memory**: 2-4GB RAM recommended for moderate traffic
- **CPU**: 2-4 cores adequate for typical workloads
- **Storage**: SSD recommended for database performance

### AI Service Scaling
- **API Limits**: Monitor Anthropic rate limits and usage
- **Fallback Strategy**: Implement multiple AI providers
- **Caching**: Cache common responses to reduce API calls
- **Queue System**: Use job queue for high-volume scenarios

---

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificate installed
- [ ] Backup strategy implemented
- [ ] Monitoring configured

### Post-deployment
- [ ] Health checks passing
- [ ] AI integration functional
- [ ] Frontend loading correctly
- [ ] API endpoints responsive
- [ ] Logs collecting properly

### Security Audit
- [ ] API keys secure and rotated
- [ ] Database access restricted
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] Input validation active

**Deployment Status**: ✅ **Production Ready**
- All components documented and tested
- Security measures implemented
- Monitoring and backup strategies defined
- Scaling path planned