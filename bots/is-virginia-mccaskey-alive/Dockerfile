FROM node:22

ARG WORKSPACE=bots/is-virginia-mccaskey-alive

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

COPY . .

WORKDIR /app/common

RUN yarn build

WORKDIR /app/${WORKSPACE}

RUN yarn build

WORKDIR ${WORKSPACE}

CMD ["yarn", "start"]