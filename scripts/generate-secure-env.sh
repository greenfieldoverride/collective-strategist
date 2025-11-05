#!/bin/bash

# Generate secure .env.production file for The Collective Strategist
# This script creates secure random passwords for production deployment

set -e

ENV_FILE=".env.production"
BACKUP_FILE=".env.production.backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Generating secure production environment configuration...${NC}"

# Backup existing file if it exists
if [[ -f "$ENV_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Backing up existing $ENV_FILE to $BACKUP_FILE${NC}"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)  
JWT_SECRET=$(openssl rand -base64 32)
GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create the production environment file
cat > "$ENV_FILE" << EOF
# The Collective Strategist - Production Environment Variables
# Generated on: $(date)
# IMPORTANT: Keep this file secure and never commit to version control!

# Database Configuration
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_USER=strategist
POSTGRES_DB=collective_strategist

# Redis Configuration  
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Monitoring Configuration
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# Application Configuration
NODE_ENV=production
CORS_ORIGIN=https://strategist.greenfieldoverride.com,http://localhost:3000
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true

# Ports (change if conflicts with other services)
FRONTEND_PORT=3000
API_PORT=8007
POSTGRES_PORT=5432
REDIS_PORT=6379

# Domain Configuration
DOMAIN=greenfieldoverride.com
APP_DOMAIN=strategist.greenfieldoverride.com

# SSL/TLS Configuration  
ACME_EMAIL=admin@greenfieldoverride.com

# Security Notes:
# - All passwords are 25 characters, base64-encoded, no special chars for compatibility
# - JWT secret is 32 bytes base64-encoded
# - Change CORS_ORIGIN and domains for your actual deployment
# - Update ACME_EMAIL for Let's Encrypt certificates
EOF

# Set secure permissions
chmod 600 "$ENV_FILE"

echo -e "${GREEN}✅ Secure environment file created: $ENV_FILE${NC}"
echo -e "${GREEN}✅ File permissions set to 600 (owner read/write only)${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Review and update domains in $ENV_FILE"
echo "2. Update ACME_EMAIL for SSL certificates"  
echo "3. Run deployment: npm run deploy"
echo ""
echo -e "${YELLOW}🔒 Security reminders:${NC}"
echo "- Never commit $ENV_FILE to version control"
echo "- Keep backups in a secure location"
echo "- Rotate passwords regularly"
echo "- Use these credentials for database connections"

# Show generated passwords (masked)
echo ""
echo -e "${BLUE}🔑 Generated credentials (keep secure):${NC}"
echo "PostgreSQL Password: ${POSTGRES_PASSWORD:0:8}... (25 chars)"
echo "Redis Password: ${REDIS_PASSWORD:0:8}... (25 chars)"
echo "JWT Secret: ${JWT_SECRET:0:8}... (44 chars)"
echo "Grafana Password: ${GRAFANA_PASSWORD:0:8}... (25 chars)"
EOF