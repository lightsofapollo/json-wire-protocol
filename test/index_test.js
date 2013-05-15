var wire = require('../index');
var assert = require('assert');

suite('json wire protocol', function() {
  var subject;
  var TWO_BYTE = 'ž';

  suite('#stringify', function() {
    test('ASCII only', function() {
      var input = { a: 'abcdefg' };
      var expected = JSON.stringify(input);

      expected = expected.length + ':' + expected;
      assert.deepEqual(wire.stringify(input), expected);
    });

    test('invalid strings', function() {
      var invalid = 'xfoobar!';

      assert.throws(function() {
        wire.parse(invalid);
      });
    });

    test('with multibyte chars', function() {
      var input = { a: TWO_BYTE + TWO_BYTE + TWO_BYTE };
      var expected = JSON.stringify(input);

      expected = '14:' + expected;
      assert.deepEqual(wire.stringify(input), expected);
    });
  });

  suite('#parse', function() {
    test('working string', function() {
      var input = { woot: TWO_BYTE };
      var string = wire.stringify(input);
      assert.deepEqual(
        input,
        wire.parse(string)
      );
    });
  });

  suite('.Stream', function() {
    setup(function() {
      subject = new wire.Stream();
    });

    suite('#write', function() {

      suite('multiple commands over two buffers', function() {
        var commandA = { a: 'cool' };
        var commandB = { b: 'woot' };
        var commandC = { c: 'wtfman' };
        var commandD = { d: TWO_BYTE };

        var all = [commandA, commandB, commandC].map(wire.stringify).join('');
        var half = all.length / 2;

        var bufferA = new Buffer(all.slice(0, half));
        var bufferB = new Buffer(all.slice(half) + wire.stringify(commandD));

        var parsed;

        setup(function() {
          parsed = [];

          subject.on('data', function(result) {
            parsed.push(result);
          });

          subject.write(bufferA);
          subject.write(bufferB);
        });

        test('result after writing to stream', function() {
          assert.deepEqual(
            parsed,
            [commandA, commandB, commandC, commandD]
          );
        });
      });

      test('multiple chunks until length', function(done) {
        var expected = { longer: TWO_BYTE + 'a' + TWO_BYTE };
        var string = wire.stringify(expected);

        subject.on('data', function(result) {
          assert.deepEqual(result, expected);
          done();
        });

        for (var i = 0; i < string.length; i++) {
          subject.write(new Buffer(string[i]));
        }
      });

      suite('entire buffer', function() {
        var buffer;
        /* 13 ascii bytes */
        var string = '{"one":"foo"}';
        var raw;

        setup(function() {
          buffer = new Buffer('13:' + string);
        });

        test('read entire buffer', function(done) {
          var expected = { one: 'foo' };
          subject.once('data', function(data) {
            assert.deepEqual(data, expected);
            done();
          });

          subject.write(buffer);
        });
      });
    });
  });

});
