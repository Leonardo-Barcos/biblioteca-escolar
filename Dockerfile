# Imagem opcional para rodar a Biblioteca Escolar em qualquer serviço que aceite Docker.
# Sem DATABASE_URL, usa o banco embutido (PGlite) na pasta /data — monte um volume nela.
# Com DATABASE_URL, usa o Postgres informado (ex.: Supabase).
FROM node:24-slim

ENV NODE_ENV=production \
    TZ=America/Belem \
    PORT=8080 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
COPY public ./public

EXPOSE 8080
CMD ["node", "src/server.js"]
