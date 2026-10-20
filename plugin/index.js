'use strict';

// Play Here Stream (Lab Tools) - a Volumio plugin.
// Adds a "Play here" button to the Volumio web UI that plays MPD's
// built-in HTTP stream (port 8000) in the browser you are controlling from.

var libQ = require('/volumio/node_modules/kew');
var fs = require('fs');
var path = require('path');
var os = require('os');

var UI_DIRS = ['/volumio/http/www', '/volumio/http/www3', '/volumio/http/www4'];
var SCRIPT_NAME = 'labtools-playhere.js';
var SCRIPT_TAG = '<script src="' + SCRIPT_NAME + '"></script>';
var MPD_TMPL = '/volumio/app/plugins/music_service/mpd/mpd.conf.tmpl';
var HTTPD_BLOCK = [
  'audio_output {',
  'type "httpd"',
  'name "HTTP Stream"',
  'encoder "vorbis"',
  'port "8000"',
  'bitrate "320"',
  'format "44100:16:2"',
  '}'
].join('\n');

module.exports = LabTools;

function LabTools(context) {
  this.context = context;
  this.commandRouter = context.coreCommand;
  this.logger = context.logger;
  this.configManager = context.configManager;
}

LabTools.prototype.onVolumioStart = function () {
  return libQ.resolve();
};

LabTools.prototype.onStart = function () {
  this.logger.info('LabTools Started');
  this.installPlayHere();
  this.ensureHttpStream();
  return libQ.resolve();
};

LabTools.prototype.onStop = function () {
  this.removePlayHere();
  return libQ.resolve();
};

LabTools.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  try {
    defer.resolve(require(__dirname + '/UIConfig.json'));
  } catch (e) {
    defer.reject(e);
  }
  return defer.promise;
};

// ---------- Play Here: inject the button script into the web UI ----------

LabTools.prototype.installPlayHere = function () {
  var self = this;
  var src = path.join(__dirname, SCRIPT_NAME);
  UI_DIRS.forEach(function (dir) {
    var index = path.join(dir, 'index.html');
    if (!fs.existsSync(index)) return;
    try {
      fs.copyFileSync(src, path.join(dir, SCRIPT_NAME));
      var html = fs.readFileSync(index, 'utf8');
      if (html.indexOf(SCRIPT_TAG) !== -1) {
        self.logger.info('LabTools: Play Here already present in ' + index);
        return;
      }
      if (html.indexOf('</body>') === -1) {
        self.logger.error('LabTools: no </body> in ' + index + ', skipped');
        return;
      }
      if (!fs.existsSync(index + '.labtools.bak')) {
        fs.copyFileSync(index, index + '.labtools.bak');
      }
      fs.writeFileSync(index, html.replace('</body>', SCRIPT_TAG + '</body>'));
      self.logger.info('LabTools: Play Here added to ' + index);
    } catch (e) {
      self.logger.error('LabTools: cannot update ' + index + ': ' + e);
    }
  });
};

LabTools.prototype.removePlayHere = function () {
  var self = this;
  UI_DIRS.forEach(function (dir) {
    var index = path.join(dir, 'index.html');
    if (!fs.existsSync(index)) return;
    try {
      var html = fs.readFileSync(index, 'utf8');
      if (html.indexOf(SCRIPT_TAG) !== -1) {
        fs.writeFileSync(index, html.split(SCRIPT_TAG).join(''));
        self.logger.info('LabTools: Play Here removed from ' + index);
      }
      var js = path.join(dir, SCRIPT_NAME);
      if (fs.existsSync(js)) fs.unlinkSync(js);
    } catch (e) {
      self.logger.error('LabTools: cannot clean ' + index + ': ' + e);
    }
  });
};

// ---------- Keep the MPD HTTP stream block alive after updates ----------

LabTools.prototype.ensureHttpStream = function () {
  var self = this;
  try {
    var tmpl = fs.readFileSync(MPD_TMPL, 'utf8');
    if (/type\s+"httpd"/.test(tmpl)) {
      self.logger.info('LabTools: HTTP stream block present in mpd template');
      return;
    }
    var m = tmpl.match(/audio_output\s*\{\s*type\s+"fifo"/);
    if (!m) {
      self.logger.error('LabTools: HTTP block missing and no fifo block to anchor on; not touching template');
      return;
    }
    fs.copyFileSync(MPD_TMPL, MPD_TMPL + '.labtools.bak');
    fs.writeFileSync(MPD_TMPL, tmpl.slice(0, m.index) + HTTPD_BLOCK + '\n\n' + tmpl.slice(m.index));
    self.logger.info('LabTools: HTTP stream block RESTORED - restart Volumio once to activate');
    self.commandRouter.pushToastMessage('warning', 'Lab Tools',
      'HTTP stream was missing (update?) and has been restored. Restart Volumio once.');
  } catch (e) {
    self.logger.error('LabTools: cannot check mpd template: ' + e);
  }
};

// ---------- Settings page button: this box's own stream address ----------

LabTools.prototype.volumioStream = function () {
  var host = os.hostname();
  var ip = '';
  var nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (name) {
    nets[name].forEach(function (a) {
      if (!ip && a.family === 'IPv4' && !a.internal) ip = a.address;
    });
  });
  this.commandRouter.pushToastMessage('success', 'Volumio Stream',
    'Listen at http://' + host + '.local:8000' + (ip ? '  or  http://' + ip + ':8000' : ''));
  return libQ.resolve();
};
