FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate

USER node
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

RUN pnpm run build


FROM busybox:latest AS server
COPY dist/ /www
CMD ["httpd", "-f", "-h", "/www"]
