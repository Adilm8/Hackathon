#!/usr/bin/env sh
# Rebuild every Story friend layer from docs/design/avatar/sheets (see docs/design/avatar-prompts.md, section 6).
# Needs Python 3 with Pillow, NumPy, SciPy and vtracer: pip install -r scripts/avatar/requirements.txt
set -e
cd "$(dirname "$0")"
rm -rf .cache ../../public/avatar
python3 slice.py
python3 trace.py
node build.mjs
