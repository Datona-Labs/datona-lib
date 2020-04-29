/*
 * Proof of concept 1: Datona Vault server
 *
 */

const datona = require("../../../src/datona");
const RamBasedVaultDataServer = require("./vaultDataManager").RamBasedVaultDataServer;
const http = require('http');


/*
 * Server
 */
 class DatonaVaultServer{

   constructor(portNumber, key, suppressLogs = true){
     module.exports.suppressLogs = suppressLogs;
     log("Data Vault server");
     this.key = key;
     const vaultManager = new RamBasedVaultDataServer();
     this.vaultKeeper = new datona.vault.VaultKeeper(vaultManager, this.key);
     this.server = http.createServer(this.connection.bind(this));
     this.server.listen(portNumber);

     this.server.on('error', (err) => {
       log("fatal server error: " + err);
       throw err;
     });

     log('listening on port ' + portNumber);
   }


   connection(request, response){
     log(request.connection.remoteAddress+'\tconnected');

     var data = "";

     request.on('data', (chunk) => { data += chunk.toString() });

     request.on('end', () => {
       log(request.connection.remoteAddress+"\ttransaction "+data);
       this.vaultKeeper.handleSignedRequest(data)
         .then( function(responseTxn){ sendResponse(request, response, responseTxn); }  )
         .catch( log ); // should never happen
     });

     request.on('close', () => {
       log(request.connection.remoteAddress+'\tdisconnected');
     });

   }

   close(){
     datona.blockchain.close();
     this.server.close(() => { log("Server shutdown"); })
   }

}


function sendResponse(c, r, responseTxn){
  log(c.connection.remoteAddress+"\tresponse "+responseTxn);
  r.writeHead(200);
  r.end(responseTxn);
}

function log( message ){
  if (!module.exports.suppressLogs){
    const now = new Date();
    console.log("DV\t"+now.toISOString() + "\t" + message);
  }
}

module.exports.DatonaVaultServer = DatonaVaultServer;
