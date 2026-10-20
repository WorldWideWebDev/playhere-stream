#!/bin/bash
# Play Here Stream (Lab Tools) - installer for Volumio.
# Run on the Volumio box as the volumio user:   ./install.sh
# Re-run the checks only:                       ./install.sh --check

set -u
PLUGIN_DIR=/data/plugins/miscellanea/labtools
SRC_DIR="$(cd "$(dirname "$0")" && pwd)/plugin"
MPD_TMPL=/volumio/app/plugins/music_service/mpd/mpd.conf.tmpl
UI_DIRS="/volumio/http/www /volumio/http/www3 /volumio/http/www4"

ok()   { echo "  [ OK ] $*"; }
warn() { echo "  [WARN] $*"; }
fail() { echo "  [FAIL] $*"; exit 1; }

check() {
  echo
  echo "Checking the install..."
  local all=0
  for d in $UI_DIRS; do
    [ -f "$d/index.html" ] || continue
    if grep -q labtools-playhere "$d/index.html"; then ok "button loaded in $d"; else warn "button NOT in $d/index.html"; all=1; fi
  done
  if grep -q 'type "httpd"' "$MPD_TMPL"; then ok "HTTP stream block in MPD template"; else warn "HTTP stream block missing"; all=1; fi
  if command -v mpc >/dev/null && mpc outputs 2>/dev/null | grep -q 'HTTP Stream) is enabled'; then
    ok "MPD output 'HTTP Stream' enabled"
  else
    warn "MPD does not list 'HTTP Stream' as enabled yet"; all=1
  fi
  echo
  if [ $all -eq 0 ]; then
    echo "All good. Open Volumio in your browser, press Ctrl+F5, and click 'Play here'."
  else
    echo "Not finished. Make sure Lab Tools is switched ON under Plugins > Installed Plugins,"
    echo "then run:  sudo systemctl restart volumio  and  bash install.sh --check"
  fi
}

restart_and_wait() {
  local since
  since=$(date '+%Y-%m-%d %H:%M:%S')
  echo "  Restarting Volumio (about 30-60 s)..."
  sudo systemctl restart volumio
  for _ in $(seq 1 30); do
    sleep 3
    if journalctl -u volumio --since "$since" 2>/dev/null | grep -q 'LabTools Started'; then
      sleep 3
      LOG=$(journalctl -u volumio --since "$since" 2>/dev/null | grep -i labtools)
      return 0
    fi
  done
  LOG=$(journalctl -u volumio --since "$since" 2>/dev/null | grep -i labtools)
  return 1
}

if [ "${1:-}" = "--check" ]; then check; exit 0; fi

echo "Play Here Stream (Lab Tools) installer"
echo

# 1. Sanity checks - nothing is changed here
[ -d /volumio ] || fail "this does not look like a Volumio box (/volumio missing)"
[ -d /volumio/node_modules/kew ] || fail "/volumio/node_modules/kew not found - this Volumio version is not supported yet"
[ -f "$MPD_TMPL" ] || fail "MPD template not found at $MPD_TMPL"
[ -f "$SRC_DIR/index.js" ] || fail "plugin files not found next to this script ($SRC_DIR)"
[ "$(id -un)" = "volumio" ] || warn "you are not the volumio user; files will be handed to volumio afterwards"
node -c "$SRC_DIR/index.js" && node -c "$SRC_DIR/labtools-playhere.js" || fail "plugin files have a syntax error"
ok "Volumio found, plugin files valid"

# 2. Back up everything the plugin will touch
BACKUP="$HOME/labtools-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp "$MPD_TMPL" "$BACKUP/mpd.conf.tmpl"
for d in $UI_DIRS; do
  [ -f "$d/index.html" ] && cp "$d/index.html" "$BACKUP/$(basename "$d")-index.html"
done
[ -d "$PLUGIN_DIR" ] && cp -R "$PLUGIN_DIR" "$BACKUP/previous-plugin"
ok "backup saved in $BACKUP"

# 3. Install the plugin files
mkdir -p "$PLUGIN_DIR"
rm -f "$PLUGIN_DIR"/*.old* "$PLUGIN_DIR"/index.js.bak
cp "$SRC_DIR"/package.json "$SRC_DIR"/config.json "$SRC_DIR"/UIConfig.json \
   "$SRC_DIR"/index.js "$SRC_DIR"/labtools-playhere.js "$PLUGIN_DIR"/
[ "$(id -un)" = "volumio" ] || sudo chown -R volumio:volumio "$PLUGIN_DIR"
ok "plugin installed in $PLUGIN_DIR"

# 4. Start it
if ! restart_and_wait; then
  echo
  warn "Volumio restarted but the plugin did not start."
  echo "  First install? Open Volumio > Plugins > Installed Plugins and switch 'Lab Tools' ON,"
  echo "  then run:  sudo systemctl restart volumio  and  bash install.sh --check"
  exit 0
fi
ok "plugin started"

# 5. A first install adds the stream block to MPD's template; MPD needs one more restart to use it
if echo "$LOG" | grep -q 'RESTORED'; then
  ok "HTTP stream block added to MPD template - one more restart to activate it"
  restart_and_wait || true
fi
if echo "$LOG" | grep -q 'no fifo block'; then
  warn "could not add the HTTP stream block automatically - see 'Manual stream setup' in README.md"
fi

check
