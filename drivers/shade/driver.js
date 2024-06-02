'use strict';

const { Driver } = require('homey');

class iZoneZoneDriver extends Driver {

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    var devices = [];
    // for (const keyid in this.homey.app.state.ac.zones) {
    //   const zone = this.homey.app.state.ac.zones[keyid];
    //   // don't include ZoneType_Constant
    //   if (zone.ZoneType != iZoneTypes.ZoneType_Constant) {
    //     const device = { name: zone.Name,  data: { id: keyid } };
    //     devices.push(device);
    //   }
    // }

    return devices;
  }

}

module.exports = iZoneZoneDriver;
