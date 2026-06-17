FROM node:20.18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# node:20-alpine ships a non-root "node" user (uid 1000)
USER node

EXPOSE 8080

CMD ["npm", "start"]
