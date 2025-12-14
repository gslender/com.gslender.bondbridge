'use strict';

const { Driver } = require('homey');

class FanDriver extends Driver {

  async onInit() {
    this.registerFlowCards();
  }

  registerFlowCards() {
    this.actionSetMode = this.homey.flow.getActionCard('fan_set_mode');
    this.actionSetMode.registerRunListener(async ({ device, fan_mode }) => device.setFanModeFromFlow(fan_mode));

    this.actionSetSpeed = this.homey.flow.getActionCard('fan_set_speed');
    this.actionSetSpeed.registerRunListener(async ({ device, speed }) => device.setFanSpeedFromFlow(Number(speed)));

    this.actionSetDirection = this.homey.flow.getActionCard('fan_set_direction');
    this.actionSetDirection.registerRunListener(async ({ device, direction }) => device.setFanDirectionFromFlow(direction));

    this.actionSetLightState = this.homey.flow.getActionCard('fan_set_light_state');
    this.actionSetLightState.registerRunListener(async ({ device, light_on }) => device.setFanLightStateFromFlow(light_on));

    this.actionSetLightBrightness = this.homey.flow.getActionCard('fan_set_light_brightness');
    this.actionSetLightBrightness.registerRunListener(async ({ device, brightness }) => device.setFanLightBrightnessFromFlow(Number(brightness)));

    this.conditionFanMode = this.homey.flow.getConditionCard('fan_mode_is');
    this.conditionFanMode.registerRunListener(async ({ device, fan_mode }) => device.isFanMode(fan_mode));

    this.conditionFanSpeed = this.homey.flow.getConditionCard('fan_speed_is');
    this.conditionFanSpeed.registerRunListener(async ({ device, speed }) => device.isFanSpeed(Number(speed)));

    this.conditionFanDirection = this.homey.flow.getConditionCard('fan_direction_is');
    this.conditionFanDirection.registerRunListener(async ({ device, direction }) => device.isFanDirection(direction));

    this.conditionFanLightOn = this.homey.flow.getConditionCard('fan_light_is_on');
    this.conditionFanLightOn.registerRunListener(async ({ device }) => device.isFanLightOn());

    // this.triggerFanModeCard = this.homey.flow.getTriggerCard('fan_mode_changed');
    // this.triggerFanSpeedCard = this.homey.flow.getTriggerCard('fan_speed_changed');
    // this.triggerFanDirectionCard = this.homey.flow.getTriggerCard('fan_direction_changed');
    // this.triggerFanLightCard = this.homey.flow.getTriggerCard('fan_light_state_changed');
  }
  /*
  async triggerFanModeChanged(device, tokens) {
    if (!this.triggerFanModeCard) return;
    try {
      await this.triggerFanModeCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fan_mode_changed', error);
    }
  }

  async triggerFanSpeedChanged(device, tokens) {
    if (!this.triggerFanSpeedCard) return;
    try {
      await this.triggerFanSpeedCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fan_speed_changed', error);
    }
  }

  async triggerFanDirectionChanged(device, tokens) {
    if (!this.triggerFanDirectionCard) return;
    try {
      await this.triggerFanDirectionCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fan_direction_changed', error);
    }
  }

  async triggerFanLightStateChanged(device, tokens) {
    if (!this.triggerFanLightCard) return;
    try {
      await this.triggerFanLightCard.trigger(device, tokens);
    } catch (error) {
      this.error('Failed to trigger fan_light_state_changed', error);
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
    const cfDevices = await this.homey.app.bond.getBondDevicesByType('CF');
    
    for (let i = 0; i < cfDevices.length; i++) {
      const bondDevice = cfDevices[i];
      const device = { 
        name: bondDevice.name,
        data: { id: bondDevice.id },
      };
      devices.push(device);
    }

    return devices;
  }

}

module.exports = FanDriver;
