'use strict';

const BondDevice = require('../../lib/bond_device');
const stringify = require('json-stringify-safe');

class FanDevice extends BondDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = this.homey.app.bond;
    await this.initialize();
  }

  async initialize() {
    await super.initialize('FanDevice');


    this.feature_light = this.deviceData.data.actions.includes("TurnLightOn");

    if (this.feature_light) {
      // fan with light   
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOn", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOff", {});
        }
      });

      if (this.hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {
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

    if (this.hasProperties(this.props.data, ["max_speed"])) {
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
          await this.safeUpdateCapabilityValue('onoff', false);
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        }
        if (value === 'low') {
          await this.safeUpdateCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 1 });
        }

        if (value === 'medium') {
          await this.safeUpdateCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 50 });
        }

        if (value === 'high') {
          await this.safeUpdateCapabilityValue('onoff', true);
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

    if (this.feature_light) {
      // fan with light   
      if (this.hasProperties(state.data, ["light"])) {
        await this.safeUpdateCapabilityValue('onoff', state.data.light === 1);
      }
      if (this.hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {

        if (this.hasProperties(state.data, ["brightness"])) {
          await this.safeUpdateCapabilityValue('dim', state.data.brightness / 100);
        }
      }
    } else {
      // basic fan (no light)
      if (this.hasProperties(state.data, ["power"])) {
        await this.safeUpdateCapabilityValue('onoff', state.data.power === 1);
      }
    }

    if (this.hasProperties(state.data, ["direction"])) {
      if (!this.hasCapability('fan_direction')) {
        await this.addCapability('fan_direction');
      } else {
        await this.safeUpdateCapabilityValue('fan_direction', `${state.data.direction}`);
      }
    }

    if (this.hasProperties(state.data, ["speed"])) {
      if (this.hasProperties(this.props.data, ["max_speed"])) {
        // fan with max_speed   
        if (!this.hasCapability('fan_speed')) {
          await this.addCapability('fan_speed');
          await this.removeCapability('fan_mode');
        } else {
          await this.safeUpdateCapabilityValue('fan_speed', state.data.speed);
        }
      } else {
        // fan without any max_speed (so assuming 3 speed mode)
        if (!this.hasCapability('fan_mode')) {
          await this.addCapability('fan_mode');
          await this.removeCapability('fan_speed');
        } else {
          if (state.data.speed == 100) {
            await this.safeUpdateCapabilityValue('fan_mode', 'high');
          } else if (state.data.speed == 50) {
            await this.safeUpdateCapabilityValue('fan_mode', 'medium');
          } else {
            await this.safeUpdateCapabilityValue('fan_mode', 'low');
          }
        }
      }
    }
  }
}

module.exports = FanDevice;
