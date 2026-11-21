# ─── DocuMind AI — Frontend Dockerfile ──────────────────────────────────────
# Stage 1: Build React + TypeScript application
# Stage 2: Serve the production build with Nginx

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY . .

# API URL must be injected at build time via --build-arg or environment
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy React build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
