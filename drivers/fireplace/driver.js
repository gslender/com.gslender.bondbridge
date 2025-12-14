'use strict';

const { Driver } = require('homey');

class FireplaceDriver extends Driver {

  async onInit() {
    this.registerFlowCards();
  }

  registerFlowCards() {
    this.actionSetMode = this.homey.flow.getActionCard('fireplace_set_mode');
    this.actionSetMode.registerRunListener(async ({ device, fireplace_mode }) => device.setFireplaceModeFromFlow(fireplace_mode));

    this.conditionMode = this.homey.flow.getConditionCard('fireplace_mode_is');
    this.conditionMode.registerRunListener(async ({ device, fireplace_mode }) => device.isFireplaceMode(fireplace_mode));

    this.conditionIsOn = this.homey.flow.getConditionCard('fireplace_is_on');
    this.conditionIsOn.registerRunListener(async ({ device }) => device.isFireplaceOn());

    // this.triggerModeCard = this.homey.flow.getTriggerCard('fpfan_mode_changed');
    // this.triggerPowerCard = this.homey.flow.getTriggerCard('fireplace_onoff_changed');
  }
/*
  async triggerFireplaceFanModeChanged(device, tokens) {
    if (!this.triggerModeCard) return;
    try {
      await this.triggerModeCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fpfan_mode_changed', error);
    }
  }

  async triggerFireplaceOnOffChanged(device, tokens) {
    if (!this.triggerPowerCard) return;
    try {
      await this.triggerPowerCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fireplace_onoff_changed', error);
    }
  }
*/
  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {

    let devices = [];
    const fpDevices = await this.homey.app.bond.getBondDevicesByType('FP');

    for (let i = 0; i < fpDevices.length; i++) {
      const bondDevice = fpDevices[i];
      const device = { 
        name: bondDevice.name,
        data: { id: bondDevice.id } 
      };
      devices.push(device);
    }

    return devices;
  }

}

module.exports = FireplaceDriver;
