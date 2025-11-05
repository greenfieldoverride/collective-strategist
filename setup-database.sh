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

# Check if user already exists
echo -e "${BLUE}🔍 Checking if collective_strategist user exists...${NC}"
if docker exec liberation-postgres psql -U liberation -t -c "SELECT 1 FROM pg_roles WHERE rolname='collective_strategist';" | grep -q 1; then
    echo -e "${YELLOW}⚠️  User collective_strategist already exists${NC}"
    echo -e "${BLUE}🔄 Updating password...${NC}"
    docker exec liberation-postgres psql -U liberation -c "ALTER USER collective_strategist WITH PASSWORD '$DB_PASSWORD';"
else
    echo -e "${BLUE}👤 Creating PostgreSQL user 'collective_strategist'...${NC}"
    docker exec liberation-postgres psql -U liberation -c "CREATE USER collective_strategist WITH PASSWORD '$DB_PASSWORD';"
fi

# Check if database already exists
echo -e "${BLUE}🔍 Checking if collective_strategist database exists...${NC}"
if docker exec liberation-postgres psql -U liberation -t -c "SELECT 1 FROM pg_database WHERE datname='collective_strategist';" | grep -q 1; then
    echo -e "${YELLOW}⚠️  Database collective_strategist already exists${NC}"
    echo -e "${BLUE}🔄 Ensuring correct ownership...${NC}"
    docker exec liberation-postgres psql -U liberation -c "ALTER DATABASE collective_strategist OWNER TO collective_strategist;"
else
    echo -e "${BLUE}🗄️  Creating database 'collective_strategist'...${NC}"
    docker exec liberation-postgres psql -U liberation -c "CREATE DATABASE collective_strategist OWNER collective_strategist;"
fi

echo -e "${BLUE}🔐 Ensuring permissions...${NC}"
docker exec liberation-postgres psql -U liberation -c "GRANT ALL PRIVILEGES ON DATABASE collective_strategist TO collective_strategist;"

# Verify the setup
echo -e "${BLUE}🔍 Verifying database setup...${NC}"
echo "User verification:"
docker exec liberation-postgres psql -U liberation -c "\du" | grep collective_strategist || echo "User not found in display"
echo "Database verification:"
docker exec liberation-postgres psql -U liberation -c "\l" | grep collective_strategist || echo "Database not found in display"

# Test connection
echo -e "${BLUE}🧪 Testing connection...${NC}"
if docker exec liberation-postgres psql -U collective_strategist -d collective_strategist -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection test successful${NC}"
else
    echo -e "${RED}❌ Connection test failed${NC}"
fi

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