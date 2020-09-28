var cp = require('child_process');
var child1 = cp.fork('src/child.js');
var child2 = cp.fork('src/child.js');
// Open up the server object and send the handle
var server = require('net').createServer();
server.listen(1337, function () {
 child1.send('server', server);
 child2.send('server', server);
 // 关ۖ
 server.close();
}); 