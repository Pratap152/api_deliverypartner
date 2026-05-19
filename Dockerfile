FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npx prisma generate

ENV PORT=5050

EXPOSE 5050

CMD ["npm", "start"]
