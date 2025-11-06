FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY shared/types/package*.json ./shared/types/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY apps/api/ ./apps/api/

# Install dependencies for shared types package
WORKDIR /app/shared/types
RUN npm ci

# Build shared types first
RUN npm run build

# Build the API application
WORKDIR /app/apps/api
RUN npm ci
RUN npm run build

EXPOSE 8007

CMD ["npm", "start"]