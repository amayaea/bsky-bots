FROM node:22

ARG WORKSPACE=bots/fantasy-bball

WORKDIR /app

COPY .yarn .yarn
COPY .yarnrc.yml .yarnrc.yml

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
