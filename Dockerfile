# Use official Node.js image as base
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build arguments for environment configuration
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build static assets (SCSS to CSS)
RUN npm run build


# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start:prod"]