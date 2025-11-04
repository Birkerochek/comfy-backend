export default {
  routes: [
    {
      method: "POST",
      path: "/centrifugo/connect",
      handler: "centrifugo.connect",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/centrifugo/subscribe",
      handler: "centrifugo.subscribe",
      config: {
        auth: false,
      },
    },
  ],
};
