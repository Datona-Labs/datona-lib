"use strict";

/*
 * Datona-lib Error types
 *
 * Copyright (C) 2020 Datona Labs
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 */


/*
 * Root class for all errors thrown by Datona software.  All datona errors
 * are derived from this class and have the same constructor parameters.
 */
class DatonaError extends Error {

  constructor(message, details) {
    super(message);
    this.name = "DatonaError";
    this.details = details;
  }

  /*
   * Converts this error into a JSON formatted string, excluding the stacktrace
   */
  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /*
   * Converts this error into a simple struct with just name, message and details, excluding the stacktrace
   */
  toObject() {
    return {
      name: this.name,
      message: this.message,
      details: this.details
    };
  }

  /*
   * Converts this error into a single line string suitable for logging,
   * excluding the stacktrace.  If the error details is not a string then it
   * will be converted to JSON.  If the error details is longer than 96 chars
   * then it will be truncated.
   */
  toString() {
    var str = this.name + " - " + this.message;
    if (this.details != undefined) {
      var details = (typeof this.details == "string") ? this.details.replace(/(?:\r\n|\r|\n)/g, '; ') : JSON.stringify(this.details);
      if (details.length > 96) details = details.slice(0,96) + "...";
      return str + " ("+details+")";
    }
    else return str;
  }

}
module.exports.DatonaError = DatonaError;


/*
 * Converts the given object into a DatonaError of the appropriate type.
 * Inverse of DatonaError.toObject()
 */
function fromObject(error) {
  if (error == undefined) throw new DatonaError("error is missing");
  if (toString.call(error) != '[object Object]') throw new DatonaError("error is invalid type: expecting object.");
  if (error.name == undefined || error.name == "") throw new DatonaError("name missing from error");
  const type = module.exports[error.name];
  if (type == undefined || ! type instanceof DatonaError) throw new DatonaError("error has invalid name");
  return new type(error.message, error.details);
}
module.exports.fromObject = fromObject;


/*
 * Class of exception for defensive programming checks.  These errors are not expected
 * to be raised and indicate a low-level software problem that needs raising with
 * the software developer.
 */
class InternalError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "InternalError";
  }
}
module.exports.InternalError = InternalError;


/*
 * Class of exception for software usage errors.  These errors indicate a
 * problem with how the developer is interfacing with this software.
 */
class DeveloperError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "DeveloperError";
  }
}
module.exports.DeveloperError = DeveloperError;


/*
 * The caller of this method passed an invalid or missing argument
 */
class ArgumentError extends DeveloperError {
  constructor(message, details) {
    super(message, details);
    this.name = "ArgumentError";
  }
}
module.exports.ArgumentError = ArgumentError;


/*
 * The caller of this method passed an argument with an invalid type
 */
class TypeError extends DeveloperError {
  constructor(message, details) {
    super(message, details);
    this.name = "TypeError";
  }
}
module.exports.TypeError = TypeError;


/*
 * The caller of this method passed an invalid hash
 */
class InvalidHashError extends DeveloperError {
  constructor(message, details) {
    super(message, details);
    this.name = "InvalidHashError";
  }
}
module.exports.InvalidHashError = InvalidHashError;


/*
 * Class of cryptographic errors
 */
class CryptographicError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "CryptographicError";
  }
}
module.exports.CryptographicError = CryptographicError;


/*
 * The caller of this method passed an invalid hash
 */
class InvalidSignatureError extends CryptographicError {
  constructor(message, details) {
    super(message, details);
    this.name = "InvalidSignatureError";
  }
}
module.exports.InvalidSignatureError = InvalidSignatureError;


/*
 * The data could not be hashed
 */
class HashingError extends CryptographicError {
  constructor(message, details) {
    super(message, details);
    this.name = "HashingError";
  }
}
module.exports.HashingError = HashingError;


/*
 * Class of errors related to blockchain access and contract management
 */
class BlockchainError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "BlockchainError";
  }
}
module.exports.BlockchainError = BlockchainError;


/*
 * This request must be made by the contract owner
 */
class ContractOwnerError extends BlockchainError {
  constructor(message, details) {
    super(message, details);
    this.name = "ContractOwnerError";
  }
}
module.exports.ContractOwnerError = ContractOwnerError;


/*
 * Indicates the contract class is invalid
 */
class ContractTypeError extends BlockchainError {
  constructor(message, details) {
    super(message, details);
    this.name = "ContractTypeError";
  }
}
module.exports.ContractTypeError = ContractTypeError;


/*
 * This request must be made by the contract owner
 */
class ContractExpiryError extends BlockchainError {
  constructor(message, details) {
    super(message, details);
    this.name = "ContractExpiryError";
  }
}
module.exports.ContractExpiryError = ContractExpiryError;


/*
 * Indicates the signatory does not have permission to perform this action
 */
class PermissionError extends BlockchainError {
  constructor(message, details) {
    super(message, details);
    this.name = "PermissionError";
  }
}
module.exports.PermissionError = PermissionError;


/*
 * Class of errors related to a communications transaction
 */
class TransactionError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "TransactionError";
  }
}
module.exports.TransactionError = TransactionError;


/*
 * Indicates the transaction type is invalid
 */
class InvalidTransactionError extends TransactionError {
  constructor(message, details) {
    super(message, details);
    this.name = "InvalidTransactionError";
  }
}
module.exports.InvalidTransactionError = InvalidTransactionError;


/*
 * Indicates the transaction has an invalid form
 */
class MalformedTransactionError extends TransactionError {
  constructor(message, details) {
    super(message, details);
    this.name = "MalformedTransactionError";
  }
}
module.exports.MalformedTransactionError = MalformedTransactionError;


/*
 * Class of errors related to a communications transaction
 */
class CommunicationError extends TransactionError {
  constructor(message, details) {
    super(message, details);
    this.name = "CommunicationError";
  }
}
module.exports.CommunicationError = CommunicationError;


/*
 * Indicates the transaction contains an invalid request
 */
class RequestError extends TransactionError {
  constructor(message, details) {
    super(message, details);
    this.name = "RequestError";
  }
}
module.exports.RequestError = RequestError;


/*
 * Class of errors related to vault management and guardianship
 */
class VaultError extends DatonaError {
  constructor(message, details) {
    super(message, details);
    this.name = "VaultError";
  }
}
module.exports.VaultError = VaultError;


/*
 * Error resulting from filesystem access
 */
class FileSystemError extends DatonaError {
  constructor(err, message) {
    const fsErrMsg = decodeFSError(err);
    message = (message == undefined) ? fsErrMsg : message+" ("+fsErrMsg+")";
    super(message, err);
    this.name = "FileSystemError";
  }
}
module.exports.FileSystemError = FileSystemError;


const FS_ERROR_CODES = {
  E2BIG: "argument list too long",
  EACCES: "permission denied",
  EADDRINUSE: "address already in use",
  EADDRNOTAVAIL: "address not available",
  EAFNOSUPPORT: "address family not supported",
  EAGAIN: "resource temporarily unavailable",
  EAI_ADDRFAMILY: "address family not supported",
  EAI_AGAIN: "temporary failure",
  EAI_BADFLAGS: "bad ai_flags value",
  EAI_BADHINTS: "invalid value for hints",
  EAI_CANCELED: "request canceled",
  EAI_FAIL: "permanent failure",
  EAI_FAMILY: "ai_family not supported",
  EAI_MEMORY: "out of memory",
  EAI_NODATA: "no address",
  EAI_NONAME: "unknown node or service",
  EAI_OVERFLOW: "argument buffer overflow",
  EAI_PROTOCOL: "resolved protocol is unknown",
  EAI_SERVICE: "service not available for socket type",
  EAI_SOCKTYPE: "socket type not supported",
  EAI_SYSTEM: "system error",
  EALREADY: "connection already in progress",
  EBADF: "bad file descriptor",
  EBUSY: "resource busy or locked",
  ECANCELED: "operation canceled",
  ECHARSET: "invalid Unicode character",
  ECONNABORTED: "software caused connection abort",
  ECONNREFUSED: "connection refused",
  ECONNRESET: "connection reset by peer",
  EDESTADDRREQ: "destination address required",
  EEXIST: "file already exists",
  EFAULT: "bad address in system call argument",
  EFBIG: "file too large",
  EHOSTUNREACH: "host is unreachable",
  EINTR: "interrupted system call",
  EINVAL: "invalid argument",
  EIO: "i/o error",
  EISCONN: "socket is already connected",
  EISDIR: "illegal operation on a directory",
  ELOOP: "too many symbolic links encountered",
  EMFILE: "too many open files",
  EMSGSIZE: "message too long",
  ENAMETOOLONG: "name too long",
  ENETDOWN: "network is down",
  ENETUNREACH: "network is unreachable",
  ENFILE: "file table overflow",
  ENOBUFS: "no buffer space available",
  ENODEV: "no such device",
  ENOENT: "no such file or directory",
  ENOMEM: "not enough memory",
  ENONET: "machine is not on the network",
  ENOPROTOOPT: "protocol not available",
  ENOSPC: "no space left on device",
  ENOSYS: "function not implemented",
  ENOTCONN: "socket is not connected",
  ENOTDIR: "not a directory",
  ENOTEMPTY: "directory not empty",
  ENOTSOCK: "socket operation on non-socket",
  ENOTSUP: "operation not supported on socket",
  EPERM: "operation not permitted",
  EPIPE: "broken pipe",
  EPROTO: "protocol error",
  EPROTONOSUPPORT: "protocol not supported",
  EPROTOTYPE: "protocol wrong type for socket",
  ERANGE: "result too large",
  EROFS: "read-only file system",
  ESHUTDOWN: "cannot send after transport endpoint shutdown",
  ESPIPE: "invalid seek",
  ESRCH: "no such process",
  ETIMEDOUT: "connection timed out",
  ETXTBSY: "text file is busy",
  EXDEV: "cross-device link not permitted",
  UNKNOWN: "unknown error",
  EOF: "end of file",
  ENXIO: "no such device or address",
  EMLINK: "too many links"
};

function decodeFSError(err) {
  if (err == undefined || err.code == undefined) return err;
  else if (err.code in FS_ERROR_CODES) return FS_ERROR_CODES[err.code] + " " + err.path;
  else return "unknown error accessing " + err.path;
};
