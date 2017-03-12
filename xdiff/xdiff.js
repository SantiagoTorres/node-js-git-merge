"use strict";

var fs = require("fs");

module.exports.XDL_MERGE_ZEALOUS = 2;
module.exports.XDL_MERGE_ZEALOUS_ALNUM = 3;
module.exports.Xmparam = function Xmparam(xpp, markerSize, level, favor, style,
    ancestor, file1, file2) {

  this.xpp = xpp;
  this.markerSize = markerSize;
  this.level = level;
  this.favor = favor;
  this.style = style;
  this.file1 = file1;
  this.file2 = file2;
}

module.exports.Mmfile = function Mmfile(filename) {

  if (filename != undefined) {
    this.ptr = fs.readFileSync(filename);
    this.size = this.ptr.length;
  }
}
