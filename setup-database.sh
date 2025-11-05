#!/bin/bash

# Setup separate PostgreSQL user and database for The Collective Strategist
# Run this script on the liberation server to create isolated database access

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up separate PostgreSQL user and database for The Collective Strategist...${NC}"

# Generate a secure password for the new user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${YELLOW}📝 Generated secure password for collective_strategist user${NC}"

# Create the new PostgreSQL user and database
echo -e "${BLUE}🗄️  Creating PostgreSQL user 'collective_strategist'...${NC}"
docker exec liberation-postgres psql -U liberation -c "
CREATE USER collective_strategist WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE collective_strategist OWNER collective_strategist;
GRANT ALL PRIVILEGES ON DATABASE collective_strategist TO collective_strategist;
"

# Verify the setup
echo -e "${BLUE}🔍 Verifying database setup...${NC}"
docker exec liberation-postgres psql -U liberation -c "\du" | grep collective_strategist
docker exec liberation-postgres psql -U liberation -c "\l" | grep collective_strategist

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Database credentials:${NC}"
echo "User: collective_strategist"
echo "Password: $DB_PASSWORD"
echo "Database: collective_strategist"
echo "Host: liberation-postgres (internal Docker network)"
echo ""
echo -e "${YELLOW}🔐 Update your .env.server file with:${NC}"
echo "POSTGRES_PASSWORD=$DB_PASSWORD"
echo ""
echo -e "${BLUE}💾 Save these credentials securely!${NC}"