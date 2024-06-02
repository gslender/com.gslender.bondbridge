'use strict';

const { Driver } = require('homey');

class iZoneACDriver extends Driver {

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    var devices = [];
    const acSysInfo = this.homey.app.state.ac.sysinfo;
    const device = { data: { id: 'ac.sysInfo' } };
    devices.push(device);

    return devices;
  }

}

module.exports = iZoneACDriver;
