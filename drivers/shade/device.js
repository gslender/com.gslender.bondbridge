'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  return props.every(prop => obj.hasOwnProperty(prop));
}

class ShadeDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('ShadeDevice has been initialized');

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      this.log('state',value);
      if (value === 'up') {
        await this.homey.app.sendBondAction(this.getData().id,"Open", {});
      } 
      if (value === 'idle') {
        await this.homey.app.sendBondAction(this.getData().id,"Stop", {});
      } 
      if (value === 'down') {
        await this.homey.app.sendBondAction(this.getData().id,"Close", {});
      } 
    });
  }

  async updateCapabilities(state) {
    if (hasProperties(state,["open"])) {
      this.setCapabilityValue('windowcoverings_state', state.data.open === 1 ? 'up' : 'down');
    }
  }
}
module.exports = ShadeDevice;