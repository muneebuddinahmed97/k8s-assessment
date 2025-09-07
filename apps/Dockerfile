FROM node:18-alpine

# Workdir
WORKDIR /app

# Copy package.json first
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy app code
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "index.js"]
