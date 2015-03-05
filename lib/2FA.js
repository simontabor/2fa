var crypto = require('crypto');
var base32 = require('thirty-two');
var QR = require('qr-image');

var TFA = module.exports = {};

// get a base36 crypto secure key
TFA.generateKey = function(length, cb) {
  if (!cb && typeof length === 'function') {
    cb = opts;
    length = 20;
  }

  var key = '';
  var get = function() {
    // 7 bytes (14 char) is the max JS can handle with precision
    // using 6 to be on the safe side eh (nobody trusts JS numbers)
    crypto.randomBytes(6, function(err, bytes) {
      if (err) return cb(err);
      key += parseInt(bytes.toString('hex'), 16).toString(36);
      if (key.length < length) return get();
      cb(err, key.slice(0, length));
    });
  };
  get();
};

TFA.verifyHOTP = function(key, code, counter, opts) {
  opts = opts || {};

  var drift = (opts.drift || 0) / 2;

  // allow drift X counters before
  var before = opts.beforeDrift || drift;

  // allow drift X counters after
  var after = opts.afterDrift || drift;

  for (var i = counter - before; i <= counter + after; i++) {
    if (TFA.generateCode(key, i, opts) === code) return true;
  }

  return false;
};

TFA.verifyTOTP = function(key, code, opts) {
  opts = opts || {};

  var step = opts.step || 30;

  var counter = Math.floor(Date.now() / 1000 / step);

  return TFA.verifyHOTP(key, code, counter, opts);
};

TFA.generateCode = function(key, counter, opts) {
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


TFA.generateGoogleQR = function(name, account, key, opts, cb) {
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  var data = 'otpauth://totp/' + encodeURIComponent(account)
              + '?issuer=' + encodeURIComponent(name)
              + '&secret=' + base32.encode(key).toString().replace(/=/g, '');


  var formatter = function(buf) {
    switch(opts.encoding) {
      case 'buffer':
        return buf;
      case 'base64':
        return buf.toString('base64');
      case 'data': default:
        return 'data:image/png;base64,' + buf.toString('base64')
    }
  };

  var qrOpts = { type: 'png' };
  for (var i in opts) qrOpts[i] = opts[i];

  var pngStream = QR.image(data, qrOpts);

  var pngData = [];
  pngStream.on('data', function(d) { pngData.push(d); });
  pngStream.on('end', function() {
    var png = Buffer.concat(pngData);
    cb(null, formatter(png));
  });
};

TFA.generateBackupCodes = function(count, pattern, cb) {
  if (!cb && typeof pattern === 'function') {
    cb = pattern;
    pattern = 'xxxx-xxxx-xxxx';
  }

  var codes = [];
  for (var c = 0; c < count; c++) {
    TFA.generateBackupCode(pattern, function(err, code) {
      if (err) {
        cb(err);
        cb = function(){};
        return;
      }

      codes.push(code);
      if (codes.length === count) cb(err, codes);
    });
  }
};

TFA.generateBackupCode = function(pattern, cb) {
  if (!cb && typeof pattern === 'function') {
    cb = pattern;
    pattern = 'xxxx-xxxx-xxxx';
  }

  // how many crypto bytes do we need?
  var patternLength = Math.ceil((pattern.split('x').length) - 1 / 2);

  crypto.randomBytes(patternLength, function(err, buf) {
    if (err) return cb(err);
    var chars = buf.toString('hex');
    var code = '';

    // number of crypto characters that we've used
    var xs = 0;
    for (var i = 0; i < pattern.length; i++) {
      code += pattern[i] === 'x' ? chars[xs++] : pattern[i];
    }
    cb(err, code);
  });
}
