const { v4: uuidv4 } = require('uuid');

module.exports = {
  async beforeCreate(event) {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
    event.params.data.order_number = `ORD-${timestamp}-${uuidv4().slice(0,6)}`;
  },
};
