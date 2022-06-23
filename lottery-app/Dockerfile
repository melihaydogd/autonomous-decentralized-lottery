FROM node:alpine

# set working directory
WORKDIR /app

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent

# add app
COPY . .
RUN npm run build

ENV PORT 4000
EXPOSE 4000
# start app
CMD npm start