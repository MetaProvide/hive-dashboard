FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate

USER node
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

RUN pnpm run build


FROM busybox:latest AS server
ENV NODE_URL=http://localhost:3000
COPY --from=build /app/dist/ /www
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["httpd", "-f", "-h", "/www"]
