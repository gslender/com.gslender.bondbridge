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


    const actions = this.deviceData?.data?.actions || [];
    this.feature_light = actions.includes("TurnLightOn");

    if (this.feature_light) {
      await this.addCapability("onoff");
      // fan with light   
      this.registerCapabilityListener("onoff", async (value) => this.applyFanLightState(value));

      if (this.hasProperties(this.props?.data, ["feature_brightness"]) && this.props?.data?.feature_brightness) {
        // fan with light that dims
        await this.addCapability("dim");
        this.registerCapabilityListener("dim", async (value) => this.applyFanLightBrightness(value));
      } else {
        await this.removeCapability("dim");
      }
    } else {
      // basic fan (no light)
      await this.removeCapability("dim");
      this.registerCapabilityListener("onoff", async (value) => this.applyFanPower(value));
    }

    if (this.hasProperties(this.props?.data, ["max_speed"])) {
      // fan with max_speed 
      await this.addCapability("fan_speed");
      this.setCapabilityOptions("fan_speed", {
        min: 0,
        max: this.props?.data?.max_speed
      });
      this.registerCapabilityListener("fan_speed", async (value) => this.applyNumericFanSpeed(value));
      await this.removeCapability("fan_mode");
    } else {
      // fan without any max_speed (so assuming 3 speed mode)
      await this.addCapability("fan_mode");
      await this.removeCapability("fan_speed");
      this.registerCapabilityListener("fan_mode", async (value) => this.applyDiscreteFanMode(value));
    }

    await this.addCapability("fan_direction");
    this.registerCapabilityListener("fan_direction", async (value) => this.applyFanDirection(value));
  }

  async updateCapabilityValues(state) {

    if (this.feature_light) {
      // fan with light   
      if (this.hasProperties(state.data, ["light"])) {
        const prevLightState = this.getCapabilityValue('onoff');
        const nextLightState = state.data.light === 1;
        await this.safeUpdateCapabilityValue('onoff', nextLightState);
        // if (prevLightState !== nextLightState) {
        //   this.driver?.triggerFanLightStateChanged?.(this, { light_on: nextLightState });
        // }
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
        // if (prevDirection !== nextDirection) {
        //   this.driver?.triggerFanDirectionChanged?.(this, { fan_direction: nextDirection });
        // }
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
          // if (prevSpeed !== state.data.speed) {
          //   this.driver?.triggerFanSpeedChanged?.(this, { fan_speed: `${state.data.speed}` });
          // }
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
          // if (prevMode !== modeValue) {
          //   this.driver?.triggerFanModeChanged?.(this, { fan_mode: modeValue });
          // }
        }
      }
    }
  }

  async setFanModeFromFlow(mode) {
    this.log(`setFanModeFromFlow ['${this.getData().id}'] [${mode}]`);
    await this.applyDiscreteFanMode(mode);
  }

  async setFanSpeedFromFlow(speed) {
    this.log(`setFanSpeedFromFlow ['${this.getData().id}'] [${speed}]`);
    await this.applyNumericFanSpeed(speed);
  }

  async setFanDirectionFromFlow(direction) {
    this.log(`setFanDirectionFromFlow ['${this.getData().id}'] [${direction}]`);
    await this.applyFanDirection(direction);
  }

  async setFanLightStateFromFlow(on) {
    this.log(`setFanLightStateFromFlow ['${this.getData().id}'] [${on}]`);
    await this.applyFanLightState(on);
  }

  async setFanLightBrightnessFromFlow(level) {
    this.log(`setFanLightBrightnessFromFlow ['${this.getData().id}'] [${level}]`);
    await this.applyFanLightBrightness(level);
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

  async applyFanLightState(on) {
    if (!this.feature_light) {
      throw new Error('Fan has no light');
    }
    const nextState = Boolean(on);
    if (nextState) {
      await this.runBondAction("TurnLightOn", {});
    } else {
      await this.runBondAction("TurnLightOff", {});
    }
    await this.safeUpdateCapabilityValue('onoff', nextState);
  }

  async applyFanLightBrightness(level) {
    if (!this.feature_light || !this.hasCapability('dim')) {
      throw new Error('Fan light does not support dimming');
    }
    const numericLevel = Number(level);
    if (Number.isNaN(numericLevel) || numericLevel < 0 || numericLevel > 1) {
      throw new Error('Brightness must be between 0 and 1');
    }
    await this.runBondAction("SetBrightness", { "argument": numericLevel * 100 });
    await this.safeUpdateCapabilityValue('dim', numericLevel);
  }

  async applyFanPower(on) {
    if (this.feature_light) {
      // Light fans use onoff for light only.
      throw new Error('Fan power is controlled via fan_mode or fan_speed');
    }
    const nextState = Boolean(on);
    if (nextState) {
      await this.runBondAction("TurnOn", {});
    } else {
      await this.runBondAction("TurnOff", {});
    }
    await this.safeUpdateCapabilityValue('onoff', nextState);
  }

  async applyNumericFanSpeed(speed) {
    if (!this.hasCapability('fan_speed')) {
      throw new Error('Fan does not support numeric speed');
    }
    const numericSpeed = Number(speed);
    if (Number.isNaN(numericSpeed)) {
      throw new Error('Speed must be a number');
    }
    const maxSpeed = Number(this.props?.data?.max_speed) || 100;
    const boundedSpeed = Math.max(0, Math.min(maxSpeed, numericSpeed));
    if (boundedSpeed === 0) {
      await this.runBondAction("TurnOff", {});
      await this.safeUpdateCapabilityValue('onoff', false);
    } else {
      await this.runBondAction("TurnOn", {});
      await this.runBondAction("SetSpeed", { "argument": boundedSpeed });
      await this.safeUpdateCapabilityValue('onoff', true);
    }
    await this.safeUpdateCapabilityValue('fan_speed', boundedSpeed);
  }

  async applyDiscreteFanMode(mode) {
    if (!this.hasCapability('fan_mode')) {
      throw new Error('Fan does not support discrete modes');
    }
    const allowed = ['off', 'low', 'medium', 'high'];
    if (!allowed.includes(mode)) {
      throw new Error('Unsupported fan mode');
    }
    if (mode === 'off') {
      await this.runBondAction("TurnOff", {});
      await this.safeUpdateCapabilityValue('onoff', false);
    } else {
      await this.runBondAction("TurnOn", {});
      if (mode === 'low') {
        await this.runBondAction("SetSpeed", { "argument": 1 });
      } else if (mode === 'medium') {
        await this.runBondAction("SetSpeed", { "argument": 50 });
      } else if (mode === 'high') {
        await this.runBondAction("SetSpeed", { "argument": 100 });
      }
      await this.safeUpdateCapabilityValue('onoff', true);
    }
    await this.safeUpdateCapabilityValue('fan_mode', mode);
  }

  async applyFanDirection(direction) {
    if (!this.hasCapability('fan_direction')) {
      throw new Error('Fan does not support direction control');
    }
    const dirValue = `${direction}`;
    if (dirValue !== '1' && dirValue !== '-1') {
      throw new Error('Direction must be forward or reverse');
    }
    const numericDirection = Number(dirValue);
    await this.runBondAction("SetDirection", { "argument": numericDirection });
    await this.safeUpdateCapabilityValue('fan_direction', dirValue);
  }
}

module.exports = FanDevice;
