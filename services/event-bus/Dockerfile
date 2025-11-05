FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/event-bus/package*.json ./services/event-bus/
COPY shared/events/package*.json ./shared/events/
COPY shared/types/package*.json ./shared/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shared/ ./shared/
COPY services/event-bus/ ./services/event-bus/

# Build the application
WORKDIR /app/shared/types
RUN npm run build

WORKDIR /app/shared/events
RUN npm run build

WORKDIR /app/services/event-bus
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]