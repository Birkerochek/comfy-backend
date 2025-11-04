const lifecycles = {
  beforeCreate(event) {
    const data = event.params.data ?? {};
    if (!data.sent_at) {
      data.sent_at = new Date();
    }
  },
};

export default lifecycles;
