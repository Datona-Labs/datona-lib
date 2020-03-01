"use strict";

/*
 * Datona Javascript Library
 *
 * Main entry point for datona-lib
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

module.exports = {
  config: require('../config.json'),
  crypto: require('./datona-crypto'),
  comms: require('./datona-comms'),
  vault: require('./datona-vault'),
  blockchain: require('./datona-blockchain'),
  assertions: require('./assertions'),
  errors: require('./errors')
};
