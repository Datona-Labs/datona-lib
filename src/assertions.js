"use strict";

/*
 * datona-lib assertions.  Used to encourage strong typing of parameters.
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


const errors = require('./errors');


function isNotEmpty(value, name) {
  const result = (value !== undefined) && !/^\s*$/.test(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + " is missing or empty");
  else return result;
}

exports.equals = function(value, expected, name) {
  const result = (value === expected);
  if (name !== undefined && !result) throw new errors.DatonaError(name + ": expected '" + value + "' to equal '" + expected + "'");
  else return result;
};

exports.notEquals = function(value, expected, name) {
  const result = (value !== expected);
  if (name !== undefined && !result) throw new errors.DatonaError(name + ": expected '" + value + "' to not equal '" + expected + "'");
  else return result;
};

exports.isNotEmpty = isNotEmpty;

exports.isPresent = isNotEmpty;

exports.isNotNull = function(value, name) {
  const result = (value !== undefined);
  if (name !== undefined && !result) throw new errors.TypeError(name + " is null");
  else return result;
};

exports.isArray = function(value, name) {
  const result = exports.isNotNull(value, name) && Array.isArray(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected Array");
  else return result;
};

exports.isBoolean = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object Boolean]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected Boolean");
  else return result;
};

exports.isBuffer = function(value, name) {
  const result = isNotEmpty(value, name) && Buffer.isBuffer(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected Buffer");
  else return result;
};

exports.isFunction = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object Function]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected function");
  else return result;
};

exports.isNumber = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object Number]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected number");
  else return result;
};

exports.isString = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object String]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected string");
  else return result;
};

exports.isObject = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object Object]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected Object");
  else return result;
};

exports.isHexString = function(value, name) {
  const result = isNotEmpty(value, name) && (toString.call(value) === '[object String]') && value.match('^[0-9a-fA-F]*$');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected hex string");
  else return result;
};

exports.isHash = function(value, name) {
  const result = isNotEmpty(value, name) && /^[0-9a-fA-F]{64}$/.test(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected hex string of length 64");
  else return result;
};

exports.isPrivateKey = function(value, name) {
  const result = isNotEmpty(value, name) && /^[0-9a-fA-F]{64}$/.test(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected hex string of length 64");
  else return result;
};

exports.isAddress = function(value, name) {
  const result = isNotEmpty(value, name) && /^0x[0-9a-fA-F]{40}$/.test(value);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected address");
  else return result;
};

exports.isUrl = function(value, name) {
  var result = isNotEmpty(value, name) && (toString.call(value) === '[object Object]');
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected Object");
  result &= exports.isString(value.scheme, name ? name + " scheme" : undefined);
  result &= exports.isString(value.host, name ? name + " host" : undefined);
  result &= exports.isNumber(value.port, name ? name + " port" : undefined);
  return result;
};

exports.isInstanceOf = function(value, name, type) {
  const result = isNotEmpty(value, name) && (value instanceof type);
  if (name !== undefined && !result) throw new errors.TypeError(name + ": invalid type. Expected " + type.name);
  else return result;
};
