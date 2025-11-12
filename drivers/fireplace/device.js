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
        await this.runBondAction("TurnFpFanOn", {});
      } else {
        await this.runBondAction("TurnFpFanOff", {});
      }   
    });

    this.registerCapabilityListener("fpfan_mode", async (value) => {
      if (value === 'off') {
        await this.safeUpdateCapabilityValue('onoff',false);
        await this.runBondAction("TurnFpFanOff", {});
      } 
      if (value === 'low') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.runBondAction("SetFpFan", {"argument":1});
      } 

      if (value === 'medium') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.runBondAction("SetFpFan", {"argument":50});
      } 

      if (value === 'high') {
        await this.safeUpdateCapabilityValue('onoff',true);
        await this.runBondAction("SetFpFan", {"argument":100});
      } 
    });
  }

  async updateCapabilityValues(state) {
    if (this.hasProperties(state.data,["fpfan_speed","fpfan_mode"])) {
      const nextPowerState = state.data.fpfan_power === 1;
      const prevPowerState = this.getCapabilityValue('onoff');
      await this.safeUpdateCapabilityValue('onoff', nextPowerState);
      if (prevPowerState !== nextPowerState) {
        this.driver?.triggerFireplaceOnOffChanged?.(this, { onoff: nextPowerState });
      }

      let mode = 'low';
      if (state.data.fpfan_speed == 100) {
        mode = 'high';
      } else if (state.data.fpfan_speed == 50) {
        mode = 'medium';
      } else if (state.data.fpfan_power === 0) {
        mode = 'off';
      }
      const prevMode = this.getCapabilityValue('fpfan_mode');
      await this.safeUpdateCapabilityValue('fpfan_mode', mode);
      if (prevMode !== mode) {
        this.driver?.triggerFireplaceFanModeChanged?.(this, { fpfan_mode: mode });
      }
    }
  }

  async setFireplaceModeFromFlow(mode) {
    await this.setCapabilityValue('fpfan_mode', mode);
  }

  async isFireplaceMode(mode) {
    return this.getCapabilityValue('fpfan_mode') === mode;
  }

  async isFireplaceOn() {
    return this.getCapabilityValue('onoff') === true;
  }
}
module.exports = FireplaceDevice;
