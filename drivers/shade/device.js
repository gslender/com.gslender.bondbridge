'use strict';

const { Device } = require('homey');
const  stringify  = require('json-stringify-safe');

function hasProperties(obj, props) {
  if (!obj) return false;
  return props.every(prop => obj.hasOwnProperty(prop));
}

class ShadeDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = this.homey.app.bond;
    await this.initialize();
  }

  async initialize() {
    this.props = await this.homey.app.bond.getBondDeviceProperties(this.getData().id);
    const deviceData = await this.homey.app.bond.getBondDevice(this.getData().id);
    this.log(`ShadeDevice has been initialized deviceData=${JSON.stringify(deviceData)} props=${JSON.stringify(this.props)}`);
    this.setSettings({ deviceData: stringify(deviceData) });
    this.setSettings({ deviceProps: stringify(this.props) });
    

    if (hasProperties(this.props.data, ["feature_position"]) && this.props.data.feature_position) {
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
    if (hasProperties(state.data,["open"])) {
      await this.setCapabilityValue('windowcoverings_state', state.data.open === 1 ? 'up' : 'down');
    }
  }
}
module.exports = ShadeDevice;