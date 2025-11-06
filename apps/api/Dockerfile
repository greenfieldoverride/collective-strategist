FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY shared/types/package*.json ./shared/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shared/ ./shared/
COPY apps/api/ ./apps/api/

# Build shared types first
WORKDIR /app/shared/types
RUN npm run build

# Build the API application
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 8007

CMD ["npm", "start"]