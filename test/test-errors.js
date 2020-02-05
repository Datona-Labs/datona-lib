const chai = require('chai');
chai.use(require('chai-as-promised'));
const errors = require("../src/datona").errors;

const expect = chai.expect;

describe("Errors", function() {

  describe("toString function", function() {

    it("includes error name and message", function() {
      expect( new errors.DatonaError("my message").toString() ).to.equal("DatonaError - my message");
      expect( new errors.CommunicationError("My Message").toString() ).to.equal("CommunicationError - My Message");
      expect( new errors.ContractExpiryError("Another message").toString() ).to.equal("ContractExpiryError - Another message");
    });

    it("adds short string-based details", function() {
      expect( new errors.DatonaError("my message", "my details").toString() ).to.equal("DatonaError - my message (my details)");
    });

    it("truncates long string-based details", function() {
      expect( new errors.DatonaError("my message", "my really, really, really, really, really, really, really, really, really, really, really, long details").toString() )
        .to.equal("DatonaError - my message (my really, really, really, really, really, really, really, really, really, really, really, long ...)");
    });

    it("stringifies non-string based details", function() {
      expect( new errors.DatonaError("my message", {details: "my details", otherDetails: "my other details"}).toString() )
        .to.equal("DatonaError - my message ({\"details\":\"my details\",\"otherDetails\":\"my other details\"})");
    });

    it("stringifies and truncates non-string based details", function() {
      expect( new errors.DatonaError("my message", {details: "my really, really, really, really, really, long details", otherDetails: "my other really, really, really, really, really, long details"}).toString() )
        .to.equal("DatonaError - my message ({\"details\":\"my really, really, really, really, really, long details\",\"otherDetails\":\"my other re...)");
    });

    it("converts newlines to semi-colons in details", function() {
      expect( new errors.DatonaError("my message", "my\ndetails\r\nwith\n\rnewlines").toString() ).to.equal("DatonaError - my message (my; details; with; ; newlines)");
    });

  });

});
