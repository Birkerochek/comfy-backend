# -----------------------------
# 1. Base builder image
# -----------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci

# Копируем исходники
COPY . .

# Строим Strapi (создаёт папку /build)
RUN npm run build


# -----------------------------
# 2. Runtime image (production-only)
# -----------------------------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Только прод-зависимости
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Копируем билд Strapi
COPY --from=builder /app/build ./build
COPY --from=builder /app/config ./config
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# Порт Strapi
EXPOSE 1337

CMD ["npm", "start"]
