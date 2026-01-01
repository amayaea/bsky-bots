FROM node:22

ARG WORKSPACE=bots/is-alive

WORKDIR /app

COPY .yarn .yarn
COPY .yarnrc.yml .yarnrc.yml

COPY package.json yarn.lock ./

COPY common/package.json common/
COPY ${WORKSPACE}/package.json ${WORKSPACE}/

RUN yarn install 

COPY . .

RUN yarn workspace is-alive build

WORKDIR /app/${WORKSPACE}

CMD ["yarn", "start"]