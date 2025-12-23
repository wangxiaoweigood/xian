FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app . 

# Install curl for healthcheck and create non-root user
RUN apk add --no-cache curl \
 && addgroup -S appgroup \
 && adduser -S appuser -G appgroup

USER appuser

ENV NODE_ENV=production
EXPOSE 3000

# Healthcheck uses HTTP root path (server.js responds with 200)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD curl -sf http://localhost:3000/ || exit 1

CMD ["node", "server.js"]


