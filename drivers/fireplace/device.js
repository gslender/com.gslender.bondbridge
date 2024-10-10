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
        await this.setCapabilityValue('onoff',false);
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOff", {});
      } 
      if (value === 'low') {
        await this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":1});
      } 

      if (value === 'medium') {
        await this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":50});
      } 

      if (value === 'high') {
        await this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":100});
      } 
    });
  }

  async updateCapabilityValues(state) {
    if (hasProperties(state.data,["fpfan_power","fpfan_mode"])) {
      await this.setCapabilityValue('onoff', state.data.fpfan_power === 1);
      if (state.data.fpfan_speed == 100) {
        await this.setCapabilityValue('fpfan_mode', 'high');
      } else if (state.data.fpfan_speed == 50) {
        await this.setCapabilityValue('fpfan_mode', 'medium');
      } else {
        await this.setCapabilityValue('fpfan_mode', 'low');
      }
    }
  }
}
module.exports = FireplaceDevice;