#!/bin/sh
# Новая версия сборки во всех файлах: ./bump-version.sh 2026-11-10.1
# Без совпадения версий страница просит перезагрузиться (защита от смеси старых и новых файлов в кэше).
set -e
NEW="$1"
[ -n "$NEW" ] || { echo "Укажите версию, например: ./bump-version.sh $(date +%Y-%m-%d).1"; exit 1; }
cd "$(dirname "$0")"
OLD=$(sed -n 's/.*name="vitrina-build" content="\([^"]*\)".*/\1/p' index.html)
for f in index.html app.js data.js view.js demo.js; do
  sed -i '' "s/$OLD/$NEW/g" "$f"
done
echo "$OLD → $NEW"
