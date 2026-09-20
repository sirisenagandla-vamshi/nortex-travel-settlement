FROM node:20-bookworm-slim
WORKDIR /app

COPY pack ./pack
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY backend/package.json backend/package-lock.json ./backend/
COPY scripts ./scripts

WORKDIR /app/frontend
RUN npm ci
COPY frontend ./
RUN npm run build

WORKDIR /app/backend
RUN npm ci
COPY backend ./
RUN npx prisma generate && npm run build

WORKDIR /app
RUN node scripts/copy-frontend.mjs

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PACK_DIR=/app/pack
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/main"]
