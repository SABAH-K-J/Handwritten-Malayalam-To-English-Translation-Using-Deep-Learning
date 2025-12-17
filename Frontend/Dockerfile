# FRONTEND/Dockerfile

# 1. Use Node.js image
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the frontend code
COPY . .

# 5. Expose the port (5173 for Vite, 3000 for CRA)
EXPOSE 5173

# 6. Start the app
#    --host is crucial to allow access from outside the container
CMD ["npm", "run", "dev", "--", "--host"]