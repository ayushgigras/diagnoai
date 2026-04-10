# Build stage
FROM node:18-alpine AS builder

# Install tesseract-ocr, though frontend typically wouldn't run it (adding per user request "in both Dockerfiles")
RUN apk add --no-cache tesseract-ocr

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve stage using Nginx alpine
FROM nginx:alpine

# The production nginx config will be mounted from docker-compose.prod.yml usually, or copied
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
