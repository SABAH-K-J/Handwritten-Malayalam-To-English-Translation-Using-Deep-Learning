# Stage 1: Build the application
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
# If you have a lock file (package-lock.json or yarn.lock), copy it here too.
# Since you have bun.lockb, we'll stick to npm install which generates a lock file.
RUN npm install

# Copy the rest of the source code
COPY . .

# Accept API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
