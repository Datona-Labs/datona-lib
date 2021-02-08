const CHUNK_SIZE = 1024*1024;

class FileReadStream {

  constructor(file) {
    this.file = file;
    this.fileReader = new FileReader();
    this.fileReader.closeCallback = function(){};
    this.fileReader.offset = 0;
  }

  on(eventName, callback) {

    const file = this.file;
    const fileReader = this.fileReader;

    switch (eventName) {
      case 'data':
        fileReader.onload = function(e) {
          callback(e.target.result);
          if (fileReader.offset >= file.size) fileReader.closeCallback();
          else readNextChunk();
        };
        break;
      case 'error':
        this.fileReader.onerror = callback;
        break;
      case 'close':
        fileReader.closeCallback = callback;
        readNextChunk();
        break;
      default: throw new errors.DeveloperError("FileReaderStream: Invalid event name '"+eventName+"'");
    }

    function readNextChunk() {
      const endOffset = fileReader.offset + CHUNK_SIZE;
      const slice = file.slice(fileReader.offset, endOffset);
      fileReader.offset = endOffset;
      fileReader.readAsArrayBuffer(slice);
    }

  }

}

window.FS = {
  createReadStream: function(file){ return new FileReadStream(file) }
};

