# Play Here Stream for Volumio

#“From download to playing in about 2 minutes.”

Listen to your Volumio music on the PC you are controlling it from. One click on a **♪ Play here** button inside the Volumio web page, no extra tab, no VLC.

It uses MPD's own built-in HTTP stream output, which Volumio already ships with. The plugin adds the button and keeps the stream set up after updates.

> Not affiliated with or endorsed by Volumio. This is a community plugin that uses standard MPD features. It does not unlock, modify or replace any MyVolumio subscription feature.

## What it does

1. **Adds an MPD HTTP stream** on port 8000 (Ogg Vorbis, 320 kbit/s) to Volumio's MPD template, if it is not there already.
2. **Adds a floating "Play here" button** to the Volumio web UI. Click it and your browser plays the stream; click again to stop. If playback pauses, it waits and reconnects by itself.
3. **Survives updates.** Each time Volumio starts, the plugin puts the button and the stream block back if an update removed them.

The stream can also be opened directly at `http://<volumio-name>.local:8000` or `http://<volumio-ip>:8000`, in a browser or in VLC (*Media → Open Network Stream*). The plugin's settings page has a button that shows this box's exact address.

## Tested on

| Device | Volumio |
| --- | --- |
| Raspberry Pi 4 | Volumio 3 |
| Radxa Rock 3A | Volumio 3 |

Should work on any Volumio box that has `/volumio/node_modules/kew` and a stock MPD template. The installer checks this before changing anything.

## Install

Run these **on the Volumio box**, logged in by SSH as `volumio` (default password `volumio`). `install.sh` is a Linux script: running it in Windows PowerShell or CMD does nothing.

```
cd ~
curl -L https://github.com/WorldWideWebDev/playhere-stream/archive/refs/heads/main.tar.gz | tar xz
cd playhere-stream-main
bash install.sh
```

The installer:

- checks the box first and stops without changing anything if something is missing,
- backs up the MPD template and the UI pages to `~/labtools-backup-<date>`,
- copies the plugin to `/data/plugins/miscellanea/labtools`,
- restarts Volumio (twice on a first install, so MPD picks up the new stream).

**First install only:** if the installer says the plugin did not start, open Volumio → **Plugins → Installed Plugins**, switch **Lab Tools** on, then run:

```
sudo systemctl restart volumio
bash install.sh --check
```

Then open Volumio in your browser, press **Ctrl+F5** and click **♪ Play here**.

## Uninstall

```
cd ~/playhere-stream-main
bash uninstall.sh                   # removes the plugin and button, keeps the :8000 stream
bash uninstall.sh --remove-stream   # also removes the stream block from MPD's template
```

Switching the plugin off under *Plugins* also removes the button until you switch it on again.

## Limits

- Only sources that play **through MPD** are streamed: your library, web radio, UPnP. Spotify Connect and AirPlay bypass MPD and stay silent.
- The browser plays a few seconds behind the speakers (stream buffering).
- The Volumio box's own speakers keep playing. Turn them down in Volumio, or run `mpc disable alsa` (resets on restart).
- Safari on iPhone and iPad may not play Ogg Vorbis. Chrome, Edge, Brave and Firefox do.

## Troubleshooting

Read the plugin's log lines first:

```
journalctl -u volumio --since "10 min ago" | grep -i labtools
```

| Symptom | Fix |
| --- | --- |
| No button after install | Press **Ctrl+F5**. Run `bash install.sh --check`. |
| Button still shows on the box's own HDMI/touch display after updating | The display keeps the old script cached: `sudo systemctl restart volumio-kiosk` (or reboot). |
| No `LabTools` lines in the log | The plugin is switched off: *Plugins → Installed Plugins → Lab Tools* on. |
| Log says `RESTORED` | Restart Volumio once more so MPD uses the new stream. |
| Log says `no fifo block to anchor on` | Your MPD template differs from stock. Use the manual setup below. |
| Button stuck on *Waiting for stream* | Play something from the library or web radio; check `mpc outputs` lists `HTTP Stream` as enabled. |
| Button in an awkward place | Change `left:125px` / `bottom:148px` in `labtools-playhere.js` (about 4 px per mm), re-run `bash install.sh`, press Ctrl+F5. |

### Manual stream setup

Edit the template (not `/etc/mpd.conf`, which Volumio regenerates on every boot):

```
nano /volumio/app/plugins/music_service/mpd/mpd.conf.tmpl
```

Paste this after the closing `}` of the `alsa` output block:

```
audio_output {
type "httpd"
name "HTTP Stream"
encoder "vorbis"
port "8000"
bitrate "320"
format "44100:16:2"
}
```

Save, run `sudo systemctl restart volumio`, then check `mpc outputs` shows `Output 2 (HTTP Stream) is enabled`. Do not set the `multiroom` output to enabled; it will stop playback working.

## Files

| File | Purpose |
| --- | --- |
| `plugin/package.json` | Plugin metadata (`boot_priority` is required by Volumio) |
| `plugin/index.js` | Adds the button, keeps the stream block, settings-page button |
| `plugin/labtools-playhere.js` | The button and audio player that run in the browser |
| `plugin/UIConfig.json` | The plugin's settings page |
| `install.sh` / `uninstall.sh` | Install, check and remove |

## License

MIT, see [LICENSE](LICENSE).
