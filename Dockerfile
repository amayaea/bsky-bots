FROM node:22

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

RUN yarn build

COPY . .

CMD ["yarn", "start"]