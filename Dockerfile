# ---- Stage 1 : build (bila perlu) -----------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production          # install dependensi saja

# ---- Stage 2 : runtime ----------------------------
FROM node:20-alpine
WORKDIR /app

# buat user non-root (opsional tapi best-practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# salin hasil build + kode
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# ganti owner agar non-root bisa baca
RUN chown -R nodejs:nodejs /app
USER nodejs

# Scalingo men-set PORT secara otomatis
ENV NODE_ENV=production
EXPOSE 3000

# entry point tetap di src/main.js
CMD ["node", "src/main.js"]
