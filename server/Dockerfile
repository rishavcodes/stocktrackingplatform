# Stage 1

FROM node:20 as builder

WORKDIR /build

COPY package*.json .
RUN npm install

COPY src/ src/
COPY tsconfig.json tsconfig.json

RUN npm run build



# Stage 2

FROM node:20-slim as runner

# 🔥 Install LibreOffice (required for DOCX → PDF)
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder build/package*.json .
COPY --from=builder build/node_modules node_modules/
COPY --from=builder build/dist dist/

EXPOSE 8080

CMD [ "npm", "start" ]