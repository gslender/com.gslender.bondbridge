'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  return props.every(prop => obj.hasOwnProperty(prop));
}

class FireplaceDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    const props = await this.homey.app.bond.getBondDeviceProperties(this.getData().id);
    this.log(`FireplaceDevice has been initialized props=${JSON.stringify(props)}`);

    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOn", {});
      } else {
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOff", {});
      }   
    });

    this.registerCapabilityListener("fpfan_mode", async (value) => {
      if (value === 'off') {
        this.setCapabilityValue('onoff',false);
        await this.homey.app.bond.sendBondAction(this.getData().id,"TurnFpFanOff", {});
      } 
      if (value === 'low') {
        this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":1});
      } 

      if (value === 'medium') {
        this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":50});
      } 

      if (value === 'high') {
        this.setCapabilityValue('onoff',true);
        await this.homey.app.bond.sendBondAction(this.getData().id,"SetFpFan", {"argument":100});
      } 
    });
  }

  async updateCapabilityValues(state) {
    if (hasProperties(state,["fpfan_power","fpfan_mode"])) {
      this.setCapabilityValue('onoff', state.data.fpfan_power === 1);
      if (state.data.fpfan_speed == 100) {
        this.setCapabilityValue('fpfan_mode', 'high');
      } else if (state.data.fpfan_speed == 50) {
        this.setCapabilityValue('fpfan_mode', 'medium');
      } else {
        this.setCapabilityValue('fpfan_mode', 'low');
      }
    }
  }
}
module.exports = FireplaceDevice;