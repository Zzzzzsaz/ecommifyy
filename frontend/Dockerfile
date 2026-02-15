FROM node:18-alpine AS build

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Set backend URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build
RUN npm run build

# Production
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
