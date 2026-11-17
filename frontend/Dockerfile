# Frontend: build Vite, lalu disajikan nginx (static + proxy API + proxy LiveKit).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
# VITE_API_URL kosong = same-origin /api (nginx yang meneruskan ke backend).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.29-alpine AS runtime

# Template diproses entrypoint resmi nginx (envsubst) saat container start.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Runtime config: tulis /usr/share/nginx/html/config.js dari env (tanpa rebuild).
COPY docker-entrypoint.d/50-runtime-config.sh /docker-entrypoint.d/50-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/50-runtime-config.sh

COPY --from=build /app/dist /usr/share/nginx/html

ENV DOMAIN=_ \
    BACKEND_UPSTREAM=backend:3001 \
    LIVEKIT_UPSTREAM=livekit:7880 \
    NGINX_RESOLVER=127.0.0.11 \
    VITE_API_URL=

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1