# Multi-stage Dockerfile for Vidisto

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/web

# Copy package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY web/ ./

# Build frontend
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

# Install FFmpeg (required for video processing)
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY server/ ./server/
COPY src/ ./src/
COPY scripts/ ./scripts/

# Copy built frontend from builder
COPY --from=frontend-builder /app/web/dist ./web/dist
COPY --from=frontend-builder /app/web/public ./web/public

# Create necessary directories
RUN mkdir -p data temp/videos temp/images uploads/featured-videos logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vidsto -u 1001

# Set permissions
RUN chown -R vidsto:nodejs /app

# Switch to non-root user
USER vidsto

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server/index.js"]



