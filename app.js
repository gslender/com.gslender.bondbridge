'use strict';

const Homey = require('homey');
const Bond = require('./lib/bond');

class BondBridgeApp extends Homey.App {

  newBondInstance() {
    return new Bond(
      this.homey.settings.get('bond.ipaddress'),
      this.homey.settings.get('bond.token'),
      this.log
    );
  }

  async onInit() {
    this.log(`${this.id} init...`);

    this.homey.settings.on('set', this.onSettingsChanged.bind(this));

    this.pollingTimeoutId = {};
    this.state = {};
    this.state.devices = {};

    this.bond = this.newBondInstance();

    let bondIpAddressInvalid = true;

    if (this.bond.isIpAddressValid()) {
      bondIpAddressInvalid = await this.checkStatus() !== Bond.VALID_TOKEN;
    }

    if (bondIpAddressInvalid) {

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
    }
  }

  async checkStatus() {
    this.bond = this.newBondInstance();
    // return new Promise(async (resolve, reject) => {
    try {
      const response = await this.bond.getBondDevices();
      if (response.status === Bond.VALID_TOKEN) {
        this.homey.clearInterval(this.pollingTimeoutId);
        this.homey.setTimeout(async () => {
          this.startPolling();
        }, this.getRandomNumber(750, 1750));
      }
      this.log('response=', response);
      return response.status;
    } catch (error) {
      this.log('response=', error);
    }
    return Bond.INVALID_TOKEN;
    //   resolve(response.status);
    // });
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  onSettingsChanged(key) {
    if (key === 'bond.polling' || key === 'bond.ipaddress' || key === 'bond.token') {
      this.bond = this.newBondInstance();
      this.homey.clearInterval(this.pollingTimeoutId);
      this.homey.setTimeout(async () => {
        this.startPolling();
        await this.homey.api.realtime("settingsChanged", "otherSuccess");
      }, 500);
    }
  }

  handleDiscoveryResult(discoveryResult) {
    this.log("handleDiscoveryResult.address:", discoveryResult.address);
    this.homey.settings.set('bond.ipaddress', discoveryResult.address);
    this.bond = this.newBondInstance();
    this.homey.clearInterval(this.pollingTimeoutId);
    this.startPolling();
  }

  async startPolling() {
    let pollingInterval = this.homey.settings.get('bond.polling');
    if (isNaN(pollingInterval) || pollingInterval === null || pollingInterval === undefined) {
      pollingInterval = 15000;
    } else {
      pollingInterval = Number(pollingInterval);
    }
    this.log(`${this.id} polling every ${pollingInterval / 1000}sec started...`);

    // getFirmware
    let resultFmw = await this.bond.getBondFirmware();
    if (resultFmw.status === Bond.OKAY) {
      this.state.firmware = resultFmw.fw_ver;
      this.log(`getFirmware=${resultFmw.fw_ver}`);
      this.pollStatus();
      this.pollingTimeoutId = this.homey.setInterval(() => {
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
        try {
          const deviceID = device.getData().id;
          const state = await this.bond.getBondDeviceState(deviceID);
          if (state.status === Bond.OKAY) device.updateCapabilityValues(state); 
        } catch (error) {
        }
      }
    }
  }
}

module.exports = BondBridgeApp;
