'use strict';

/**
 * Bond API Client
 * 
 * This module provides an interface to interact with the Bond devices via 
 * their local API. It includes methods for validating IP addresses and 
 * tokens, fetching devices, retrieving firmware versions, sending actions 
 * to devices, and getting device properties and states.
 * 
 * Author: Grant Slender (gslender@gmail.com)
 * 
 * 
 * License: GNU General Public License v3.0
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const axios = require('axios');
const http = require('http');

// Create custom HTTP and HTTPS agents with keepAlive set to false
const httpAgent = new http.Agent({ keepAlive: false });

class Bond {
    static VALID_TOKEN = 'VALID_TOKEN';
    static OKAY = 'OKAY';
    static FAILED = 'FAILED';
    static INVALID_TOKEN = 'INVALID_TOKEN';
    static INVALID_IPADDRESS = 'INVALID_IPADDRESS';

    constructor(ipAddress, token, log = console.log, enableDebug = false) {
        this.log = log;
        this.enableDebug = enableDebug;
        this.ipAddress = ipAddress;
        this.token = token;
        if (this.enableDebug) this.log(`BondAPI ip:${ipAddress} token:${token}`);
    }

    isIpAddressValid() {
        return this.checkValidIpAddress(this.ipAddress);
    }

    isTokenValid() {
        return !this.isEmptyOrUndefined(this.token);
    }

    isEmptyOrUndefined(value) {
        return value === undefined || value === null || value === '';
    }

    checkValidIpAddress(ipAddress) {
        const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipPattern.test(ipAddress);
    }

    async performHttpRequest(uri, method, headers = {}, body) {
        if (this.enableDebug) this.log(`${method} ${uri}`);
        try {
            const options = {
                httpAgent,
                method,
                url: uri,
                headers: { 'Content-Type': 'application/json', ...headers },
                data: body,
                // Allow axios to resolve the promise for non-2xx responses so we can inspect the status.
                validateStatus: () => true,
                timeout: 5000,  // Optional timeout for requests
            };
            const response = await axios(options);
            return { status: response.status, data: response.data };
        } catch (error) {
            if (this.enableDebug) this.log(`${method} ERROR: ${error}`);
            if (error.response) {
                return { status: error.response.status, data: error.response.data };
            }
            const errorMessage = error?.message || `${error}`;
            return { status: Bond.FAILED, error: errorMessage };
        }
    }

    async getBondDevices() {
        if (!this.isIpAddressValid()) return { status: Bond.INVALID_IPADDRESS };
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/devices`,
            'GET',
            { 'BOND-Token': this.token }
        );
        if (status === 200) {
            const devices = Object.keys(data).filter(key => key !== "_" && key !== "__");
            return { status: Bond.VALID_TOKEN, data: devices };
        } else if (status === 401) {
            return { status: Bond.INVALID_TOKEN };
        } else {
            return { status: Bond.FAILED };
        }
    }

    async getBondDevice(deviceID) {
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/devices/${deviceID}`,
            'GET',
            { 'BOND-Token': this.token }
        );
        if (status === 200) {
            data.id = deviceID;
            return { status: Bond.VALID_TOKEN, data };
        } else if (status === 401) {
            return { status: Bond.INVALID_TOKEN };
        } else {
            return { status: Bond.FAILED };
        }
    }

    async getBondFirmware() {
        if (!this.isIpAddressValid()) return { status: Bond.INVALID_IPADDRESS };
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/sys/version`,
            'GET'
        );
        if (status === 200 && typeof data === 'object') {
            data.status = Bond.OKAY;
            return data;
        } else {
            return { status: Bond.FAILED };
        }
    }

    async getBondDevicesByType(type) {
        const devices = await this.getBondDevices();
        if (devices.status !== Bond.VALID_TOKEN) return devices;
        const devicesByType = [];
        for (const deviceID of devices.data) {
            const device = await this.getBondDevice(deviceID);
            if (device.data?.type === type) {
                devicesByType.push(device.data);
            }
        }
        return devicesByType;
    }

    async sendBondAction(deviceID, action, args) {
        if (!this.isIpAddressValid() || !this.isTokenValid()) return { status: Bond.INVALID_IPADDRESS };
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/devices/${deviceID}/actions/${action}`,
            'PUT',
            { 'BOND-Token': this.token },
            args
        );
        if (status === 200) {
            return { status: Bond.OKAY, data };
        } else if (status === 401) {
            return { status: Bond.INVALID_TOKEN };
        } else {
            return { status: Bond.FAILED };
        }
    }

    async getBondDeviceProperties(deviceID) {
        if (!this.isIpAddressValid() || !this.isTokenValid()) return { status: Bond.INVALID_IPADDRESS };
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/devices/${deviceID}/properties`,
            'GET',
            { 'BOND-Token': this.token }
        );
        if (status === 200) {
            return { status: Bond.OKAY, data };
        } else if (status === 401) {
            return { status: Bond.INVALID_TOKEN };
        } else {
            return { status: Bond.FAILED };
        }
    }

    async getBondDeviceState(deviceID) {
        if (!this.isIpAddressValid() || !this.isTokenValid()) return { status: Bond.INVALID_IPADDRESS };
        const { status, data } = await this.performHttpRequest(
            `http://${this.ipAddress}/v2/devices/${deviceID}/state`,
            'GET',
            { 'BOND-Token': this.token }
        );
        if (status === 200) {
            return { status: Bond.OKAY, data };
        } else if (status === 401) {
            return { status: Bond.INVALID_TOKEN };
        } else {
            return { status: Bond.FAILED };
        }
    }
}

module.exports = Bond;