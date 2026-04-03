# ── Stage 1: Dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install Python + PDF dependencies
RUN apk add --no-cache python3 py3-pip py3-numpy py3-pillow \
    font-dejavu libreoffice-writer && \
    pip3 install --break-system-packages pypdf reportlab python-docx

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY public ./public

# Copy PDF generator
COPY pdf-generator ./pdf-generator

# Copy Prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
