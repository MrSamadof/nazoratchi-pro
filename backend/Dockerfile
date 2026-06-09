# syntax=docker/dockerfile:1.7
# Backend — Express API + Worker (tsx orqali, build qadami yo'q).
# Bitta image, `web`/`worker` konteynerlarida CMD bilan ajraladi.
# Build context = monorepo root.

# --- Dependencies ---
FROM node:24-alpine AS deps
WORKDIR /app
# bcrypt (native modul) alpine/musl da prebuilt topmasa kompilyatsiya qiladi.
RUN apk add --no-cache python3 make g++
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# --- Runner ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent
RUN apk add --no-cache tzdata

COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/api ./api
COPY backend/worker ./worker

USER node
EXPOSE 4000

# Default — API. Worker konteyneri CMD ni override qiladi.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
