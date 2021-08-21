// var crypto = require("crypto");
// var base32 = require("thirty-two");
// var QR = require("qr-image");

// var TFA = (module.exports = {});

// /**
//  * @description
//  * Generates the key which can be used to make a QR code for the user to add to their authenticator apps and check codes against.
//  * @param length The length desired for the key.
//  * @param cb A callback function you wish to pass the results of the function to.
//  * @example
//  * tfa.generateKey(32, function(err, key) {
//  * //Store key and generate a QR code so users can add it to their authenticator app.
//  * })
//  */
// TFA.generateKey = function(length, cb) {
//   if (!cb && typeof length === "function") {
//     cb = length;
//     length = 20;
//   }

//   var key = "";
//   var get = function() {
//     // 7 bytes (14 char) is the max JS can handle with precision
//     // using 6 to be on the safe side eh (nobody trusts JS numbers)
//     crypto.randomBytes(6, function(err, bytes) {
//       if (err) return cb(err);
//       key += parseInt(bytes.toString("hex"), 16).toString(36);
//       if (key.length < length) return get();
//       cb(err, key.slice(0, length));
//     });
//   };
//   get();
// };

// /**
//  * @description
//  * Verify a users HOTP code they entered against the given key
//  * @param key  The key to check the HOTP code against
//  * @param code The code entered by the user from the authenticator app.
//  * @param counter The time for verifying the code against the key.
//  * @param opts An optional parameter for specifying drift options.
//  * @returns Either true or false depending on if the code is valid or not.
//  * @example
//  * var counter = Math.floor(Date.now() / 1000 / 30);
//  * var validCode = tfa.verifyHOTP(key, code, counter);
//  * if (validCode == true) {
//  * //Log user in
//  * } else {
//  * //Display error message
//  * }
//  */
// TFA.verifyHOTP = function(key, code, counter, opts) {
//   opts = opts || {};

//   var drift = (opts.drift || 0) / 2;

//   // allow drift X counters before
//   var before = opts.beforeDrift || drift;

//   // allow drift X counters after
//   var after = opts.afterDrift || drift;

//   for (var i = counter - before; i <= counter + after; i++) {
//     if (TFA.generateCode(key, i, opts) === code) return true;
//   }

//   return false;
// };

// /**
//  * @description
//  * Verify a users TOTP code they entered against the given key
//  * @param key  The key to check the TOTP code against
//  * @param code The code entered by the user from the authenticator app.
//  * @returns Either true or false depending on if the code is valid or not.
//  * @example
//  * var validCode = tfa.verifyTOTP(key, code);
//  * if (validCode == true) {
//  * //Log user in
//  * } else {
//  * //Display error message
//  * }
//  */
// TFA.verifyTOTP = function(key, code, opts) {
//   opts = opts || {};

//   var step = opts.step || 30;

//   var counter = Math.floor(Date.now() / 1000 / step);

//   return TFA.verifyHOTP(key, code, counter, opts);
// };

// TFA.generateCode = function(key, counter, opts) {
//   opts = opts || {};
//   var length = opts.length || 6;

//   var hmac = crypto.createHmac("sha1", key);

//   // get the counter as bytes
//   var counterBytes = new Array(8);
//   for (var i = counterBytes.length - 1; i >= 0; i--) {
//     counterBytes[i] = counter & 0xff;
//     counter = counter >> 8;
//   }

//   var token = hmac.update(new Buffer(counterBytes)).digest("hex");

//   // get the token as bytes
//   var tokenBytes = [];
//   for (var i = 0; i < token.length; i += 2) {
//     tokenBytes.push(parseInt(token.substr(i, 2), 16));
//   }

//   // truncate to 4 bytes
//   var offset = tokenBytes[19] & 0xf;
//   var ourCode =
//     ((tokenBytes[offset++] & 0x7f) << 24) |
//     ((tokenBytes[offset++] & 0xff) << 16) |
//     ((tokenBytes[offset++] & 0xff) << 8) |
//     (tokenBytes[offset++] & 0xff);

//   // we want strings!
//   ourCode += "";

//   // truncate to correct length
//   ourCode = ourCode.substr(ourCode.length - length);

//   // 0 pad
//   while (ourCode.length < length) ourCode = "0" + ourCode;

//   return ourCode;
// };

// /**
//  * @description
//  * Converts a key to a format which can be pasted into an authenticator app.
//  * @param key  The key to convert
//  * @returns The authenticater-friendly code.
//  * @example
//  * var multikey = tfa.base32Encode(key);
//  * console.log('You can manually enter this code into the authenticator app: ' + multikey)
//  */
// TFA.base32Encode = function(key) {
//   return base32
//     .encode(key)
//     .toString()
//     .replace(/=/g, "");
// };

// TFA.generateUrl = function(name, account, key) {
//   return (
//     "otpauth://totp/" +
//     encodeURIComponent(account) +
//     "?issuer=" +
//     encodeURIComponent(name) +
//     "&secret=" +
//     TFA.base32Encode(key)
//   );
// };

// /**
//  * @description
//  * Generates a QR code that can be scanned to add the account to an authenciator app.
//  * @param name The name to be listed on the authenticator app- usually the company or product name.
//  * @param account The account to be listed on the authenticator app- Usually the users email.
//  * @param key The key generated for the users multifactor.
//  * @param opts An optional parameter for specifying drift options.
//  * @returns A base64 string with the image.
//  * @example
//  * tfa.generateGoogleQR('Company', 'john.doe@example.com', key, function(err, qr) {
//  * //Render a page with the QR code for the user to scan.
//  * })
//  */
// TFA.generateGoogleQR = function(name, account, key, opts, cb) {
//   if (!cb && typeof opts === "function") {
//     cb = opts;
//     opts = {};
//   }

//   var data = TFA.generateUrl(name, account, key);

//   var formatter = function(buf) {
//     switch (opts.encoding) {
//       case "buffer":
//         return buf;
//       case "base64":
//         return buf.toString("base64");
//       case "data":
//       default:
//         return "data:image/png;base64," + buf.toString("base64");
//     }
//   };

//   var qrOpts = { type: "png" };
//   for (var i in opts) qrOpts[i] = opts[i];

//   var pngStream = QR.image(data, qrOpts);

//   var pngData = [];
//   pngStream.on("data", function(d) {
//     pngData.push(d);
//   });
//   pngStream.on("end", function() {
//     var png = Buffer.concat(pngData);
//     cb(null, formatter(png));
//   });
// };

// /**
//  * @description
//  * Generates codes which can be checked against and used if the authenticator app is not available.
//  * @param count The number of backup keys you want to generate
//  * @param pattern An optional parameter for the pattern you want the codes to be generated in
//  * @param cb A callback function you wish to pass the results of the function to.
//  * @example
//  * tfa.generateBackupCodes(6, 'xxxx-xxxx-xxxx', function(err, codes) {
//  * //Show and store the backup keys to the user.
//  * })
//  */
// TFA.generateBackupCodes = function(count, pattern, cb) {
//   if (!cb && typeof pattern === "function") {
//     cb = pattern;
//     pattern = "xxxx-xxxx-xxxx";
//   }

//   var codes = [];
//   for (var c = 0; c < count; c++) {
//     TFA.generateBackupCode(pattern, function(err, code) {
//       if (err) {
//         cb(err);
//         cb = function() {};
//         return;
//       }

//       codes.push(code);
//       if (codes.length === count) cb(err, codes);
//     });
//   }
// };

// TFA.generateBackupCode = function(pattern, cb) {
//   if (!cb && typeof pattern === "function") {
//     cb = pattern;
//     pattern = "xxxx-xxxx-xxxx";
//   }

//   // how many crypto bytes do we need?
//   var patternLength = Math.ceil(pattern.split("x").length - 1 / 2);

//   crypto.randomBytes(patternLength, function(err, buf) {
//     if (err) return cb(err);
//     var chars = buf.toString("hex");
//     var code = "";

//     // number of crypto characters that we've used
//     var xs = 0;
//     for (var i = 0; i < pattern.length; i++) {
//       code += pattern[i] === "x" ? chars[xs++] : pattern[i];
//     }
//     cb(err, code);
//   });
// };
