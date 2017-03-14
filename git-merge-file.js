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
    action: 'storeConst',
    constant: true,
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

parser.addArgument(
  'file1',
  {
    help: 'file1'
  }
);
parser.addArgument(
  'ancestor',
  {
    help: 'ancestor file'
  }
);
parser.addArgument(
  'file2',
  {
    help: 'file2'
  }
);


var args = parser.parseArgs();

var result = {};
var xmp = new xmerge.Xmparam();
var ret = 0, i = 0, to_stdout = 0;
var quiet = 0;

xmp.level = xmerge.XDL_MERGE_ZEALOUS_ALNUM;
xmp.style = 0;
xmp.favor = 0;
xmp.xpp = 0;

/* NOTE: we do not read repository config files 
 * NOTE: We also do not set a prefix to the filenames
 */

xmp.ancestor = args.ancestor;
xmp.file1 = args.file1;
xmp.file2 = args.file2;

var res = xmerge.xdl_merge(new xmerge.Mmfile(args.ancestor), 
    new xmerge.Mmfile(args.file1), new xmerge.Mmfile (args.file2), xmp,
    result);

var filename = args.ancestor

if (args.stdout)
  process.stdout.write(res);
else
  console.log("writing to a file is not implemented yet (although it should be rather trivial :))");
