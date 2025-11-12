'use strict';

const { Driver } = require('homey');

class ShadeDriver extends Driver {

  async onInit() {
    this.registerFlowCards();
  }

  registerFlowCards() {
    this.flowActionOpen = this.homey.flow.getActionCard('shade_open');
    this.flowActionOpen.registerRunListener(async ({ device }) => device.setShadeStateFromFlow('up'));

    this.flowActionClose = this.homey.flow.getActionCard('shade_close');
    this.flowActionClose.registerRunListener(async ({ device }) => device.setShadeStateFromFlow('down'));

    this.flowActionStop = this.homey.flow.getActionCard('shade_stop');
    this.flowActionStop.registerRunListener(async ({ device }) => device.setShadeStateFromFlow('idle'));

    this.flowActionPosition = this.homey.flow.getActionCard('shade_set_position');
    this.flowActionPosition.registerRunListener(async ({ device, position }) => {
      await device.setShadePositionFromFlow(Number(position));
    });

    this.flowConditionState = this.homey.flow.getConditionCard('shade_state_is');
    this.flowConditionState.registerRunListener(async ({ device, state }) => device.isShadeState(state));

    this.flowConditionPosition = this.homey.flow.getConditionCard('shade_position_is');
    this.flowConditionPosition.registerRunListener(async ({ device, position }) => device.isShadePosition(Number(position)));

    this.triggerShadeStateCard = this.homey.flow.getTriggerCard('shade_state_changed');
    this.triggerShadePositionCard = this.homey.flow.getTriggerCard('shade_position_changed');
  }

  async triggerShadeStateChanged(device, tokens) {
    if (!this.triggerShadeStateCard) return;
    try {
      await this.triggerShadeStateCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger shade_state_changed', error);
    }
  }

  async triggerShadePositionChanged(device, tokens) {
    if (!this.triggerShadePositionCard) return;
    try {
      await this.triggerShadePositionCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger shade_position_changed', error);
    }
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {

    let devices = [];
    const fpDevices = await this.homey.app.bond.getBondDevicesByType('MS');
    
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

module.exports = ShadeDriver;
