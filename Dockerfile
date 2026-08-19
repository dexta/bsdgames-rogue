FROM debian:trixie AS build

RUN apt-get update && apt-get upgrade -y 
RUN apt-get install -y  pbuilder libncurses5-dev git

RUN mkdir /home/build/ && cd /home/build && git clone https://github.com/dexta/bsdgames-rogue.git .
WORKDIR /home/build

RUN ./configure && make

#RUN mkdir -p /var/games/bsdgames-nonfree/ && touch /var/games/bsdgames-nonfree/rogue.scores

RUN dpkg-buildpackage -B -d
RUN dpkg -i /home/bsdgames-nonfree_2.17-9_amd64.deb

FROM node:24-trixie-slim

RUN apt-get update && apt-get upgrade -y && apt-get install -y libncurses6 python3 build-essential

COPY --from=build /home/bsdgames-nonfree_2.17-9_amd64.deb /home/
RUN dpkg -i /home/bsdgames-nonfree_2.17-9_amd64.deb

RUN mkdir /home/webapp
COPY ./webapp/ /home/webapp/

WORKDIR /home/webapp
RUN rm -rf /home/webapp/node_modules
RUN npm install

EXPOSE 3000

CMD ["node","server.js"]
