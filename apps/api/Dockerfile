FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @fitness-tracker/api...
COPY apps/api apps/api
RUN pnpm --filter @fitness-tracker/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
RUN pnpm install --frozen-lockfile --prod --filter @fitness-tracker/api...
USER node
EXPOSE 4000
CMD ["pnpm", "--filter", "@fitness-tracker/api", "start"]
