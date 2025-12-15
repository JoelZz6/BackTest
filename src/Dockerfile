# =========================
# STAGE 1: BUILD
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json desde el nivel superior
COPY ../package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código
COPY .. .

# Compilar NestJS
RUN npm run build


# =========================
# STAGE 2: PRODUCTION
# =========================
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
