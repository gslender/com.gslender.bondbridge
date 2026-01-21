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

    const actions = this.deviceData?.data?.actions || [];
    this.hasHeat = actions.includes("TurnOn") || actions.includes("TurnOff");
    this.hasFan = actions.includes("TurnFpFanOn") || actions.includes("TurnFpFanOff") || actions.includes("SetFpFan");

    await this.configureCapabilities();

    if (this.hasHeat || this.hasFan) {
      this.registerCapabilityListener("onoff", async (value) => this.handleGeneralOnOff(value));
    }

    if (this.hasHeat) {
      this.registerCapabilityListener("onoff.heat", async (value) => this.applyFireplacePower(value));
    }

    if (this.hasFan) {
      this.registerCapabilityListener("onoff.fan", async (value) => this.applyFireplaceFanPower(value));
      this.registerCapabilityListener("fpfan_mode", async (value) => this.applyFireplaceMode(value));
    }
  }

  async updateCapabilityValues(state) {
    if (this.hasHeat && this.hasProperties(state.data, ["power"])) {
      const nextHeatState = state.data.power === 1;
      await this.safeUpdateCapabilityValue('onoff.heat', nextHeatState);
      await this.mirrorPreferredOnOff('onoff.heat', nextHeatState);
    }

    if (this.hasFan && this.hasProperties(state.data, ["fpfan_power"])) {
      const nextFanState = state.data.fpfan_power === 1;
      await this.safeUpdateCapabilityValue('onoff.fan', nextFanState);
      await this.mirrorPreferredOnOff('onoff.fan', nextFanState);
    }

    if (this.hasFan && this.hasProperties(state.data, ["fpfan_speed"])) {
      const nextPowerState = state.data.fpfan_power === 1;
      await this.safeUpdateCapabilityValue('onoff.fan', nextPowerState);
      await this.mirrorPreferredOnOff('onoff.fan', nextPowerState);

      let mode = 'low';
      if (state.data.fpfan_speed == 100) {
        mode = 'high';
      } else if (state.data.fpfan_speed == 50) {
        mode = 'medium';
      } else if (state.data.fpfan_power === 0) {
        mode = 'off';
      }
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
    if (!this.hasHeat) {
      throw new Error('Fireplace has no heat power control');
    }
    const nextState = Boolean(on);
    if (nextState) {
      await this.runBondAction("TurnOn", {});
    } else {
      await this.runBondAction("TurnOff", {});
    }
    await this.safeUpdateCapabilityValue('onoff.heat', nextState);
    await this.mirrorPreferredOnOff('onoff.heat', nextState);
  }

  async applyFireplaceFanPower(on) {
    if (!this.hasFan) {
      throw new Error('Fireplace has no fan control');
    }
    const nextState = Boolean(on);
    if (nextState) {
      await this.runBondAction("TurnFpFanOn", {});
    } else {
      await this.runBondAction("TurnFpFanOff", {});
    }
    await this.safeUpdateCapabilityValue('onoff.fan', nextState);
    await this.mirrorPreferredOnOff('onoff.fan', nextState);
  }

  async applyFireplaceMode(mode) {
    if (!this.hasFan) {
      throw new Error('Fireplace has no fan mode control');
    }
    const allowed = ['off', 'low', 'medium', 'high'];
    if (!allowed.includes(mode)) {
      throw new Error('Unsupported fireplace fan mode');
    }
    if (mode === 'off') {
      await this.runBondAction("TurnFpFanOff", {});
      await this.safeUpdateCapabilityValue('onoff.fan', false);
      await this.mirrorPreferredOnOff('onoff.fan', false);
    } else {
      await this.runBondAction("TurnFpFanOn", {});
      if (mode === 'low') {
        await this.runBondAction("SetFpFan", { "argument": 1 });
      } else if (mode === 'medium') {
        await this.runBondAction("SetFpFan", { "argument": 50 });
      } else if (mode === 'high') {
        await this.runBondAction("SetFpFan", { "argument": 100 });
      }
      await this.safeUpdateCapabilityValue('onoff.fan', true);
      await this.mirrorPreferredOnOff('onoff.fan', true);
    }
    await this.safeUpdateCapabilityValue('fpfan_mode', mode);
  }

  async configureCapabilities() {
    if (this.hasHeat || this.hasFan) {
      await this.addCapability('onoff');
    } else {
      await this.removeCapability('onoff');
    }

    if (this.hasHeat) {
      await this.addCapability('onoff.heat');
    } else {
      await this.removeCapability('onoff.heat');
    }

    if (this.hasFan) {
      await this.addCapability('onoff.fan');
      await this.addCapability('fpfan_mode');
    } else {
      await this.removeCapability('onoff.fan');
      await this.removeCapability('fpfan_mode');
    }
  }

  async handleGeneralOnOff(value) {
    if (this.hasHeat) {
      return this.applyFireplacePower(value);
    }
    if (this.hasFan) {
      return this.applyFireplaceFanPower(value);
    }
    throw new Error('Fireplace has no power controls available');
  }

  async mirrorPreferredOnOff(sourceCapability, value) {
    const preferred = this.hasHeat ? 'onoff.heat' : 'onoff.fan';
    if (sourceCapability === preferred) {
      await this.safeUpdateCapabilityValue('onoff', value);
    }
  }
}
module.exports = FireplaceDevice;
