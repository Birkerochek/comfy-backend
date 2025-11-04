const lifecycles = {
  beforeCreate(event) {
    const data = event.params.data ?? {};
    if (!data.chat_status) {
      data.chat_status = "active";
    }
    if (!data.last_message_at) {
      data.last_message_at = new Date();
    }
  },
};

export default lifecycles;
