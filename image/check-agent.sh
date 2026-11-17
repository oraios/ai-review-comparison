#!/bin/sh
set -eu
cd /review-demo
export LD_LIBRARY_PATH=/review-demo/lib
bin/node --version
bin/node -p 'JSON.parse(require("node:fs").readFileSync("image/provenance.json")).revision'
if [ -f /tmp/gh-aw/review-input/pricing.json ]; then
  export DEMO_PRICING=/tmp/gh-aw/review-input/pricing.json
  # A changed PR can legitimately fail assertions. Print the results for Codex.
  bin/node --input-type=module -e 'import {checkFixture} from "./scripts/check-fixture.mjs"; import {loadPricing} from "./demo/pricing.mjs"; console.log(JSON.stringify(checkFixture(await loadPricing(process.env.DEMO_PRICING))))'
else
  bin/node scripts/check-fixture.mjs
fi
printf 'agentRuntimeId='
cat /review-demo/runtime-id
