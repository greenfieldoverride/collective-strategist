FROM node:24-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY shared/types/package*.json ./shared/types/
COPY shared/events/package*.json ./shared/events/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY apps/api/ ./apps/api/

# Install and build shared packages first
WORKDIR /app/shared/types
RUN npm ci
RUN npm run build

WORKDIR /app/shared/events
RUN npm ci
RUN npm run build

# Install API dependencies and build for production
WORKDIR /app/apps/api
RUN npm ci
RUN npm run build

EXPOSE 8007

CMD ["npm", "start"]