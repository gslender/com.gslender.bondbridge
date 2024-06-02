'use strict';

const { Device } = require('homey');

class FireplaceDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('FireplaceDevice has been initialized');
  }
/*
    this.registerCapabilityListener("onoff", async (value) => {
      const zone = this.getThisZone();
      if (zone == undefined) return;

      if (value) {
        await this.homey.app.sendSimpleiZoneCmd("ZoneMode", { Index: zone.Index, Mode: iZoneTypes.ZoneMode_Auto });
      } else {
        await this.homey.app.sendSimpleiZoneCmd("ZoneMode", { Index: zone.Index, Mode: iZoneTypes.ZoneMode_Close });
      }
      this.homey.app.pausePolling(500);
    });

    this.registerCapabilityListener("target_temperature", async (value) => {
      const zone = this.getThisZone();
      if (zone == undefined) return;
      await this.homey.app.sendSimpleiZoneCmd("ZoneSetpoint", { Index: zone.Index, Setpoint: value * 100 });
      this.homey.app.pausePolling(500);
    });


    this.registerCapabilityListener("zone_mode", async (value) => {
      const zone = this.getThisZone();
      if (zone == undefined) return;
      await this.homey.app.sendSimpleiZoneCmd("ZoneMode", { Index: zone.Index, Mode: iZoneTypes.GetZoneModeValue(value) });
      this.homey.app.pausePolling(500);
    });
  }

  getThisZone() {
    if (this.homey.app.state?.ac?.zones?.[this.getData().id]) return this.homey.app.state.ac.zones[this.getData().id]
    return undefined;
  }

  async updateCapabilities() {
    const zone = this.getThisZone();
    if (zone == undefined) return;
    this.setCapabilityValue('onoff', zone.Mode === iZoneTypes.ZoneMode_Auto || zone.Mode === iZoneTypes.ZoneMode_Open);
    this.setCapabilityValue('measure_temperature', zone.Temp / 100);
    this.setCapabilityValue('target_temperature', zone.Setpoint / 100);
    this.setCapabilityValue('zone_mode', iZoneTypes.ZoneModeIdMap[zone.Mode]);
    if (zone.BattVolt == iZoneTypes.BatteryLevel_Full) {
      this.setCapabilityValue('measure_battery', 100);
    } else if (zone.BattVolt == iZoneTypes.BatteryLevel_Half) {
      this.setCapabilityValue('measure_battery', 50);
    } else {
      this.setCapabilityValue('measure_battery', 0);
    }
  }
  */
}
module.exports = FireplaceDevice;