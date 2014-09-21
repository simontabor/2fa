var crypto = require('crypto');
var base32 = require('thirty-two');
var QRCode = require('qrcode');
var async = require('async');

var TFA = module.exports = function(opts) {
  var self = this;

  // unused at the moment
  self.opts = opts;
};

// basically a crypto.randomBytes helper
TFA.prototype.generateKey = function(length, cb) {
  var self = this;

  if (!cb && typeof length === 'function') {
    cb = opts;
    length = 32;
  }

  crypto.randomBytes(length / 2, function(err, buf) {
    if (err) return cb(err);

    cb(err, buf.toString('hex'));
  });
};

TFA.prototype.verifyHOTP = function(key, code, counter, opts) {
  var self = this;
  opts = opts || {};

  var drift = (opts.drift || 0) / 2;

  // allow drift X counters before
  var before = opts.beforeDrift || drift;

  // allow drift X counters after
  var after = opts.afterDrift || drift;

  for (var i = counter - before; i <= counter + after; i++) {
    if (self.generateCode(key, i, opts) === code) return true;
  }

  return false;
};

TFA.prototype.verifyTOTP = function(key, code, opts) {
  var self = this;
  opts = opts || {};

  var step = opts.step || 30;

  var counter = Math.floor(Date.now() / 1000 / step);

  return self.verifyHOTP(key, code, counter, opts);
};

TFA.prototype.generateCode = function(key, counter, opts) {
  var self = this;
  opts = opts || {};
  var length = opts.length || 6;

  var hmac = crypto.createHmac('sha1', key);

  // get the counter as bytes
  var counterBytes = new Array(8);
  for (var i = counterBytes.length - 1; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = counter >> 8;
  }

  var token = hmac.update(new Buffer(counterBytes)).digest('hex');

  // get the token as bytes
  var tokenBytes = [];
  for (var i = 0; i < token.length; i += 2) {
    tokenBytes.push(parseInt(token.substr(i, 2), 16));
  }

  // truncate to 4 bytes
  var offset = tokenBytes[19] & 0xf;
  var ourCode =
    (tokenBytes[offset++] & 0x7f) << 24 |
    (tokenBytes[offset++] & 0xff) << 16 |
    (tokenBytes[offset++] & 0xff) << 8  |
    (tokenBytes[offset++] & 0xff);

  // we want strings!
  ourCode += '';

  return ourCode.substr(ourCode.length - length);
};


TFA.prototype.generateGoogleQR = function(name, account, key, opts, cb) {
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  var data = 'otpauth://totp/' + encodeURIComponent(account);
  data += '?issuer=' + encodeURIComponent(name);
  data += '&secret=' + base32.encode(key).toString().replace(/=/g, '');
  QRCode.toDataURL(data, opts, cb);
};

TFA.prototype.generateBackupCodes = function(count, pattern, cb) {
  if (!cb && typeof pattern === 'function') {
    cb = pattern;
    pattern = 'xxxx-xxxx-xxxx';
  }

  // how many crypto bytes do we need?
  var patternLength = Math.ceil((pattern.split('x').length) - 1 / 2);

  async.times(count, function(t, done) {
    crypto.randomBytes(patternLength, function(err, buf) {
      if (err) return done(err);
      var chars = buf.toString('hex');
      var code = '';

      // number of crypto characters that we've used
      var xs = 0;
      for (var i = 0; i < pattern.length; i++) {
        code += pattern[i] === 'x' ? chars[xs++] : pattern[i];
      }
      done(err, code);
    });
  }, cb);
};
