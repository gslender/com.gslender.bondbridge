'use strict';

const { Device } = require('homey');
const stringify = require('json-stringify-safe');

function hasProperties(obj, props) {
  if (!obj) return false;
  return props.every(prop => obj.hasOwnProperty(prop));
}

class FireplaceDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.props = await this.homey.app.bond.getBondDeviceProperties(this.getData().id);
    const deviceData = await this.homey.app.bond.getBondDevice(this.getData().id);
    this.log(`FireplaceDevice has been initialized deviceData=${JSON.stringify(deviceData)} props=${JSON.stringify(this.props)}`);
    this.setSettings({ deviceData: stringify(deviceData) });
    this.setSettings({ deviceProps: stringify(this.props) });

    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOn", {});
      } else {
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOff", {});
      }   
    });

    this.registerCapabilityListener("fpfan_mode", async (value) => {
      if (value === 'off') {
        await this.safeUpdateCapabilityValue('onoff',false);
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOff", {});
      } 
      if (value === 'low') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":1});
      } 

      if (value === 'medium') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":50});
      } 

      if (value === 'high') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":100});
      } 
    });
  }

  async safeUpdateCapabilityValue(key, value) {
    if (this.hasCapability(key)) {
      if (typeof value !== 'undefined' && value !== null) {
        await this.setCapabilityValue(key, value);
      } else {
        this.log(`value for capability '${key}' is undefined or null`);
      }
    } else {
      this.log(`missing capability: '${key}'`);
    }
  }

  async updateCapabilityValues(state) {
    if (hasProperties(state.data,["fpfan_power","fpfan_mode"])) {
      await this.safeUpdateCapabilityValue('onoff', state.data.fpfan_power === 1);
      if (state.data.fpfan_speed == 100) {
        await this.safeUpdateCapabilityValue('fpfan_mode', 'high');
      } else if (state.data.fpfan_speed == 50) {
        await this.safeUpdateCapabilityValue('fpfan_mode', 'medium');
      } else {
        await this.safeUpdateCapabilityValue('fpfan_mode', 'low');
      }
    }
  }
}
module.exports = FireplaceDevice;