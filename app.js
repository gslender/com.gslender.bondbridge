'use strict';

const Homey = require('homey');
const dgram = require('dgram');
const { fetch } = require('undici');

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
    this.log(`${this.id} running...`);

    // uncomment only for testing !!
    // this.homey.settings.unset('izone.ipaddress');
    this.enableRespDebug = false;

    this.ipaddress = this.homey.settings.get('izone.ipaddress');

    if (!isValidIPAddress(this.ipaddress)) {
      // this.homey.app.sendMessageAndReturnAddress()
      //   .then(address => {
      //     console.log('Remote address:', address);
      //     this.homey.settings.set('izone.ipaddress', address);
      //     this.ipaddress = address;
      //   })
      //   .catch(error => {
      //     console.error('Error occurred:', error);
      //   });
    }


    this.state = {};
    this.state.ac = {};
    this.state.ac.zones = {};

    // getFirmwareList
    // let resultFmw = await this.getFirmwareList();
    // if (resultFmw.status === "ok") {
    //   this.state.firmware = resultFmw.Fmw;
    // }
    // this.startPolling();
  }

  async onUninit() {
    this.pausePolling();
  }

  isPaused = false; // This flag checks if the polling is paused

  async startPolling() {
    this.homey.setTimeout(() => {
      if (!this.isPaused) {
        this.polling().then(() => {
          this.startPolling(); // Recursively start polling again
        });
      }
    }, 200); // Wait for 200ms before the next poll
  }

  async pausePolling(delay) {
    this.isPaused = true; // This pauses the polling
    this.homey.setTimeout(() => {
      this.isPaused = false;
      this.startPolling();
    }, delay === undefined ? 0 : delay);
  }

  async resumePolling() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startPolling(); // Resume polling
    }
  }

  async polling() {
    if (this.refreshZoneList === undefined) {
      // starting or repeating, so do getAcSystemInfo 
      let result = await this.getAcSystemInfo();
      this.refreshZoneList = [];

      if (result.status === "ok") {
        this.state.ac.sysinfo = result.SystemV2
        this.updateCapabilitiesDeviceId('ac.sysInfo');

        for (let i = 0; i < result.SystemV2.NoOfZones; i++) {
          this.refreshZoneList.push(i);
        }
      }
      return;
    }

    // now pop a zone num and do getZonesInfo...
    const zoneNum = this.refreshZoneList.pop();
    if (zoneNum != undefined) {
      const resultZone = await this.getZonesInfo(zoneNum);
      if (resultZone.status === "ok") {
        let zoneIdx = "zone" + resultZone.ZonesV2.Index;
        this.state.ac.zones[zoneIdx] = resultZone.ZonesV2;
        this.updateCapabilitiesDeviceId(zoneIdx);
      }
      return;
    }
    // pop failed so reset refreshZoneList
    this.refreshZoneList = undefined;
  }

  async updateCapabilitiesDeviceId(id) {
    // update the drivers and devices
    const drivers = this.homey.drivers.getDrivers();
    for (const driver in drivers) {
      const devices = this.homey.drivers.getDriver(driver).getDevices();
      for (const device of devices) {
        if (device.getData().id === id && device.updateCapabilities) {
          device.updateCapabilities();
          break;
        }
      }
    }
  }

  async getAcSystemInfo() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}:80/iZoneRequestV2`;
    if (this.enableRespDebug) this.log(`getAcSystemInfo() ${uri}`);
    let respData = {};

    const mapBody = { "iZoneV2Request": { "Type": 1, "No": 0, "No1": 0 } };

    try {
      respData.status = "failed";
      const response = await fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapBody)
      });
      const responseData = await response.json();

      respData = responseData;
      if (respData.hasOwnProperty("SystemV2")) respData.status = "ok";
    } catch (e) {
      if (this.enableRespDebug) this.log(`getAcSystemInfo() ERROR: ${e}`);
      respData.status = "failed: " + e;
    }
    return respData;
  }

  async getZonesInfo(zone) {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}:80/iZoneRequestV2`;
    if (this.enableRespDebug) this.log(`getZonesInfo() ${uri} ${zone}`);
    let respData = {};

    const mapBody = { "iZoneV2Request": { "Type": 2, "No": zone, "No1": 0 } };

    try {
      respData.status = "failed";
      const response = await fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapBody)
      });
      const responseData = await response.json();

      respData = responseData;
      if (respData.hasOwnProperty("ZonesV2")) respData.status = "ok";
    } catch (e) {
      if (this.enableRespDebug) this.log(`getZonesInfo() ERROR: ${e}`);
      respData.status = "failed: " + e;
    }
    return respData;
  }

  async getFirmwareList() {
    if (!isValidIPAddress(this.ipaddress)) return {};
    const uri = `http://${this.ipaddress}:80/iZoneRequestV2`;
    if (this.enableRespDebug) this.log(`getFirmwareList() ${uri}`);
    let respData = {};

    const mapBody = { "iZoneV2Request": { "Type": 6, "No": 0, "No1": 0 } };

    try {
      respData.status = "failed";
      const response = await fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapBody)
      });
      const responseData = await response.json();

      respData = responseData;
      if (respData.hasOwnProperty("Fmw")) respData.status = "ok";
    } catch (e) {
      if (this.enableRespDebug) this.log(`getFirmwareList() ERROR: ${e}`);
      respData.status = "failed: " + e;
    }
    return respData;
  }

  async sendSimpleiZoneCmd(cmd, value) {
    if (!isValidIPAddress(this.ipaddress)) return {};
    return this.sendSimpleUriCmdWithBody(
      `http://${this.ipaddress}:80/iZoneCommandV2`,
      JSON.stringify({ [cmd]: value }));
  }

  async sendSimpleUriCmdWithBody(uri, cmdbody) {
    const params = {
      uri: uri,
      body: cmdbody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.enableRespDebug) this.log(`sendSimpleUriCmdWithBody() params: ${JSON.stringify(params)}`);

    try {
      const response = await fetch(params.uri, {
        method: params.method,
        headers: params.headers,
        body: params.body
      });

      const respData = await response.text();

      return { status: respData };
    } catch (e) {
      if (this.enableRespDebug) this.log(`sendSimpleUriCmdWithBody() ERROR: ${e}`);
      return { status: `failed: ${e}` };
    }
  }

  async sendMessageAndReturnAddress() {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      let remoteAddress;

      // Set up event listeners and binding only once
      socket.once('message', (message, remote) => {
        if (this.enableRespDebug) this.log(`CLIENT RECEIVED: ${remote.address} : ${remote.port} - ${message}`);
        remoteAddress = remote.address;
        resolve(remoteAddress);
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send('IASD', 0, 4, 12107, '255.255.255.255', (err) => {
          if (err) {
            reject(err);
          }
        });
      });

      // Close the socket after 1 second if no response is received
      this.homey.setTimeout(() => {
        if (!remoteAddress) {
          socket.close();
          reject(new Error('No response received'));
        }
      }, 1000);
    });
  }
}

module.exports = BondBridgeApp;
