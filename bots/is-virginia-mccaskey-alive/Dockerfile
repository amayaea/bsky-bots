FROM node:22

ARG WORKSPACE=bots/is-virginia-mccaskey-alive

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

COPY . .

RUN yarn build

WORKDIR ${WORKSPACE}

CMD ["yarn", "start"]