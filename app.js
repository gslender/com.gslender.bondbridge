'use strict';

const Homey = require('homey');
const { fetch } = require('undici');

const VALID_TOKEN_STRING = 'Valid Token :-)';
const OKAY_STRING = 'ok';
const FAILED_STRING = 'failed';
const INVALID_TOKEN_STRING = 'Token Invalid !!';

function isEmptyOrUndefined(value) {
  return value === undefined || value === null || value === '';
}

function isValidIPAddress(ipaddress) {
  // Check if ipaddress is undefined or null
  if (ipaddress === undefined || ipaddress === null) {
    return false; // Not a valid IP address
  }

  // Regular expression for IPv4 validation
  const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // Validate IP address pattern
  return ipPattern.test(ipaddress);
}

function onSettingsChanged(key) {
  if (key === 'bond.ipaddress' || key === 'bond.token') {
    this.homey.app.ipaddress = this.homey.settings.get('bond.ipaddress');
    this.homey.app.token = this.homey.settings.get('bond.token');
    if (isValidIPAddress(this.homey.app.ipaddress)) {
      this.homey.clearInterval(this.homey.app.pollTimer);
      this.homey.app.continueApp();
    }
  }
}

class BondBridgeApp extends Homey.App {

  async onInit() {
    this.log(`${this.id} init...`);

    this.enableRespDebug = false;
    this.pollTimer = {};

    // uncomment only for testing !!
    // this.homey.settings.unset('bond.ipaddress');
    // this.homey.settings.unset('bond.token');
    // this.enableRespDebug = true;
    // uncomment only for testing !!

    this.ipaddress = this.homey.settings.get('bond.ipaddress');
    this.token = this.homey.settings.get('bond.token');
    this.state = {};
    this.state.devices = {};

    if (!isValidIPAddress(this.ipaddress)) {

      const discoveryStrategy = this.homey.discovery.getStrategy("bond");

      // Use the discovery results that were already found
      const initialDiscoveryResults = discoveryStrategy.getDiscoveryResults();
      for (const discoveryResult of Object.values(initialDiscoveryResults)) {
        this.handleDiscoveryResult(discoveryResult);
      }

      // And listen to new results while the app is running
      discoveryStrategy.on("result", discoveryResult => {
        this.handleDiscoveryResult(discoveryResult);
      });
    } else {
      this.continueApp();
    }

    this.homey.settings.on('set', onSettingsChanged);
  }

  handleDiscoveryResult(discoveryResult) {
    this.log("handleDiscoveryResult.address:", discoveryResult.address);
    this.homey.settings.set('bond.ipaddress', discoveryResult.address);
    this.ipaddress = discoveryResult.address;
    this.continueApp();
  }

  async continueApp() {
    this.log(`${this.id} started...`);

    // getFirmware
    let resultFmw = await this.getBondFirmware();
    if (resultFmw.status === OKAY_STRING) {
      this.state.firmware = resultFmw.fw_ver;
      this.log(`getFirmware=${resultFmw.fw_ver} token=${this.token}`);
      this.pollState();
      this.pollTimer = this.homey.setInterval(() => {
        this.pollState();
      }, 5000);
    }
  }

  async getBondFirmware() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}/v2/sys/version`;
    if (this.enableRespDebug) this.log(`getBondFirmware() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const responseData = await response.json();

      respData = responseData;
      if (respData.hasOwnProperty("fw_ver")) respData.status = OKAY_STRING;
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondFirmware() ERROR: ${e}`);
      respData.status = FAILED_STRING + e;
    }
    return respData;
  }

  async getBondDevices() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}/v2/devices`;
    if (this.enableRespDebug) this.log(`getBondDevices() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
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
          respData.status = VALID_TOKEN_STRING;
          respData.data = [];
          for (const key in responseData) {
            if (key !== "_" && key !== "__") {
              respData.data.push(key);
            }
          }
        }
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDevices() ERROR: ${e}`);
    }
    return respData;
  }

  async getBondDevice(deviceID) {
    if (!isValidIPAddress(this.ipaddress) || isEmptyOrUndefined(this.token)) return {};
    const uri = `http://${this.ipaddress}/v2/devices/${deviceID}`;
    if (this.enableRespDebug) this.log(`getBondDevice() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': this.token
        }
      });
      respData.data = {};
      if (response.status == 200) {
        respData.status = VALID_TOKEN_STRING;
        respData.data = await response.json();
        respData.data.id = deviceID;
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDevice() ERROR: ${e}`);
    }
    return respData;
  }

  async getBondDeviceState(deviceID) {
    if (!isValidIPAddress(this.ipaddress) || isEmptyOrUndefined(this.token)) return {};
    const uri = `http://${this.ipaddress}/v2/devices/${deviceID}/state`;
    if (this.enableRespDebug) this.log(`getBondDeviceState() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': this.token
        }
      });
      respData.data = {};
      if (response.status == 200) {
        respData.status = OKAY_STRING;
        respData.data = await response.json();
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDeviceState() ERROR: ${e}`);
    }
    return respData;
  }

  async getBondDevicesByType(type) {
    if (!isValidIPAddress(this.ipaddress) || isEmptyOrUndefined(this.token)) return {};

    var devicesByType = [];
    const devices = await this.getBondDevices();
    // this.log('DEVICES >>',JSON.stringify(devices));
    for (let i = 0; i < devices.data.length; i++) {
      const device = await this.getBondDevice(devices.data[i]);
      if (device.data.hasOwnProperty('type') && device.data.type === type) {
        if (this.enableRespDebug) this.log(`getBondDevicesByType: ${JSON.stringify(device.data)}`);
        devicesByType.push(device.data);
      }
    }
    return devicesByType;
  }

  async sendBondAction(deviceID, action, args) {
    if (!isValidIPAddress(this.ipaddress) || isEmptyOrUndefined(this.token)) return {};
    const uri = `http://${this.ipaddress}/v2/devices/${deviceID}/actions/${action}`;
    if (this.enableRespDebug) this.log(`sendBondAction() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
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
        respData.status = OKAY_STRING;
        respData.data = await response.json();
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`sendBondAction() ERROR: ${e}`);
    }
    return respData;
  }


  async pollState() {
    // update the devices state
    const drivers = this.homey.drivers.getDrivers();
    for (const driver in drivers) {
      const devices = this.homey.drivers.getDriver(driver).getDevices();
      for (const device of devices) {
        const deviceID = device.getData().id;
        const state = await this.getBondDeviceState(deviceID);
        if (state.status === OKAY_STRING) device.updateCapabilities(state);
      }
    }
  }

  async checkStatus() {
    this.ipaddress = this.homey.settings.get('bond.ipaddress');
    this.token = this.homey.settings.get('bond.token');
    return new Promise(async (resolve, reject) => {
      const response = await this.getBondDevices();
      if (response.status === VALID_TOKEN_STRING) {
        this.homey.clearInterval(this.pollTimer);
        this.continueApp();
      }
      this.log('response=', response);
      resolve(response.status);
    });
  }
}

module.exports = BondBridgeApp;
