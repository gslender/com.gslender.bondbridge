'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  return props.every(prop => obj.hasOwnProperty(prop));
}

class FanDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('FanDevice has been initialized');

    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await this.homey.app.sendBondAction(this.getData().id, "TurnOn", {});
      } else {
        await this.homey.app.sendBondAction(this.getData().id, "TurnOff", {});
      }
    });


    this.registerCapabilityListener("fan_mode", async (value) => {
      if (value === 'off') {
        this.setCapabilityValue('onoff', false);
        await this.homey.app.sendBondAction(this.getData().id, "TurnOff", {});
      }
      if (value === 'low') {
        this.setCapabilityValue('onoff', true);
        await this.homey.app.sendBondAction(this.getData().id, "SetSpeed", { "argument": 1 });
      }

      if (value === 'medium') {
        this.setCapabilityValue('onoff', true);
        await this.homey.app.sendBondAction(this.getData().id, "SetSpeed", { "argument": 50 });
      }

      if (value === 'high') {
        this.setCapabilityValue('onoff', true);
        await this.homey.app.sendBondAction(this.getData().id, "SetSpeed", { "argument": 100 });
      }
    });
  }

  async updateCapabilities(state) {    
    if (hasProperties(state,["power","speed"])) {
      this.setCapabilityValue('onoff', state.data.power === 1);
      if (state.data.speed == 100) {
        this.setCapabilityValue('fan_mode', 'high');
      } else if (state.data.speed == 50) {
        this.setCapabilityValue('fan_mode', 'medium');
      } else {
        this.setCapabilityValue('fan_mode', 'low');
      }
    }
  }
}


module.exports = FanDevice;
