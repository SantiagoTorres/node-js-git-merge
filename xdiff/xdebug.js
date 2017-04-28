/* 
 * <name>
 *   xdebug 
 * <description>
 *   This module is for debugging purposes only.  In order to check everything
 *   was working properly, I had to dump datastructures into the disk at
 *   certain moments
 *
 * <author>
 *   Santiago Torres-Arias
 *
 * <date>
 *   Sometime in april, I don't remmebmer
 */
var fs = require("fs");

/* 
 * This function will write a file with the target filename for debugging
 * purposes. I kept it in here for the sake of cleanliness...
 */
module.exports.serializekvd = function(kvd, filename) {
    this.ptr = fs.writeFileSync(filename, kvd);
}
