'use strict';

const BondDevice = require('../../lib/bond_device');
const stringify = require('json-stringify-safe');

class ShadeDevice extends BondDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = this.homey.app.bond;
    await this.initialize();
  }

  async initialize() {
    await super.initialize('ShadeDevice');    

    if (this.hasProperties(this.props?.data, ["feature_position"]) && this.props?.data?.feature_position) {
      // shade with positioning
      await this.addCapability("windowcoverings_set");
      this.registerCapabilityListener("windowcoverings_set", async (value) => {
        await this.setWindowcoveringsPosition(value);
      });
    } else {
      await this.removeCapability("windowcoverings_set");
    }

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      await this.setWindowcoveringsState(value);      
    });    
  }

  async setWindowcoveringsPosition(value) {
    const flipPosition = this.getSetting('flipPosition');
    let argVal = value * 100;
    if (flipPosition) argVal = 100 - (argVal);
    await this.runBondAction("SetPosition", { "argument": argVal });
  }

  async setWindowcoveringsState(value) {
    this.log('setWindowcoveringsState ',value);      
    if (value === 'idle') {
      await this.runBondAction("Hold", {});
      return;
    } 
    const flipOpenClose = this.getSetting('flipOpenClose');
    if (flipOpenClose) {
      if (value === 'up') {
        await this.runBondAction("Close", {});
      } 
      if (value === 'down') {
        await this.runBondAction("Open", {});
      } 
    } else {
      if (value === 'up') {
        await this.runBondAction("Open", {});
      } 
      if (value === 'down') {
        await this.runBondAction("Close", {});
      } 

    }
  }

  async updateCapabilityValues(state) {
    if (this.hasProperties(state.data,["open"])) {
      let openState = state.data.open === 1 ? 'up' : 'down';
      if(this.getSetting('flipOpenClose')) {
          openState = (openState === 'up' ? 'down' : 'up');
      }
      const prevState = this.getCapabilityValue('windowcoverings_state');
      await this.safeUpdateCapabilityValue('windowcoverings_state', openState);
      // if (prevState !== openState) {
      //   this.driver?.triggerShadeStateChanged?.(this, { state: openState });
      // }
    }

    if (this.hasProperties(state.data,["position"]) && this.hasCapability('windowcoverings_set')) {          
      const flipPosition = this.getSetting('flipPosition');
      let argVal = state.data.position / 100;
      if (flipPosition) argVal = 1 - (argVal);
      const prevPosition = this.getCapabilityValue('windowcoverings_set');
      await this.safeUpdateCapabilityValue('windowcoverings_set', argVal);
      // if (prevPosition !== argVal) {
      //   this.driver?.triggerShadePositionChanged?.(this, { position: Math.round(argVal * 100) });
      // }
    }
  }

  async setShadeStateFromFlow(state) {
    this.log(`setShadeStateFromFlow ['${this.getData().id}'] [${state}]`);
    if (!this.hasCapability('windowcoverings_state')) {
      throw new Error('Shade does not support open/close control');
    }
    const allowed = ['up', 'down', 'idle'];
    if (!allowed.includes(state)) {
      throw new Error('Unsupported shade state');
    }
    await this.setWindowcoveringsState(state);
    await this.safeUpdateCapabilityValue('windowcoverings_state', state);
  }

  async setShadePositionFromFlow(position) {
    this.log(`setShadePositionFromFlow ['${this.getData().id}'] [${position}]`);
    if (!this.hasCapability('windowcoverings_set')) {
      throw new Error('Shade does not support position control');
    }
    const numericPosition = Number(position);
    if (Number.isNaN(numericPosition)) {
      throw new Error('Position must be a number');
    }
    if (numericPosition < 0 || numericPosition > 100) {
      throw new Error('Position must be between 0 and 100');
    }
    const normalized = numericPosition / 100;
    await this.setWindowcoveringsPosition(normalized);
    await this.safeUpdateCapabilityValue('windowcoverings_set', normalized);
  }

  async isShadeState(state) {
    if (!this.hasCapability('windowcoverings_state')) {
      return false;
    }
    return this.getCapabilityValue('windowcoverings_state') === state;
  }

  async isShadePosition(position) {
    if (!this.hasCapability('windowcoverings_set')) {
      return false;
    }
    const current = this.getCapabilityValue('windowcoverings_set');
    if (typeof current !== 'number') {
      return false;
    }
    return Math.round(current * 100) === Math.round(position);
  }
}
module.exports = ShadeDevice;
