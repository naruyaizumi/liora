ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim

LABEL author="Naruya Izumi" maintainer="naruyaizumi.dev"
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends sudo tini bash curl wget git unzip zip ffmpeg imagemagick iproute2 iputils-ping net-tools dnsutils traceroute openssh-client lsof ca-certificates tzdata build-essential pkg-config cmake python3 python3-dev g++ make libtool autoconf automake libavformat-dev libavcodec-dev libavutil-dev libswresample-dev libswscale-dev libwebp-dev libpng-dev libjpeg-dev zlib1g-dev libfreetype6-dev libharfbuzz-dev libpango1.0-dev libgif-dev libopus-dev libvpx-dev libcurl4-openssl-dev libnghttp2-dev libssl-dev libc-ares-dev libuv1-dev libevent-dev libffi-dev jq git-lfs && apt-get clean && rm -rf /var/lib/apt/lists/* && useradd -m -d /home/container container

RUN npm install -g npm eslint npm-check npm-check-updates depcheck && corepack enable yarn && corepack enable pnpm

USER container
ENV USER=container HOME=/home/container
WORKDIR /home/container

STOPSIGNAL SIGINT
COPY --chown=container:container focal.sh /focal.sh
RUN chmod +x /focal.sh

ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["/focal.sh"]