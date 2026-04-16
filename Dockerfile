# Build context must contain both frontend/ and client/ directories.
# The workflow checks out both repos side by side before building.
FROM node:22-alpine AS builder
WORKDIR /workspace
# Copy client lib so frontend's file:../client reference resolves
COPY client/ ./client/
# Install and build frontend
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /workspace/frontend/dist /usr/share/nginx/html
COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
