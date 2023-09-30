require('dotenv').config({path: '.test.env'});
const child_process = require('child_process');
const os = require('os');
const fs = require('fs');

let args = [];
try {
  args = JSON.parse(process.env.npm_argv);
  args = args.slice(3);
} catch (e) {
  args = [];
}

describe('Test Suite', function() {

  let testFilenames = fs.readdirSync('./test/tests');
  testFilenames.forEach(filename => require(`./tests/${filename}`)());

});
