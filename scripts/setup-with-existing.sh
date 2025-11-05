#!/bin/bash

# The Collective Strategist - Setup with Existing greenfield-override Environment
# This assumes greenfield-override is already running and adds Collective Strategist

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up The Collective Strategist with existing environment...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop and run this script again.${NC}"
    echo ""
    echo -e "${BLUE}Alternative: If you want to run in development mode:${NC}"
    echo "npm run dev"
    exit 1
fi

# Check if .env.production exists
if [[ ! -f ".env.production" ]]; then
    echo -e "${YELLOW}📝 No .env.production found. Generating secure environment...${NC}"
    ./scripts/generate-secure-env.sh
else
    echo -e "${GREEN}✅ Found existing .env.production${NC}"
fi

# Check if shared infrastructure is needed
echo -e "${BLUE}🔍 Checking existing infrastructure...${NC}"

# Try to connect to existing postgres
if docker exec greenfield-override_postgres_1 pg_isready -U liberation 2>/dev/null || \
   docker exec liberation-postgres pg_isready -U shared_user 2>/dev/null; then
    echo -e "${GREEN}✅ Found existing PostgreSQL${NC}"
    POSTGRES_EXISTS=true
else
    echo -e "${YELLOW}⚠️  No existing PostgreSQL found${NC}"
    POSTGRES_EXISTS=false
fi

# Try to connect to existing redis  
if docker exec greenfield-override_redis_1 redis-cli ping 2>/dev/null || \
   docker exec liberation-redis redis-cli ping 2>/dev/null; then
    echo -e "${GREEN}✅ Found existing Redis${NC}"
    REDIS_EXISTS=true
else
    echo -e "${YELLOW}⚠️  No existing Redis found${NC}"
    REDIS_EXISTS=false
fi

# Decide deployment strategy
if [[ "$POSTGRES_EXISTS" == true && "$REDIS_EXISTS" == true ]]; then
    echo -e "${GREEN}✅ Using existing shared infrastructure${NC}"
    echo -e "${BLUE}🚀 Deploying Collective Strategist apps only...${NC}"
    npm run deploy:apps
else
    echo -e "${YELLOW}🏗️  Setting up shared infrastructure first...${NC}"
    npm run deploy:infrastructure
    echo -e "${BLUE}⏳ Waiting for infrastructure to be ready...${NC}"
    sleep 10
    echo -e "${BLUE}🚀 Deploying Collective Strategist apps...${NC}"
    npm run deploy:apps
fi

echo ""
echo -e "${GREEN}🎉 The Collective Strategist deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📍 Access URLs:${NC}"
echo "• Liberation Platform: https://greenfieldoverride.com"
echo "• Collective Strategist: https://strategist.greenfieldoverride.com"
echo "• API: https://api.greenfieldoverride.com"
echo "• Monitoring: https://grafana.greenfieldoverride.com"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "• Check status: docker-compose -f docker-compose.collective-strategist.yml ps"
echo "• View logs: docker-compose -f docker-compose.collective-strategist.yml logs -f"
echo "• Stop apps: docker-compose -f docker-compose.collective-strategist.yml down"
echo ""