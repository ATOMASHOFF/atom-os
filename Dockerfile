FROM node:20-alpine AS deps

WORKDIR /app

# Install workspace dependencies based on lockfile for deterministic builds.
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

FROM deps AS builder

WORKDIR /app

COPY . .
RUN npm run build:shared && npm run build:api

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Copy only runtime essentials and compiled output.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:4000/health',res=>process.exit(res.statusCode===200?0:1));req.setTimeout(3000,()=>{req.destroy();process.exit(1);});req.on('error',()=>process.exit(1));"

CMD ["node", "apps/api/dist/index.js"]