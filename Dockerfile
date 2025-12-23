FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage layer caching
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --production

# Copy app source
COPY . .

# Expose the port the app listens on
EXPOSE 3000

# Run the server
CMD ["node", "server.js"]


