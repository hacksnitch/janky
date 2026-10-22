# Use lightweight Node LTS Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency specifications first for Docker cache optimization
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/
COPY public/ ./public/

# Cloud Run injects PORT environment variable (defaults to 8080 or 3000)
ENV PORT=8080
EXPOSE 8080

# Run the server
CMD ["node", "src/server.js"]
