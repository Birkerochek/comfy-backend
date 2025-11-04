export default {
  routes: [
    {
      method: "GET",
      path: "/chats",
      handler: "chat.find",
    },
    {
      method: "GET",
      path: "/chats/:id",
      handler: "chat.findOne",
    },
    {
      method: "POST",
      path: "/chats/start",
      handler: "chat.start",
    },
    {
      method: "GET",
      path: "/chats/:id/messages",
      handler: "chat.messages",
    },
    {
      method: "POST",
      path: "/chats/:id/messages",
      handler: "chat.postMessage",
    },
  ],
};
