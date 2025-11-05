FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/ai-integration/package*.json ./services/ai-integration/
COPY shared/types/package*.json ./shared/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shared/ ./shared/
COPY services/ai-integration/ ./services/ai-integration/

# Build the application
WORKDIR /app/shared/types
RUN npm run build

WORKDIR /app/services/ai-integration
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]