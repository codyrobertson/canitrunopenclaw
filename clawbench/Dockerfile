FROM node:20-slim

WORKDIR /bench

# Core tools + language toolchains
# Go: for PicoClaw (arm64, amd64 only — no armhf or riscv64 official builds)
# Rust: for ZeroClaw and IronClaw (supports all architectures via rustup)
# C build tools: for MimiClaw
# Python: for Nanobot
# Node/TypeScript: already in base image for NanoClaw/OpenClaw
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl procps git python3 python3-pip python3-venv \
      build-essential gcc make cmake pkg-config libssl-dev \
      time && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g tsx 2>/dev/null || true

# Install Go — only on architectures that have official builds
ENV GO_VERSION=1.23.6
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "arm64" ]; then \
      curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz" | tar -C /usr/local -xz; \
    else \
      echo "Skipping Go install — no official build for $ARCH"; \
    fi
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"
ENV GOPATH="/root/go"

# Install Rust via rustup (supports all platforms)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

COPY bench.sh /bench/bench.sh
RUN chmod +x /bench/bench.sh

ENTRYPOINT ["/bench/bench.sh"]
