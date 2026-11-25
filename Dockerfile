# ============================================================================
# Stage 1: Build Frontend (Vite + React 19 + Tailwind CSS v4 + shadcn/ui)
# ============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================================================
# Stage 2: Build Backend (Go Static Binary)
# ============================================================================
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod ./
COPY backend/*.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go test -v ./... && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /wedding-saas .

# ============================================================================
# Stage 3: Ultra-Light & Hardened Production Runtime (Alpine)
# ============================================================================
FROM alpine:3.21
RUN apk --no-cache add ca-certificates tzdata wget && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /srv/app
COPY --from=backend-builder /wedding-saas /srv/app/wedding-saas
COPY --from=frontend-builder /app/frontend/dist /srv/app/public

RUN mkdir -p /srv/app/data && chown -R appuser:appgroup /srv/app

USER appuser
ENV PORT=8080
ENV STATIC_DIR=/srv/app/public
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["/srv/app/wedding-saas"]
