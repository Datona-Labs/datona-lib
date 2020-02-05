/*
 * Proof of concept 1: Datona Vault server
 *
 */

const datona = require("../../../src/datona");
const RamBasedVaultDataServer = require("./vaultDataManager").RamBasedVaultDataServer;
const net = require('net');


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
       this.vaultKeeper.handleSignedRequest(data)
         .then( function(response){ sendResponse(c,response); }  )
         .catch( log ); // should never happen
     });
   }

   close(){
     datona.blockchain.close();
     this.server.close(() => { log("Server shutdown"); })
   }

}


function sendResponse(c, response){
  log(c.remoteAddress+"\t"+response.message);
  c.write(response);
  c.end();
}

function log( message ){
  if (!module.exports.suppressLogs){
    const now = new Date();
    console.log("DV\t"+now.toISOString() + "\t" + message);
  }
}

module.exports.DatonaVaultServer = DatonaVaultServer;
