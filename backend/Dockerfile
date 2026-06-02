# ---------------------------------------------------------
# Stage 1: Build Environment
# ---------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ---------------------------------------------------------
# Stage 2: Production Environment
# ---------------------------------------------------------
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies to keep image small
RUN npm ci --only=production

# Generate Prisma Client (needed in prod)
RUN npx prisma generate

# Copy compiled source from builder
COPY --from=builder /usr/src/app/dist ./dist

# Security: Do not run as root. Switch to the unprivileged 'node' user provided by the alpine image.
USER node

# Expose API port
EXPOSE 4000

# Start command
CMD ["npm", "start"]
