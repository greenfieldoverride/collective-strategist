#!/bin/bash

# Deploy The Collective Strategist
# This script deploys both the frontend and API using Docker Compose

set -e

# Change to script directory to ensure relative paths work
cd "$(dirname "$0")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying The Collective Strategist...${NC}"

# Check if .env.server exists
if [[ ! -f ".env.server" ]]; then
    echo -e "${RED}❌ .env.server file not found${NC}"
    echo -e "${YELLOW}Please create .env.server from the example template:${NC}"
    echo "cp .env.server.example .env.server"
    echo "Then edit .env.server with your actual values."
    echo "Run ./setup-database.sh first to generate the database password."
    exit 1
fi

# Check for placeholder values
if grep -q "CHANGE_ME" .env.server; then
    echo -e "${RED}❌ .env.server contains placeholder values${NC}"
    echo -e "${YELLOW}Please update .env.server with real values:${NC}"
    echo "1. Run ./setup-database.sh to generate PostgreSQL password"
    echo "2. Generate JWT_SECRET with: openssl rand -base64 32"
    echo "3. Update ACME_EMAIL to your actual admin email address"
    echo "4. Update .env.server with the real values"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker and run this script again.${NC}"
    exit 1
fi

# Check if liberation-postgres container is running
if ! docker ps | grep -q liberation-postgres; then
    echo -e "${RED}❌ liberation-postgres container is not running${NC}"
    echo -e "${YELLOW}Please make sure the liberation infrastructure is running.${NC}"
    exit 1
fi

# Check if collective_strategist database exists
echo -e "${BLUE}🔍 Checking if collective_strategist database exists...${NC}"
if ! docker exec liberation-postgres psql -U liberation -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='collective_strategist';" | grep -q 1; then
    echo -e "${RED}❌ collective_strategist database does not exist${NC}"
    echo -e "${YELLOW}Please run ./setup-database.sh first to create the database.${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Building and deploying containers...${NC}"

# Deploy using Docker Compose
docker-compose --env-file .env.server -f docker-compose.simple-integration.yml up -d --build

echo -e "${BLUE}⏳ Waiting for containers to start...${NC}"
sleep 10

# Check container status
echo -e "${BLUE}📊 Container status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep collective-strategist || echo "No collective-strategist containers found"

# Check frontend health
echo -e "${BLUE}🔍 Checking frontend health...${NC}"
if curl -f -s http://localhost:8090/health >/dev/null; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend health check failed${NC}"
    echo "Check logs: docker logs collective-strategist-frontend"
fi

# Check API health
echo -e "${BLUE}🔍 Checking API health...${NC}"
if docker exec collective-strategist-api wget -q --spider http://localhost:8007/health 2>/dev/null; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed${NC}"
    echo "Check logs: docker logs collective-strategist-api"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📍 Access URLs:${NC}"
echo "• The Collective Strategist: https://strategist.greenfieldoverride.com"
echo "• Local Frontend: http://localhost:8090"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "• Check logs: docker-compose -f docker-compose.simple-integration.yml logs -f"
echo "• Stop services: docker-compose -f docker-compose.simple-integration.yml down"
echo "• Restart services: docker-compose -f docker-compose.simple-integration.yml restart"
echo ""