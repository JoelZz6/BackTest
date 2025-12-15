# =========================
# STAGE 1: BUILD
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# 1️⃣ Copiar dependencias (root del proyecto)
COPY package*.json ./

# 2️⃣ Instalar dependencias
RUN npm install

# 3️⃣ Copiar el resto del proyecto
COPY . .

# 4️⃣ Compilar NestJS
RUN npm run build


# =========================
# STAGE 2: PRODUCTION
# =========================
FROM node:20-alpine

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
