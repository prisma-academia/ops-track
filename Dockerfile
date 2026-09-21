FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (this also runs prisma generate based on package.json)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV APP_DOMAIN="localhost:3000"
ENV SESSION_SECRET="dummy_secret_min_16_chars!"
ENV OTP_PEPPER="dummy_pepper!"
ENV PLATFORM_ADMIN_EMAIL="admin@example.com"
ENV PLATFORM_ADMIN_PASSWORD="dummy_password123!"
ENV SMTP_HOST="dummy"
ENV SMTP_PORT="587"
ENV SMTP_USER="dummy"
ENV SMTP_PASS="dummy"
ENV SMTP_FROM="dummy@example.com"
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
