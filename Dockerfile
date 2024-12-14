FROM node:22

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

COPY . .

CMD ["yarn", "start"]