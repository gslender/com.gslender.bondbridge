'use strict';
const { Device } = require('homey');
const stringify = require('json-stringify-safe');

class BondDevice extends Device {


  async initialize(name) {
    this.props = {};
    this.props.data = {};
    this.deviceData = {};

    this.props = await this.bond.getBondDeviceProperties(this.getData().id);
    this.deviceData = await this.homey.app.bond.getBondDevice(this.getData().id);
    this.log(`${name} has been initialized deviceData=${stringify(this.deviceData)} props=${stringify(this.props)}`);
    this.setSettings({ deviceData: stringify(this.deviceData) });
    this.setSettings({ deviceProps: stringify(this.props) });
  }

  hasProperties(obj, props) {
    if (!obj) return false;
    return props.every(prop => obj.hasOwnProperty(prop));
  }

  async safeUpdateCapabilityValue(key, value) {
    setTimeout(async () => {
      if (this.hasCapability(key)) {
        if (typeof value !== 'undefined' && value !== null) {
          try {
            await this.setCapabilityValue(key, value);            
          } catch (error) {
            this.log(`error setting capability '${key}' to value '${value}': ${error.message}`);
          }
        } else {
          this.log(`value for capability '${key}' is undefined or null`);
        }
      } else {
        this.log(`missing capability: '${key}'`);
      }
    }, 1);
  }
}

module.exports = BondDevice;