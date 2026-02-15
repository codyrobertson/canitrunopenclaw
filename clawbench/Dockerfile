FROM node:20-slim

WORKDIR /bench

RUN apt-get update && \
    apt-get install -y curl procps git python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

COPY bench.sh /bench/bench.sh
RUN chmod +x /bench/bench.sh

ENTRYPOINT ["/bench/bench.sh"]
