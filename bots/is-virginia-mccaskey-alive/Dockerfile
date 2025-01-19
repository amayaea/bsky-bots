FROM node:22

ARG WORKSPACE=bots/is-virginia-mccaskey-alive

WORKDIR /app

COPY .yarn .yarn
COPY .yarnrc.yml .yarnrc.yml

COPY package.json yarn.lock ./

COPY common/package.json common/
COPY ${WORKSPACE}/package.json ${WORKSPACE}/

RUN yarn install 

COPY . .

RUN yarn build

WORKDIR /app/${WORKSPACE}

CMD ["yarn", "start"]