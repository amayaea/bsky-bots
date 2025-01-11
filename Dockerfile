FROM node:22

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

COPY . .

RUN yarn build

CMD ["yarn", "start"]