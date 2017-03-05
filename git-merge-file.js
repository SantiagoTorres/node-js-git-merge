#!/usr/bin/env node
'use strict';
 
var ArgumentParser = require('argparse').ArgumentParser;
var xmerge = require ("./xdiff/xmerge.js")
var parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'A node clone of the git-merge-file utility'
});

parser.addArgument(
  [ '-p', '--stdout' ],
  {
    help: 'print everythng to stdout'
  }
);
parser.addArgument(
  '-diff3' ,
  {
    help: 'Use the diff3 based merge "MISSING IMPL"'
  }
);
parser.addArgument(
  '--ours',
  {
    help: 'for conflicts, use our version'
  }
);
parser.addArgument(
  '--theirs',
  {
    help: 'for conflicts, use their version'
  }
);
parser.addArgument(
  '--union',
  {
    help: 'for conflicts, use the union version'
  }
);
parser.addArgument(
  '--marker-size',
  {
    help: 'for conficts, use this marker size'
  }
);
parser.addArgument(
  ['-q', '--quiet'],
  {
    help: 'do not warn about conflicts'
  }
);
parser.addArgument(
  '-L',
  {
    help: 'Add labels for file1/file2/file3'
  }
);
  
var args = parser.parseArgs();
console.dir(args);
