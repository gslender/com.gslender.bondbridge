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
      await this.applyFireplacePower(value);
    });

    this.registerCapabilityListener("fpfan_mode", async (value) => {
      await this.applyFireplaceMode(value);
    });
  }

  async updateCapabilityValues(state) {
    if (this.hasProperties(state.data,["fpfan_speed","fpfan_mode"])) {
      const nextPowerState = state.data.fpfan_power === 1;
      const prevPowerState = this.getCapabilityValue('onoff');
      await this.safeUpdateCapabilityValue('onoff', nextPowerState);
      // if (prevPowerState !== nextPowerState) {
      //   this.driver?.triggerFireplaceOnOffChanged?.(this, { onoff: nextPowerState });
      // }

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
      // if (prevMode !== mode) {
      //   this.driver?.triggerFireplaceFanModeChanged?.(this, { fpfan_mode: mode });
      // }
    }
  }

  async setFireplaceModeFromFlow(mode) {
    this.log(`setFireplaceModeFromFlow ['${this.getData().id}'] [${mode}]`);
    await this.applyFireplaceMode(mode);
  }

  async isFireplaceMode(mode) {
    return this.getCapabilityValue('fpfan_mode') === mode;
  }

  async isFireplaceOn() {
    return this.getCapabilityValue('onoff') === true;
  }

  async applyFireplacePower(on) {
    const nextState = Boolean(on);
    if (nextState) {
      await this.runBondAction("TurnFpFanOn", {});
    } else {
      await this.runBondAction("TurnFpFanOff", {});
    }
    await this.safeUpdateCapabilityValue('onoff', nextState);
  }

  async applyFireplaceMode(mode) {
    const allowed = ['off', 'low', 'medium', 'high'];
    if (!allowed.includes(mode)) {
      throw new Error('Unsupported fireplace fan mode');
    }
    if (mode === 'off') {
      await this.runBondAction("TurnFpFanOff", {});
      await this.safeUpdateCapabilityValue('onoff', false);
    } else {
      await this.runBondAction("TurnFpFanOn", {});
      if (mode === 'low') {
        await this.runBondAction("SetFpFan", { "argument": 1 });
      } else if (mode === 'medium') {
        await this.runBondAction("SetFpFan", { "argument": 50 });
      } else if (mode === 'high') {
        await this.runBondAction("SetFpFan", { "argument": 100 });
      }
      await this.safeUpdateCapabilityValue('onoff', true);
    }
    await this.safeUpdateCapabilityValue('fpfan_mode', mode);
  }
}
module.exports = FireplaceDevice;
