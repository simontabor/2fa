# 2FA

[![Dependencies](https://david-dm.org/simontabor/2fa.svg)](https://david-dm.org/simontabor/2fa)
[![Join the chat at https://gitter.im/simontabor/2fa](https://img.shields.io/badge/gitter-join%20chat-blue.svg)](https://gitter.im/simontabor/2fa)

[![NPM](https://nodei.co/npm/2fa.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/2fa)

Module for generating and verifying 2FA codes (specifically TOTP and HOTP).

Also contains utilities for handing 2FA logic, such as generating Google Authenticator compatible QR codes (without going via Google Charts) and generating backup codes.

## Install
```
npm install --save 2fa
```

## Usage

```js
var tfa = require('2fa');

// lets generate a new key for a user
// tfa.generateKey(length (optional), cb)
tfa.generateKey(32, function(err, key) {
  // crypto secure hex key with 32 characters

  // generate crypto-secure backups codes in a user-friendly pattern
  // tfa.generateBackupCodes(num, pattern (optional), cb)
  tfa.generateBackupCodes(8, 'xxxx-xxxx-xxxx', function(err, codes) {
    // [ '7818-b7b8-c928', '3526-dc04-d3f2', 'be3c-5d9f-cb68', ... ]

    // these should be sent to the user, stored and checked when we get a 2fa code
  });

  // generate a google QR code so the user can save their new key
  // tfa.generateGoogleQR(name, accountname, secretkey, cb)
  tfa.generateGoogleQR('Company', 'email@gmail.com', key, function(err, qr) {
    // data URL png image for google authenticator
  });

  var opts = {
    // the number of counters to check before what we're given
    // default: 0
    beforeDrift: 2,
    // and the number to check after
    // default: 0
    afterDrift: 2,
    // if before and after drift aren't specified,
    // before + after drift are set to drift / 2
    // default: 0
    drift: 4,
    // the step for the TOTP counter in seconds
    // default: 30
    step: 30
  };

  // calculate the counter for the HOTP (pretending it's actually TOTP)
  var counter = Math.floor(Date.now() / 1000 / opts.step);

  // generate a valid code (in real-life this will be user-input)
  var code = tfa.generateCode(key, counter);

  // verify it as a HOTP
  var validHOTP = tfa.verifyHOTP(key, code, counter, opts);
  // true

  // for TOTP, the counter is calculated internally using Date.now();
  var validTOTP = tfa.verifyTOTP(key, code, opts);
  // true

});
```
