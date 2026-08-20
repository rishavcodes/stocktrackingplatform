# Stage 1
FROM node:20 AS builder

WORKDIR /build

COPY package*.json ./
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./

RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build


# Stage 2
FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /build/package*.json ./
COPY --from=builder /build/node_modules ./node_modules/
COPY --from=builder /build/dist ./dist/

EXPOSE 8080

CMD ["npm", "start"]