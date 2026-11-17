# Browsers and OS dependencies match package-lock.json's Playwright version.
FROM mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe

ARG IMAGE_REVISION=local
ARG IMAGE_SOURCE=https://github.com/oraios/ai-review-comparison
LABEL org.opencontainers.image.source=$IMAGE_SOURCE \
      org.opencontainers.image.revision=$IMAGE_REVISION \
      org.opencontainers.image.description="AI PR review demo: project tools, Chromium and Serena MCP" \
      demo.branch="main" demo.marker="REVIEW_IMAGE_OK_2026"

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    UV_PYTHON_INSTALL_DIR=/opt/python \
    PATH="/opt/review-demo/image/agents/node_modules/.bin:/opt/serena-venv/bin:/opt/uv/bin:${PATH}"
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv git gh curl jq ripgrep unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/uv \
    && /opt/uv/bin/pip install --no-cache-dir uv==0.13.8 \
    && uv python install 3.13.9

WORKDIR /opt/review-demo
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY image/agents/package.json image/agents/package-lock.json ./image/agents/
RUN cd image/agents && npm ci

# Keep Serena's matching source and license in the published image.
RUN git clone https://github.com/oraios/serena.git /opt/serena-source \
    && git -C /opt/serena-source checkout --detach 6e5c3776d4e67befaab7c290bc29b0279c98d1ed \
    && cd /opt/serena-source \
    && UV_PROJECT_ENVIRONMENT=/opt/serena-venv uv sync --frozen --no-dev --python 3.13.9
COPY demo ./demo
COPY scripts ./scripts
COPY mcp ./mcp
COPY reviewers ./reviewers
COPY review ./review
COPY tests ./tests
COPY image/write-provenance.mjs ./image/write-provenance.mjs
RUN IMAGE_REVISION=$IMAGE_REVISION IMAGE_SOURCE=$IMAGE_SOURCE node image/write-provenance.mjs \
    && npm test \
    && npm run check \
    && npm run smoke \
    && node scripts/local-demo.mjs /opt/serena-venv/bin/serena /tmp/image-smoke \
    && rm -rf /tmp/image-smoke
# GitHub job containers need an ordinary shell, no Docker socket or nested daemon.
CMD ["bash"]
