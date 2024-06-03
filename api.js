module.exports = {
    async checkStatus({ homey, query  })
    {
        const result = await homey.app.checkStatus();
        return result;
    }
};