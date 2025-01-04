FROM node:22

WORKDIR /app

COPY yarn.lock package.json ./

RUN yarn install 

COPY . .

EXPOSE 8080

CMD ["yarn", "start"]