#!/bin/bash
# Play Here Stream (Lab Tools) - uninstaller for Volumio.
#   ./uninstall.sh                  remove the plugin and the button, keep the :8000 stream
#   ./uninstall.sh --remove-stream  also remove the HTTP stream block from MPD's template

set -u
PLUGIN_DIR=/data/plugins/miscellanea/labtools
MPD_TMPL=/volumio/app/plugins/music_service/mpd/mpd.conf.tmpl
UI_DIRS="/volumio/http/www /volumio/http/www3 /volumio/http/www4"
TAG='<script src="labtools-playhere.js"></script>'

echo "Removing Play Here Stream (Lab Tools)..."

for d in $UI_DIRS; do
  [ -f "$d/index.html" ] || continue
  if grep -qF "$TAG" "$d/index.html"; then
    sed -i 's#<script src="labtools-playhere.js"></script>##g' "$d/index.html"
    echo "  button removed from $d/index.html"
  fi
  rm -f "$d/labtools-playhere.js"
done

if [ -d "$PLUGIN_DIR" ]; then
  mv "$PLUGIN_DIR" "$HOME/labtools-removed-$(date +%Y%m%d-%H%M%S)"
  echo "  plugin folder moved to your home folder (delete it when you are sure)"
fi

if [ "${1:-}" = "--remove-stream" ]; then
  cp "$MPD_TMPL" "$HOME/mpd.conf.tmpl.before-uninstall"
  node -e '
    const fs = require("fs"), f = process.argv[1];
    const t = fs.readFileSync(f, "utf8");
    const n = t.replace(/audio_output\s*\{\s*type\s+"httpd"[^}]*\}\s*/g, "");
    if (n !== t) { fs.writeFileSync(f, n); console.log("  HTTP stream block removed from MPD template"); }
    else console.log("  no HTTP stream block found in MPD template");
  ' "$MPD_TMPL"
fi

echo "  restarting Volumio..."
sudo systemctl restart volumio
echo "Done. Press Ctrl+F5 in the browser."
