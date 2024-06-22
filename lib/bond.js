'use strict';

const { fetch } = require('undici');

class Bond {
    static VALID_TOKEN = 'VALID_TOKEN';
    static OKAY = 'OKAY';
    static FAILED = 'FAILED';
    static INVALID_TOKEN = 'INVALID_TOKEN';
    static INVALID_IPADDRESS = 'INVALID_IPADDRESS';

    constructor(ipAddress, token, log,enableRespDebug) {
        this.log = log ?? console.log;
        this.enableRespDebug = enableRespDebug ?? false;
        this.ipAddress = ipAddress;
        this.token = token;
        this.log(`BondAPI ip:${ipAddress} token:${token}`);
    }

    isIpAddressValid() {
        return this.checkValidIpAddress(this.ipAddress);
    }

    isTokenValid() {
        return this.isEmptyOrUndefined(this.token);
    }

    isEmptyOrUndefined(value) {
        return value === undefined || value === null || value === '';
    }

    checkValidIpAddress(_ipaddr) {
        // Check if _ipaddr is undefined or null
        if (_ipaddr === undefined || _ipaddr === null) {
            return false; // Not a valid IP address
        }

        // Regular expression for IPv4 validation
        const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        // Validate IP address pattern
        return ipPattern.test(_ipaddr);
    }

    hasProperties(obj, props) {
        return props.every(prop => obj.hasOwnProperty(prop));
    }


    async getBondDevices() {
        if (!this.isIpAddressValid()) return { status: Bond.INVALID_IPADDRESS };
        const uri = `http://${this.ipAddress}/v2/devices`;
        if (this.enableRespDebug) this.log(`getBondDevices() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'BOND-Token': this.token
                }
            });

            if (response.status == 200) {
                const responseData = await response.json();
                if (responseData.hasOwnProperty("_")) {
                    respData.status = Bond.VALID_TOKEN;
                    respData.data = [];
                    for (const key in responseData) {
                        if (key !== "_" && key !== "__") {
                            respData.data.push(key);
                        }
                    }
                }
            }

            if (response.status == 401) {
                respData.status = Bond.INVALID_TOKEN;
                this.log(`Incorrect Token !?`);
            }
        } catch (e) {
            if (this.enableRespDebug) this.log(`getBondDevices() ERROR: ${e}`);
        }
        return respData;
    }

    async getBondDevice(deviceID) {
        const uri = `http://${this.ipAddress}/v2/devices/${deviceID}`;
        if (this.enableRespDebug) this.log(`getBondDevice() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'BOND-Token': this.token
                }
            });
            respData.data = {};
            if (response.status == 200) {
                respData.status = Bond.VALID_TOKEN;
                respData.data = await response.json();
                if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
                respData.data.id = deviceID;
            }

            if (response.status == 401) {
                respData.status = Bond.INVALID_TOKEN;
                this.homey.clearInterval(this.pollTimer);
                this.log(`Incorrect Token !?`);
            }
        } catch (e) {
            if (this.enableRespDebug) this.log(`getBondDevice() ERROR: ${e}`);
        }
        return respData;
    }

    async getBondFirmware() {
        if (!this.isIpAddressValid()) return {};
        const uri = `http://${this.ipAddress}/v2/sys/version`;
        if (this.enableRespDebug) this.log(`getBondFirmware() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const responseData = await response.json();
            if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(responseData)}`);

            respData = responseData;
            if (respData.hasOwnProperty("fw_ver")) respData.status = Bond.OKAY;
        } catch (e) {
            if (this.enableRespDebug) this.log(`getBondFirmware() ERROR: ${e}`);
            respData.status = Bond.FAILED + e;
        }
        return respData;
    }

    async getBondDevicesByType(type) {
        this.log(`>>>>  getBondDevicesByType: ${type}`);
        if (!this.isIpAddressValid() || this.isTokenValid()) return {};
        var devicesByType = [];
        const devices = await this.getBondDevices();
        this.log('>>>>  DEVICES >>', JSON.stringify(devices));
        for (let i = 0; i < devices.data.length; i++) {
            const device = await this.getBondDevice(devices.data[i]);
            this.log('>>>>  DEVICE >>', JSON.stringify(device));
            if (device.data.hasOwnProperty('type') && device.data.type === type) {
                if (this.enableRespDebug) this.log(`getBondDevicesByType: ${JSON.stringify(device.data)}`);
                devicesByType.push(device.data);
            }
        }
        return devicesByType;
    }

    async sendBondAction(deviceID, action, args) {
        if (!this.isIpAddressValid() || this.isTokenValid()) return {};
        const uri = `http://${this.ipAddress}/v2/devices/${deviceID}/actions/${action}`;
        if (this.enableRespDebug) this.log(`sendBondAction() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'BOND-Token': this.token
                },
                body: JSON.stringify(args)
            });
            respData.data = {};
            if (response.status == 200) {
                respData.status = Bond.OKAY;
                respData.data = await response.json();
            }

            if (response.status == 401) {
                respData.status = Bond.INVALID_TOKEN;
                this.homey.clearInterval(this.pollTimer);
                this.log(`Incorrect Token !?`);
            }
        } catch (e) {
            if (this.enableRespDebug) this.log(`sendBondAction() ERROR: ${e}`);
        }
        return respData;
    }

    async getBondDeviceProperties(deviceID) {
        if (!this.isIpAddressValid() || this.isTokenValid()) return {};
        const uri = `http://${this.ipAddress}/v2/devices/${deviceID}/properties`;
        if (this.enableRespDebug) this.log(`getDeviceProperties() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'BOND-Token': this.token
                }
            });
            respData.data = {};
            if (response.status == 200) {
                respData.status = Bond.OKAY;
                respData.data = await response.json();
                if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
            }

            if (response.status == 401) {
                respData.status = Bond.INVALID_TOKEN;
                this.homey.clearInterval(this.pollTimer);
                this.log(`Incorrect Token !?`);
            }
        } catch (e) {
            if (this.enableRespDebug) this.log(`getDeviceProperties() ERROR: ${e}`);
        }
        return respData;
    }

    async getBondDeviceState(deviceID) {
        if (!this.isIpAddressValid() || this.isTokenValid()) return {};
        const uri = `http://${this.ipAddress}/v2/devices/${deviceID}/state`;
        if (this.enableRespDebug) this.log(`getBondDeviceState() ${uri}`);
        let respData = {};

        try {
            respData.status = Bond.FAILED;
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'BOND-Token': this.token
                }
            });
            respData.data = {};
            if (response.status == 200) {
                respData.status = Bond.OKAY;
                respData.data = await response.json();
                if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
            }

            if (response.status == 401) {
                respData.status = Bond.INVALID_TOKEN;
                this.homey.clearInterval(this.pollTimer);
                this.log(`Incorrect Token !?`);
            }
        } catch (e) {
            if (this.enableRespDebug) this.log(`getBondDeviceState() ERROR: ${e}`);
        }
        return respData;
    }
}

module.exports = Bond;