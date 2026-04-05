FROM node:22

ARG WORKSPACE=bots/sotd

WORKDIR /app

COPY .yarn .yarn
COPY .yarnrc.yml .yarnrc.yml

# Copy root package.json and all workspace package.jsons first for efficient caching
COPY package.json yarn.lock ./
COPY common/package.json common/
COPY bots/is-alive/package.json bots/is-alive/
COPY bots/sotd/package.json bots/sotd/
COPY bots/fantasy-bball/package.json bots/fantasy-bball/

RUN yarn install 

COPY . .

RUN yarn build

WORKDIR /app/${WORKSPACE}

CMD ["yarn", "start"]
