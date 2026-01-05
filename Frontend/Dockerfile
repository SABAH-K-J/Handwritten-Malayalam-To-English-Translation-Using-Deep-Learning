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

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config if needed, but default is usually fine for simple SPA
# We might need to handle client-side routing (SPA) by redirecting 404s to index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
