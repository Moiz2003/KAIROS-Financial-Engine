FROM node:20-alpine

WORKDIR /app

# Install dependencies before copying source (maximises layer cache)
COPY package*.json ./
RUN npm install

# Copy application source (src/ and index.html are overridden by volume mounts)
COPY . .

EXPOSE 5173

# --host 0.0.0.0 makes the dev server reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
