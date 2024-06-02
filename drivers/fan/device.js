'use strict';

const { Device } = require('homey');
const iZoneTypes = require('../../izonetypes');

class FanDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('FanDevice has been initialized');
/*
    this.registerCapabilityListener("onoff", async (value) => {
      await this.homey.app.sendSimpleiZoneCmd("SysOn", value ? 1 : 0);
      this.homey.app.pausePolling(500);
    });

    this.registerCapabilityListener("target_temperature", async (value) => {
      if (this.homey.app.state?.ac?.zones) {
        // find all zones above this target and adjust them all down (or up)
        const isLower = value * 100 < this.homey.app.state.ac.sysinfo.Setpoint;
        for (const keyid in this.homey.app.state.ac.zones) {
          const zone = this.homey.app.state.ac.zones[keyid];
          if (zone == undefined) continue;
          if (zone.Mode === iZoneTypes.ZoneMode_Open || zone.Mode === iZoneTypes.ZoneMode_Auto) {
            this.log(`>>>>>>zone ${JSON.stringify(zone)}`);
            if (isLower) {
              if (zone.Setpoint > value * 100) {
                await this.homey.app.sendSimpleiZoneCmd("ZoneSetpoint", { Index: zone.Index, Setpoint: value * 100 });
              }
            } else {
              if (zone.Setpoint < value * 100) {
                await this.homey.app.sendSimpleiZoneCmd("ZoneSetpoint", { Index: zone.Index, Setpoint: value * 100 });
              }
            }
            await this.homey.app.sendSimpleiZoneCmd("SysSetpoint", { Index: zone.Index, Setpoint: value * 100 });
            this.homey.app.pausePolling(500);
          }
        }
      }
    });

    this.registerCapabilityListener("thermostat_mode", async (value) => {
      await this.homey.app.sendSimpleiZoneCmd("SysMode", iZoneTypes.GetSysModeValue(value));      
      this.homey.app.pausePolling(500);
    });

    this.registerCapabilityListener("fan_mode", async (value) => {
      await this.homey.app.sendSimpleiZoneCmd("SysFan", iZoneTypes.GetSysFanValue(value));
      this.homey.app.pausePolling(500);
    });

    if (this.homey.app.state?.firmware) {
      await this.setSettings({
        firmware: this.homey.app.state.firmware,
      });
    }
  }

  async updateCapabilities() {
    if (this.homey.app.state?.ac?.sysinfo) {
      const acSysInfo = this.homey.app.state.ac.sysinfo;

      this.setCapabilityValue('onoff', acSysInfo.SysOn === 1);

      this.setCapabilityValue('measure_temperature', acSysInfo.Temp / 100);
      this.setCapabilityValue('target_temperature', acSysInfo.Setpoint / 100);

      this.setCapabilityValue('thermostat_mode', iZoneTypes.SysModeIdMap[acSysInfo.SysMode]);
      this.setCapabilityValue('fan_mode', iZoneTypes.SysFanIdMap[acSysInfo.SysFan]);

    }
  }
*/
  }
}

module.exports = FanDevice;
