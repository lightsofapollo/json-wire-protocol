var SEPERATOR = ':';
var EventEmitter = require('events').EventEmitter;

/**
 * First occurrence of where string occurs in a buffer.
 *
 * NOTE: this is not UTF8 safe generally we expect to find the correct
 * char fairly quickly unless the buffer is incorrectly formatted.
 *
 * @param {Buffer} buffer haystack.
 * @param {String} string needle.
 * @return {Numeric} -1 if not found index otherwise.
 */
function indexInBuffer(buffer, string) {
  if (buffer.length === 0)
    return -1;

  var index = 0;
  var length = buffer.length;

  do {
    if (buffer.toString('utf8', index, index + 1) === SEPERATOR)
      return index;

  } while(
    ++index && index + 1 < length
  );

  return -1;
}

/**
 * converts an object to a string representation suitable for storage on disk.
 * Its very important to note that the length in the string refers to the utf8
 * size of the json content in bytes (as utf8) not the JS string length.
 *
 * @param {Object} object to stringify.
 * @return {String} serialized object.
 */
function stringify(object) {
  var json = JSON.stringify(object);
  var len = Buffer.byteLength(json);

  return len + SEPERATOR + json;
}

/**
 * attempts to parse a given buffer or string.
 *
 * @param {String|Buffer} input in byteLength:{json..} format
 * @return {Objec} JS object.
 */
function parse(input) {
  if (!Buffer.isBuffer(input))
    input = new Buffer(input);

  var stream = new Stream();
  var result;

  stream.once('data', function(data) {
    result = data;
  });

  stream.write(input);

  if (!result) {
    throw new Error(
      'no command available from parsing:' + input.toString()
    );
  }

  return result;
}

function Stream() {
  EventEmitter.call(this);

  this._pendingLength = null;

  // zero length buffer so we can concat later
  this._buffer = new Buffer(0);
}

Stream.prototype = {
  __proto__: EventEmitter.prototype,

  _findLength: function() {
    if (this._pendingLength === null) {
      var idx = indexInBuffer(this._buffer, SEPERATOR);
      if (idx === -1)
        return;

      // mark the length to read out of the rolling buffer.
      this._pendingLength = parseInt(
        this._buffer.toString('utf8', 0, idx),
        10
      );

      this._buffer = this._buffer.slice(idx + 1);
    }
  },

  _readBuffer: function() {
    // if the buffer.length is < then we pendingLength need to buffer
    // more data.
    if (!this._pendingLength || this._buffer.length < this._pendingLength)
      return false;

    // extract remainder and parse json
    var message = this._buffer.slice(0, this._pendingLength);
    this._buffer = this._buffer.slice(this._pendingLength);
    this._pendingLength = null;

    var result;
    try {
      message = message.toString();
      result = JSON.parse(message);
    } catch (e) {
      console.log(this._pendingLength, message, '<<< ERR ONE?');
      this.emit('error', e);
      return false;
    }

    this.emit('data', result);
    return true;
  },

  write: function (buffer) {
    // append new buffer to whatever we have.
    this._buffer = Buffer.concat([this._buffer, buffer]);

    do {
      // attempt to find length of next message.
      this._findLength();
    } while (
      // keep repeating while there are messages
      this._readBuffer()
    );
  }
};

module.exports.parse = parse;
module.exports.stringify = stringify;
module.exports.Stream = Stream;
