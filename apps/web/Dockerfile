# Multi-stage build for production-ready React app
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY shared/react-guided-tour/package*.json ./shared/react-guided-tour/

# Install workspace dependencies
RUN npm ci

# Copy shared packages source
COPY shared/react-guided-tour/ ./shared/react-guided-tour/

# Build shared packages first
WORKDIR /app/shared/react-guided-tour
RUN npm ci && npm run build

# Copy web app source and build
WORKDIR /app
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web
RUN npm ci && npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]