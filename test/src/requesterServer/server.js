/*
 * Proof of concept 1: Datona Vault server
 *
 */

const datona = require("../../../src/datona");
const net = require('net');

/*
 * Server
 */
 class RequesterServer{

   constructor(portNumber, key, suppressLogs = true){
     module.exports.suppressLogs = suppressLogs;
     log("Requester server");
     this.key = key;

     this.server = net.createServer(this.connection.bind(this));

     this.server.on('error', (err) => {
       log("fatal server error: " + err)
       throw err;
     });

     this.server.listen(portNumber, () => {
       log('listening on port ' + portNumber);
     });
   }


   connection(c){
     log(c.remoteAddress+'\tconnected');

     c.on('end', () => {
       log(c.remoteAddress+'\tdisconnected');
     });

     c.on('data', (buffer) => {
       const data = buffer.toString();
       log(c.remoteAddress+"\ttransaction "+data);
       try{
         this.sdaResponse = datona.comms.decodeTransaction(data).txn;
         const signedTxn = datona.comms.encodeTransaction(datona.comms.createSuccessResponse(), this.key);
         sendResponse(c, signedTxn);
       }
       catch(error){
         const signedTxn = datona.comms.encodeTransaction(datona.comms.createErrorResponse(error), this.key);
         sendResponse(c, signedTxn);
       }
     });
   }

   close(){
     this.server.close(() => { log("Server shutdown"); })
   }


 }


function sendResponse(c, response){
  log(c.remoteAddress+"\tresponse "+response);
  c.write(response);
  c.end();
}

function log( message ){
  if (!module.exports.suppressLogs) {
    const now = new Date();
    console.log("RQ\t"+now.toISOString() + "\t" + message);
  }
}

module.exports.RequesterServer = RequesterServer;
module.exports.suppressLogs = false;
