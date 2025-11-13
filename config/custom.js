module.exports = ({ env }) => ({
  centrifugo: {
    httpUrl: env("CENTRIFUGO_HTTP_URL", "http://localhost:8000"),
    wsUrl: env(
      "CENTRIFUGO_WS_URL",
      "ws://localhost:8000/connection/websocket"
    ),
    apiKey: env("CENTRIFUGO_API_KEY"),
    tokenHmacSecretKey: env("CENTRIFUGO_TOKEN_HMAC_SECRET_KEY"),
    channelTokenHmacSecretKey: env(
      "CENTRIFUGO_CHANNEL_TOKEN_HMAC_SECRET_KEY",
      ""
    ),
    proxySharedSecret: env("CENTRIFUGO_PROXY_SHARED_SECRET", ""),
    chatNamespace: env("CENTRIFUGO_CHAT_NAMESPACE", "buyer_seller_chat"),
  },
});
