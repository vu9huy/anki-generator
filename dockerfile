FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app

COPY package.json yarn.lock ./


RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM base AS production
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy built app
COPY --from=builder /app/build ./build

# Copy the data directory that your app needs at runtime
COPY --from=builder /app/src/data ./src/data

ENV NODE_ENV=production
ENV PORT=1998

EXPOSE 1998

CMD ["yarn", "start"]