#!/usr/bin/env bash
# Rebuilds the page from the plain data in this folder.
# Needs: python3, pip packages sudachipy + sudachidict_core, node (for the syntax check)
set -euo pipefail
cd "$(dirname "$0")"
python3 -I lemmas.py > /dev/null 2>&1          # readings of every word -> lemmas.json
cp before_detail.html out.html                  # static page shell
JPT_OUT=out.html python3 -I build3.py           # data, furigana, explanations -> out.html
python3 -I post_patch.py out.html               # manual patches (see post_patch.py)
python3 -I - <<'PY'
import re
s = open('out.html', encoding='utf8').read()
open('out_check.js', 'w', encoding='utf8').write(re.search(r'<script>(.*)</script>', s, re.S).group(1))
PY
node --check out_check.js && echo "syntax ok"
echo "built: tools/jpt-build/out.html  (copy to ../../jpt-reading-2weeks.html to update the page)"
