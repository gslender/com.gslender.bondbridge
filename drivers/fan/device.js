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
      await this.addCapability("onoff");
      // fan with light   
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.runBondAction("TurnLightOn", {});
        } else {
          await this.runBondAction("TurnLightOff", {});
        }
      });

      if (this.hasProperties(this.props?.data, ["feature_brightness"]) && this.props?.data?.feature_brightness) {
        // fan with light that dims
        await this.addCapability("dim");
        this.registerCapabilityListener("dim", async (value) => {
          await this.runBondAction("SetBrightness", { "argument": value * 100 });
        });
      } else {
        await this.removeCapability("dim");
      }
    } else {
      // basic fan (no light)
      await this.removeCapability("dim");
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.runBondAction("TurnOn", {});
        } else {
          await this.runBondAction("TurnOff", {});
        }
      });
    }

    if (this.hasProperties(this.props?.data, ["max_speed"])) {
      // fan with max_speed 
      await this.addCapability("fan_speed");
      this.setCapabilityOptions("fan_speed", {
        min: 0,
        max: this.props?.data?.max_speed
      });
      this.registerCapabilityListener("fan_speed", async (value) => {
        if (value === 0) {
          await this.runBondAction("TurnOff", {});
        } else {
          await this.runBondAction("TurnOn", {});
          await this.runBondAction("SetSpeed", { "argument": value });
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
          await this.runBondAction("TurnOff", {});
        }
        if (value === 'low') {
          await this.safeUpdateCapabilityValue('onoff', true);
          await this.runBondAction("SetSpeed", { "argument": 1 });
        }

        if (value === 'medium') {
          await this.safeUpdateCapabilityValue('onoff', true);
          await this.runBondAction("SetSpeed", { "argument": 50 });
        }

        if (value === 'high') {
          await this.safeUpdateCapabilityValue('onoff', true);
          await this.runBondAction("SetSpeed", { "argument": 100 });
        }
      });
    }

    await this.addCapability("fan_direction");
    this.registerCapabilityListener("fan_direction", async (value) => {
      await this.runBondAction("SetDirection", { "argument": Number(value) });
    });
  }

  async updateCapabilityValues(state) {

    if (this.feature_light) {
      // fan with light   
      if (this.hasProperties(state.data, ["light"])) {
        const prevLightState = this.getCapabilityValue('onoff');
        const nextLightState = state.data.light === 1;
        await this.safeUpdateCapabilityValue('onoff', nextLightState);
        if (prevLightState !== nextLightState) {
          this.driver?.triggerFanLightStateChanged?.(this, { light_on: nextLightState });
        }
      }
      if (this.hasProperties(this.props?.data, ["feature_brightness"]) && this.props?.data.feature_brightness) {

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
        const prevDirection = this.getCapabilityValue('fan_direction');
        const nextDirection = `${state.data.direction}`;
        await this.safeUpdateCapabilityValue('fan_direction', nextDirection);
        if (prevDirection !== nextDirection) {
          this.driver?.triggerFanDirectionChanged?.(this, { fan_direction: nextDirection });
        }
      }
    }

    if (this.hasProperties(state.data, ["speed"])) {
      if (this.hasProperties(this.props?.data, ["max_speed"])) {
        // fan with max_speed   
        if (!this.hasCapability('fan_speed')) {
          await this.addCapability('fan_speed');
          await this.removeCapability('fan_mode');
        } else {
          const prevSpeed = this.getCapabilityValue('fan_speed');
          await this.safeUpdateCapabilityValue('fan_speed', state.data.speed);
          if (prevSpeed !== state.data.speed) {
            this.driver?.triggerFanSpeedChanged?.(this, { fan_speed: `${state.data.speed}` });
          }
        }
      } else {
        // fan without any max_speed (so assuming 3 speed mode)
        if (!this.hasCapability('fan_mode')) {
          await this.addCapability('fan_mode');
          await this.removeCapability('fan_speed');
        } else {
          let modeValue = 'low';
          if (state.data.speed === 100) {
            modeValue = 'high';
          } else if (state.data.speed === 50) {
            modeValue = 'medium';
          } else if (state.data.speed === 0) {
            modeValue = 'off';
          }
          const prevMode = this.getCapabilityValue('fan_mode');
          await this.safeUpdateCapabilityValue('fan_mode', modeValue);
          if (prevMode !== modeValue) {
            this.driver?.triggerFanModeChanged?.(this, { fan_mode: modeValue });
          }
        }
      }
    }
  }

  async setFanModeFromFlow(mode) {
    if (!this.hasCapability('fan_mode')) {
      throw new Error('Fan does not support discrete modes');
    }
    const allowed = ['off', 'low', 'medium', 'high'];
    if (!allowed.includes(mode)) {
      throw new Error('Unsupported fan mode');
    }
    await this.setCapabilityValue('fan_mode', mode);
  }

  async setFanSpeedFromFlow(speed) {
    if (!this.hasCapability('fan_speed')) {
      throw new Error('Fan does not support numeric speed');
    }
    const numericSpeed = Number(speed);
    if (Number.isNaN(numericSpeed)) {
      throw new Error('Speed must be a number');
    }
    const maxSpeed = Number(this.props?.data?.max_speed) || 100;
    const boundedSpeed = Math.max(0, Math.min(maxSpeed, numericSpeed));
    await this.setCapabilityValue('fan_speed', boundedSpeed);
  }

  async setFanDirectionFromFlow(direction) {
    if (!this.hasCapability('fan_direction')) {
      throw new Error('Fan does not support direction control');
    }
    const dirValue = `${direction}`;
    if (dirValue !== '1' && dirValue !== '-1') {
      throw new Error('Direction must be forward or reverse');
    }
    await this.setCapabilityValue('fan_direction', dirValue);
  }

  async setFanLightStateFromFlow(on) {
    if (!this.feature_light) {
      throw new Error('Fan has no light');
    }
    await this.setCapabilityValue('onoff', Boolean(on));
  }

  async setFanLightBrightnessFromFlow(level) {
    if (!this.feature_light || !this.hasCapability('dim')) {
      throw new Error('Fan light does not support dimming');
    }
    if (level < 0 || level > 1) {
      throw new Error('Brightness must be between 0 and 1');
    }
    await this.setCapabilityValue('dim', Number(level));
  }

  async isFanMode(mode) {
    if (!this.hasCapability('fan_mode')) {
      return false;
    }
    return this.getCapabilityValue('fan_mode') === mode;
  }

  async isFanSpeed(speed) {
    if (!this.hasCapability('fan_speed')) {
      return false;
    }
    return Number(this.getCapabilityValue('fan_speed')) === Number(speed);
  }

  async isFanDirection(direction) {
    if (!this.hasCapability('fan_direction')) {
      return false;
    }
    return this.getCapabilityValue('fan_direction') === direction;
  }

  async isFanLightOn() {
    if (!this.feature_light) {
      return false;
    }
    return this.getCapabilityValue('onoff') === true;
  }
}

module.exports = FanDevice;
