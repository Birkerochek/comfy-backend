declare const strapi: any;

const ensureProxyAuth = (ctx, strapi) => {
  const secret = strapi.config.get("custom.centrifugo.proxySharedSecret");
  if (!secret) {
    return true;
  }

  const header = ctx.request.headers["authorization"] ?? "";
  if (header !== `Bearer ${secret}`) {
    ctx.status = 401;
    ctx.body = { error: { code: 401, message: "Unauthorized" } };
    return false;
  }
  return true;
};

const respondError = (ctx, code, message) => {
  ctx.status = 200;
  ctx.body = { error: { code, message } };
};

const parseChatIdFromChannel = (channel: string) => {
  if (!channel) return null;
  const parts = channel.split(":");
  const last = parts[parts.length - 1] ?? "";
  const cleaned = last.replace(/^chat:?/, "");
  const numeric = Number(cleaned);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
};

export default {
  async connect(ctx) {
    if (!ensureProxyAuth(ctx, strapi)) {
      return;
    }

    const user = ctx.request.body?.user;
    ctx.body = {
      result: {
        user,
      },
    };
  },

  async subscribe(ctx) {
    if (!ensureProxyAuth(ctx, strapi)) {
      return;
    }

    const body = ctx.request.body ?? {};
    const channel: string = body.channel;
    const userId = Number(body.user);

    const chatId = parseChatIdFromChannel(channel);

    if (!chatId || Number.isNaN(chatId)) {
      respondError(ctx, 403, "Invalid channel");
      return;
    }

    if (!userId) {
      respondError(ctx, 401, "User not provided");
      return;
    }

    try {
      await strapi.service("api::chat.chat").assertChatParticipant(
        chatId,
        userId
      );
      ctx.body = { result: {} };
    } catch (error) {
      respondError(ctx, 403, "Not allowed to subscribe to chat");
    }
  },
};
