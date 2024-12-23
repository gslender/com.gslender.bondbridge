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

    if (this.hasProperties(this.props.data, ["feature_position"]) && this.props.data.feature_position) {
      // shade with positioning
      await this.addCapability("windowcoverings_set");
      this.registerCapabilityListener("windowcoverings_set", async (value) => {
        const flipPosition = this.getSetting('flipPosition');
        let argVal = value * 100;
        if (flipPosition) argVal = 100 - (argVal);
        await this.bond.sendBondAction(this.getData().id, "SetPosition", { "argument": argVal });
      });
    } else {
      await this.removeCapability("windowcoverings_set");
    }

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      this.log('state',value);
      if (value === 'idle') {
        await this.homey.app.bond.sendBondAction(this.getData().id,"Hold", {});
        return;
      } 
      const flipOpenClose = this.getSetting('flipOpenClose');
      if (flipOpenClose) {
        if (value === 'up') {
          await this.homey.app.bond.sendBondAction(this.getData().id,"Close", {});
        } 
        if (value === 'down') {
          await this.homey.app.bond.sendBondAction(this.getData().id,"Open", {});
        } 
      } else {
        if (value === 'up') {
          await this.homey.app.bond.sendBondAction(this.getData().id,"Open", {});
        } 
        if (value === 'down') {
          await this.homey.app.bond.sendBondAction(this.getData().id,"Close", {});
        } 

      }
    });
  }

  async updateCapabilityValues(state) {
    if (this.hasProperties(state.data,["open"])) {
      await this.safeUpdateCapabilityValue('windowcoverings_state', state.data.open === 1 ? 'up' : 'down');
    }
  }
}
module.exports = ShadeDevice;