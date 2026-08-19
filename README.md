How to build under debian/docker
================================


## Build a new image

```bash
docker build -t bsdrogue-trixie .


```
## Run and Play Docker Container

```bash
docker run --rm -p "3080:3000" bsdrogue-trixie
```


## Develop and Test Docker Container

```bash
docker run -it -p "3080:3000" -v "$(pwd)/webapp:/home/webapp" bsdrogue-trixie /bin/bash
npm install
```
