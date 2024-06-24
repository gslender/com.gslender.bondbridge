'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  if (!obj) return false;
  return props.every(prop => obj.hasOwnProperty(prop));
}

class ShadeDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    const props = await this.homey.app.bond.getBondDeviceProperties(this.getData().id);
    this.log(`ShadeDevice has been initialized props=${JSON.stringify(props)}`);

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      this.log('state',value);
      if (value === 'up') {
        await this.homey.app.bond.sendBondAction(this.getData().id,"Open", {});
      } 
      if (value === 'idle') {
        await this.homey.app.bond.sendBondAction(this.getData().id,"Stop", {});
      } 
      if (value === 'down') {
        await this.homey.app.bond.sendBondAction(this.getData().id,"Close", {});
      } 
    });
  }

  async updateCapabilityValues(state) {
    if (hasProperties(state.data,["open"])) {
      this.setCapabilityValue('windowcoverings_state', state.data.open === 1 ? 'up' : 'down');
    }
  }
}
module.exports = ShadeDevice;