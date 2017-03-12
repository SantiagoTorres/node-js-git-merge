"use strict";

var xutils = require("./xutils.js");

function NCha(icount) {
  this.head = null;
  this.tail= null;
  this.isize = 32;
  this.nsize = 32* icount;
  this.ancur = null;
  this.sncur = null;
  this.scurr = 0;
}

function Chanode (next, size) {
  this.next = next;
  this.size = 0;
  this.icurr = 0;
}

var createXrecord = function(cha, prev, ptr, size, ha) {

  if (cha.ancur == null || cha.ancur.icurr == cha.nsize) {
    cha.ancur = new Chanode(null, 0);
    if (cha.tail != null)
      cha.tail.next = cha.ancur;
    if (cha.head == null)
      cha.head = cha.ancur;
    cha.tail = cha.ancur;
  }
  cha.ancur.icurr += cha.isize;
  return new Xrecord(prev, ptr, size, ha)
}

function XdlClassifier(size, flags) {
  
  this.flags = flags;
  this.hbits = xutils.xdl_hashbits(size);
  this.hsize = 1 << this.hbits;
  this.ncha = new NCha(size / 4 + 1);
  this.rchash = new Array(this.hsize); 
  this.rchash.fill(null);
  this.alloc = size;
  this.rcrects = new Uint8Array(this.alloc); // FIXME: this should be an array of xdclass_t; I can make it work with bytes tho...
  this.count = 0;

}

function Xrecord(next, ptr, size, ha) {
  this.next = next;
  this.ptr = ptr;
  this.size = size;
  this.ha = ha;
}


/*
 * Try to reduce the problem complexity, discard records that have no
 * matches on the other file. Also, lines that have multiple matches
 * might be potentially discarded if they happear in a run of discardable.
 */
var xdl_cleanup_records = function(cf, xdf1, xdf2) {
  var i, nm, nreff, mlim;
  var recs;
  var rcrec;
  var dis, dis1, dis2; // wat is dis

  dis = new Uint8Array(xdf1.nrec + xdf2.nrec + 2); 
  dis.fill(0);

  // we turn these into pointers to dis instead
  dis1 = 0;
  dis2 = dis1 + xdf1.nrec + 1;

  if ((mlim = Math.sqrt(xdf1.nrec)) > 1024 /*XDL_MAX_EQLIMIT*/)
    mlim = 1024;// /XDL_MAX_EQLIMIT;


  for (i = xdf1.dstart, recs = xdf1.recs; i <= xdf1.dend; i++) {
    rcrec = cf.rcrecs[recs[i].ha];
    nm = rcrec ? rcrec.len2 : 0;
    dis[dis1 + i] = (nm == 0) ? 0: (nm >= mlim) ? 2: 1;
  }

  if ((mlim = Math.sqrt(xdf2.nrec)) > 1024)
    mlim = 1024; //XDL_MAX_EQLIMIT;

  for (i = xdf2.dstart, recs = xdf2.recs; i <= xdf2.dend; i++) {
    rcrec = cf.rcrecs[recs[i].ha];
    nm = rcrec ? rcrec.len1 : 0;
    dis[dis2 + i] = (nm == 0) ? 0: (nm >= mlim) ? 2: 1;
  }

  for (nreff = 0, i = xdf1.dstart, recs = xdf1.recs; i <= xdf1.dend; i++) {
    if (dis[dis1 + i] == 1 ||
        (dis[dis1 + i] == 2 /*&& FIXME: do we care ?!xdl_clean_mmatch(dis1, i, xdf1.dstart, xdf1.dend)*/)) {
      xdf1.rindex[nreff] = i;
      xdf1.ha[nreff] = recs[i].ha;
      nreff++;
    } else
      xdf1.rchg[i] = 1;
  }

  xdf1.nreff = nreff;

  for (nreff = 0, i = xdf2.dstart, recs = xdf2.recs; i <= xdf2.dend; i++){
    if (dis[dis2 + i] == 1 ||
        (dis[dis2 + i] == 2 /*&& !xdl_clean_mmatch(dis2, i, xdf2.dstart, xdf2.dend)*/)) {
      xdf2.rindex[nreff] = i;
      xdf2.ha[nreff] = recs[i].ha;
      nreff++;
    } else
      xdf2.rchg[i] = 1;
  }
  xdf2.nreff = nreff;

  return 0;
}


/*
 * Early trim initial and terminal matching records.
 */
var xdl_trim_ends = function(xdf1, xdf2) {
  var i, lim;
  var recs1, recs2;

  recs1 = xdf1.recs;
  recs2 = xdf2.recs;
  for (i = 0, lim = Math.min(xdf1.nrec, xdf2.nrec); i < lim;
       i++) {
    if (recs1[i].ha != recs2[i].ha)
      break;
  }

  xdf1.dstart = xdf2.dstart = i;

  recs1 = xdf1.nrec - 1;
  recs2 = xdf2.nrec - 1;
  for (lim -= i, i = 0; i < lim; i++, recs1--, recs2--)
    if (xdf1.recs[recs1].ha != xdf2.recs[recs2].ha)
      break;

  xdf1.dend = xdf1.nrec - i - 1;
  xdf2.dend = xdf2.nrec - i - 1;

  return 0;
}


var xdl_optimize_ctxs = function (cf, xdf1, xdf2) {

  if (xdl_trim_ends(xdf1, xdf2) < 0 ||
      xdl_cleanup_records(cf, xdf1, xdf2) < 0) {

    return -1;
  }

  return 0;
}

var xdl_prepare_ctx = function(pass, mf, narec, xpp, cf, xdf) {
  
  var hbits;
  var nrec, hsize, bsize;
  var blk, cur, _top, prev;
  var crec, recs, rrecs;
  var rhash;
  var ha;
  var rchg;
  var rindex;

  xdf.rcha = new NCha(Math.floor(narec / 4) + 1);
  recs = []; 
  hbits = xutils.xdl_hashbits(narec);
  hsize = 1 << hbits;
  rhash = [];

  nrec = 0; 

  bsize = mf.size;
  _top = bsize;
  if ((cur = blk = mf.ptr) != null) {
    for (var i = 0; i < _top; i++) {
      prev = i;
      var res = xutils.xdl_hash_record(i, mf.ptr, _top, xpp.flags);
      var hav = res[0];
      i = res[1];

      crec = new createXrecord(xdf.rcha, null,  mf.ptr.slice(prev, i + 1), 
          i - prev, hav);

      recs.push(crec);
      nrec++;
      xdl_classify_record(pass, cf, rhash, hbits, crec);
    }
  }

  rchg = new Uint8Array(nrec + 2);
  rindex = new Uint32Array(nrec + 1); // FIXME I'm taking these values from
                                      // MDN, but we should be storing these
                                      // references
  ha = new Uint32Array(nrec + 1);

  xdf.nrec = nrec;
  xdf.recs = recs;
  xdf.hbits = hbits;
  xdf.rhash = rhash;
  xdf.rchg = rchg;
  xdf.rindex = rindex;
  xdf.nreff = 0;
  xdf.ha = ha;
  xdf.dend = nrec - 1;

  return 0;

}

module.exports.xdl_prepare_env = function(mf1, mf2, xpp, xe) {
  var enl1, enl2, sample;

  var cf;

  /*
   * For histogram diff, we can afford a smaller sample size and
   * thus a poorer estimate of the number of lines, as the hash
   * table (rhash) won't be filled up/grown. The number of lines
   * (nrecs) will be updated correctly anyway by
   * xdl_prepare_ctx().
   */
  sample  = 30 /* TODO: XDL_GUESS_NLINES1 */

  enl1 = xutils.xdl_guess_lines(mf1, sample) + 1; 
  enl2 = xutils.xdl_guess_lines(mf2, sample) + 1; 

  xe.xdf1 = {}
  xe.xdf2 = {}

  cf = new XdlClassifier(enl1 + enl2 + 1, xpp.flags);
  cf.rcrecs = {};

  if (xdl_prepare_ctx(1, mf1, enl1, xpp, cf, xe.xdf1) < 0)
    return -1;

  if (xdl_prepare_ctx(2, mf2, enl2, xpp, cf, xe.xdf2) < 0)
    return -1;

  if (xdl_optimize_ctxs(cf, xe.xdf1, xe.xdf2) < 0) 
    return -1;

  return 0;  
}



var xdl_hashlong = function(v, b) { // this used to be a macro, I"m keeping this for cleanliness
  return (v + (v >> b)) & ((1 << b) - 1);
}

var xdl_classify_record = function(pass, cf, rhash, hbits, rec) {

  var hi;
  var line;
  var rcrec;
  var rcrecs;

  line = rec.ptr;
  hi = xdl_hashlong(rec.ha, cf.hbits); 
  // this searches over the records to find a target line
  for (rcrec = cf.rchash[hi]; rcrec != null; rcrec = rcrec.next)
    if (rcrec.ha == rec.ha && xutils.xdl_recmatch(line, rec)) 
      /* xdl_recmatch(rcrec.line, rcrec.size, <- fancy whitespace function
          rec.ptr, rec.size, cf.flags)*/
      break;

  if (rcrec == null) {
    rcrec = createXrecord(cf.ncha);

    rcrec.idx = cf.count++;
    if (cf.count > cf.alloc) {
      cf.alloc *= 2;
      
      // FIXME should realloc  or maybe not. We can push in this array struct.
      // if (!(rcrecs = (xdlclass_t **) xdl_realloc(cf.rcrecs, cf.alloc * sizeof(xdlclass_t *))))
      //cf.rcrecs = rcrecs;
      // TODO: remind myself to simplify the structs later. We don't need all of this alloc clutter
    }
    cf.rcrecs[rcrec.idx] = rcrec;
    rcrec.line = line;
    rcrec.size = rec.size;
    rcrec.ha = rec.ha;
    rcrec.len1 = rcrec.len2 = 0;
    rcrec.next = cf.rchash[hi];
    cf.rchash[hi] = rcrec;
  }

  (pass == 1) ? rcrec.len1++ : rcrec.len2++;

  rec.ha = rcrec.idx;

  hi = xdl_hashlong(rec.ha, cf.hbits); 
  rec.next = rhash[hi] != undefined ? rhash[hi] : null;
  rhash[hi] = rec;

  return 0;
}

module.exports.xdl_recmatch = xutils.xdl_recmatch;
