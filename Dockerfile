FROM node:18-alpine

WORKDIR /excalidraw-room

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn

COPY tsconfig.json ./
COPY src ./src
RUN yarn build

EXPOSE 80
CMD ["yarn", "start"]
