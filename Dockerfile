# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- run stage ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 8080
CMD ["node", "server.mjs"]
