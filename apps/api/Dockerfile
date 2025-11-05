FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/core-api/package*.json ./services/core-api/
COPY shared/types/package*.json ./shared/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shared/ ./shared/
COPY services/core-api/ ./services/core-api/

# Build the application
WORKDIR /app/shared/types
RUN npm run build

WORKDIR /app/services/core-api
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]