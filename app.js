'use strict';

const Homey = require('homey');
const Bond = require('./lib/bond');

class BondBridgeApp extends Homey.App {

  async onInit() {
    this.log(`${this.id} init...`);

    this.timeoutId = {};

    this.state = {};
    this.state.devices = {};

    this.bond = this.createBondAPI();

    if (!this.bond.isIpAddressValid()) {

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
      this.startPolling();
    }

    this.homey.settings.on('set', this.onSettingsChanged.bind(this));
  }

  createBondAPI() {
    return new Bond(
      this.homey.settings.get('bond.ipaddress'),
      this.homey.settings.get('bond.token'),
      this.log
    );
  }

  onSettingsChanged(key) {
    if (key === 'bond.polling' || key === 'bond.ipaddress' || key === 'bond.token') {
      this.bond = this.createBondAPI();
      this.homey.clearInterval(this.timeoutId);
      this.homey.setTimeout(async () => {
        this.startPolling();
        await this.homey.api.realtime("settingsChanged", "otherSuccess");
      }, 500);
    }
  }

  handleDiscoveryResult(discoveryResult) {
    this.log("handleDiscoveryResult.address:", discoveryResult.address);
    this.homey.settings.set('bond.ipaddress', discoveryResult.address);
    this.bond = this.createBondAPI();
    this.homey.clearInterval(this.timeoutId);
    this.startPolling();
  }

  async startPolling() {
    let pollingInterval = this.homey.settings.get('bond.polling');
    if (isNaN(pollingInterval) || pollingInterval === null || pollingInterval === undefined) {
        pollingInterval = 15000;
    } else {
        pollingInterval = Number(pollingInterval);
    }
    this.log(`${this.id} polling every ${pollingInterval/1000}sec started...`);

    // getFirmware
    let resultFmw = await this.bond.getBondFirmware();
    if (resultFmw.status === Bond.OKAY) {
      this.state.firmware = resultFmw.fw_ver;
      this.log(`getFirmware=${resultFmw.fw_ver}`);
      this.pollStatus();
      this.timeoutId = this.homey.setInterval(() => {
        this.pollStatus();
      }, pollingInterval);
    }
  }

  async pollStatus() {
    // update the devices state
    const drivers = this.homey.drivers.getDrivers();
    for (const driver in drivers) {
      const devices = this.homey.drivers.getDriver(driver).getDevices();
      for (const device of devices) {
        const deviceID = device.getData().id;
        const state = await this.bond.getBondDeviceState(deviceID);
        if (state.status === Bond.OKAY) device.updateCapabilityValues(state);
      }
    }
  }

  async checkStatus() {
    this.bond = this.createBondAPI();
    return new Promise(async (resolve, reject) => {
      const response = await this.bond.getBondDevices();
      if (response.status === Bond.VALID_TOKEN) {
        this.homey.clearInterval(this.timeoutId);
        this.startPolling();
      }
      this.log('response=', response);
      resolve(response.status);
    });
  }
}

module.exports = BondBridgeApp;
