'use strict';

const BondDevice = require('../../lib/bond_device');
const stringify = require('json-stringify-safe');

class FireplaceDevice extends BondDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = this.homey.app.bond;
    await this.initialize();
  }

  async initialize() {
    await super.initialize('FireplaceDevice');

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

  async updateCapabilityValues(state) {
    if (this.hasProperties(state.data,["fpfan_power","fpfan_mode"])) {
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