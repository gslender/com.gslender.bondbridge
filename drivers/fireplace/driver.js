'use strict';

const { Driver } = require('homey');

class FireplaceDriver extends Driver {

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {

    let devices = [];
    const fpDevices = await this.homey.app.bond.getBondDevicesByType('FP');

    for (let i = 0; i < fpDevices.length; i++) {
      const bondDevice = fpDevices[i];
      const device = { 
        name: bondDevice.name,
        data: { id: bondDevice.id } 
      };
      devices.push(device);
    }

    return devices;
  }

}

module.exports = FireplaceDriver;
