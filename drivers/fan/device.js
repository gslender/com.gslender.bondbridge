'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  if (!obj) return false;
  return props.every(prop => obj.hasOwnProperty(prop));
}


class FanDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = this.homey.app.bond;
    await this.initialize();
  }

  async initialize() {
    this.props = await this.bond.getBondDeviceProperties(this.getData().id);
    this.log(`FanDevice has been initialized props=${JSON.stringify(this.props)}`);

    if (hasProperties(this.props.data, ["feature_light"]) && this.props.data.feature_light) {
      // fan with light   
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOn", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOff", {});
        }
      });

      if (hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {
        // fan with light that dims
        await this.addCapability("dim");
        this.registerCapabilityListener("dim", async (value) => {
          await this.bond.sendBondAction(this.getData().id, "SetBrightness", { "argument": value * 100 });
        });
      } else {
        await this.removeCapability("dim");
      }
    } else {
      // basic fan (no light)
      await this.removeCapability("dim");
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.bond.sendBondAction(this.getData().id, "TurnOn", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        }
      });
    }

    if (hasProperties(this.props.data, ["max_speed"])) {
      // fan with max_speed 
      await this.addCapability("fan_speed");
      this.setCapabilityOptions("fan_speed", {
        min: 0,
        max: this.props.data.max_speed
      });
      this.registerCapabilityListener("fan_speed", async (value) => {
        if (value == 0) {
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnOn", {});
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": value });
        }
      });
      await this.removeCapability("fan_mode");
    } else {
      // fan without any max_speed (so assuming 3 speed mode)
      await this.addCapability("fan_mode");
      await this.removeCapability("fan_speed");
      this.registerCapabilityListener("fan_mode", async (value) => {
        if (value === 'off') {
          await this.setCapabilityValue('onoff', false);
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        }
        if (value === 'low') {
          await this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 1 });
        }

        if (value === 'medium') {
          await this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 50 });
        }

        if (value === 'high') {
          await this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 100 });
        }
      });
    }

    await this.addCapability("fan_direction");
    this.registerCapabilityListener("fan_direction", async (value) => {
      await this.bond.sendBondAction(this.getData().id, "SetDirection", { "argument": Number(value) });
    });
  }

  async updateCapabilityValues(state) {
    this.props = this.props || {};
    this.props.data = this.props.data || {};

    if (hasProperties(this.props.data, ["feature_light"]) && this.props.data.feature_light) {
      // fan with light   
      if (hasProperties(state.data, ["light"])) {
        await this.setCapabilityValue('onoff', state.data.light === 1);
      }
      if (hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {

        if (hasProperties(state.data, ["brightness"])) {
          await this.setCapabilityValue('dim', state.data.brightness / 100);
        }
      }
    } else {
      // basic fan (no light)
      if (hasProperties(state.data, ["power"])) {
        await this.setCapabilityValue('onoff', state.data.power === 1);
      }
    }

    if (hasProperties(state.data, ["direction"])) {
      if (!this.hasCapability('fan_direction')) {
        await this.addCapability('fan_direction');
      } else {
        await this.setCapabilityValue('fan_direction', `${state.data.direction}`);
      }
    }

    if (hasProperties(state.data, ["speed"])) {
      if (hasProperties(this.props.data, ["max_speed"])) {
        // fan with max_speed   
        if (!this.hasCapability('fan_speed')) {
          await this.addCapability('fan_speed');
          await this.removeCapability('fan_mode');
        } else {
          await this.setCapabilityValue('fan_speed', state.data.speed);
        }
      } else {
        // fan without any max_speed (so assuming 3 speed mode)
        if (!this.hasCapability('fan_mode')) {
          await this.addCapability('fan_mode');
          await this.removeCapability('fan_speed');
        } else {
          if (state.data.speed == 100) {
            await this.setCapabilityValue('fan_mode', 'high');
          } else if (state.data.speed == 50) {
            await this.setCapabilityValue('fan_mode', 'medium');
          } else {
            await this.setCapabilityValue('fan_mode', 'low');
          }
        }
      }
    }
  }
}

module.exports = FanDevice;
