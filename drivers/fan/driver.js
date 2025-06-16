'use strict';

const { Driver } = require('homey');

class FanDriver extends Driver {

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
