// This is how it works:
//   You put the may down, and then you jump to conclusions
if (new RegExp('v(\\d)\.(\\d)\.(\\d)').exec(process.version)[2]<4) require(__dirname + "/setup").ext('node_modules');
require('coffee-script')
module.exports = require('./lib/object-sync')
module.exports.Filter = require('./lib/filter')
module.exports._ = require('./lib/underscore')