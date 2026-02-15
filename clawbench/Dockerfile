FROM node:20-slim

WORKDIR /bench

# Core tools + language toolchains
# Go: for PicoClaw
# Rust: for ZeroClaw and IronClaw
# C build tools: for MimiClaw (C via ESP-IDF, but we can at least compile standard C)
# Python: for Nanobot
# Node/TypeScript: already in base image for NanoClaw/OpenClaw
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl procps git python3 python3-pip python3-venv \
      build-essential gcc make cmake pkg-config libssl-dev \
      time && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g tsx 2>/dev/null || true

# Install Go (latest stable)
ENV GO_VERSION=1.23.6
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-$(dpkg --print-architecture).tar.gz" | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"
ENV GOPATH="/root/go"

# Install Rust via rustup (minimal profile)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

COPY bench.sh /bench/bench.sh
RUN chmod +x /bench/bench.sh

ENTRYPOINT ["/bench/bench.sh"]
