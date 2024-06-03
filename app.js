'use strict';

const Homey = require('homey');
const { fetch } = require('undici');

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

class BondBridgeApp extends Homey.App {

  async onInit() {
    this.log(`${this.id} init...`);

    this.enableRespDebug = false;

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
    let resultFmw = await this.getFirmware();
    if (resultFmw.status === "ok") {
      this.state.firmware = resultFmw.fw_ver;
      this.log(`getFirmware=${resultFmw.fw_ver} token=${this.token}`);
    }
  }

  async getFirmware() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}/v2/sys/version`;
    if (this.enableRespDebug) this.log(`getFirmware() ${uri}`);
    let respData = {};

    try {
      respData.status = "failed";
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const responseData = await response.json();

      respData = responseData;
      if (respData.hasOwnProperty("fw_ver")) respData.status = "ok";
    } catch (e) {
      if (this.enableRespDebug) this.log(`getFirmware() ERROR: ${e}`);
      respData.status = "failed: " + e;
    }
    return respData;
  }


  async getDevices() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}/v2/devices`;
    if (this.enableRespDebug) this.log(`getDevices() ${uri}`);
    let respData = {};

    try {
      respData.status = "failed";
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': this.token
        }
      });
      if (response.status == 200) {
        const responseData = await response.json();
        respData = responseData;
        if (respData.hasOwnProperty("_")) respData.status = "Valid :-)";
      }

      if (response.status == 401) {
        respData.status = "Incorrect Token !?";
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getDevices() ERROR: ${e}`);
    }
    return respData;
  }


  async checkStatus() {
    this.ipaddress = this.homey.settings.get('bond.ipaddress');
    this.token = this.homey.settings.get('bond.token');
    return new Promise(async (resolve, reject) => {
      const response = await this.getDevices();
      this.log('response=', response);
      resolve(response.status);
    });
  }
}

module.exports = BondBridgeApp;
