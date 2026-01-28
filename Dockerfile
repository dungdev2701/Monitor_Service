# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript

# Copy package files
COPY package.json ./

# Install all dependencies using npm
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript
RUN tsc

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Start service
CMD ["node", "dist/index.js"]
