import { factories } from "@strapi/strapi";
import { getChatChannel, getCentrifugoConfig, generateClientToken, generateChannelToken, publishToCentrifugo, fetchCentrifugoPresence } from "../../../utils/centrifugo";

const extractBody = (ctx: any) => {
  const raw = ctx.request.body ?? {};
  if (typeof raw === "object" && raw !== null && "data" in raw) {
    return (raw as any).data ?? raw;
  }
  return raw;
};

export default factories.createCoreController(
  "api::chat.chat",
  ({ strapi }) => ({
    async start(ctx) {
      const userId = ctx?.state?.user?.id;
      if (!userId) {
        return ctx.unauthorized("Authentication required");
      }

      const payload = extractBody(ctx);
      const chatIdRaw = payload.chatId;
      const chatId = chatIdRaw ? Number(chatIdRaw) : null;
      const productId = Number(payload.productId);

      try {
        const chatService = strapi.service("api::chat.chat");
        let chat;
        let product;

        if (chatId) {
          chat = await chatService.assertChatParticipant(chatId, userId);
          product = chat.product;
          if (!product || !product.id) {
            const fullChat = await strapi.entityService.findOne(
              "api::chat.chat",
              chat.id,
              {
                populate: {
                  product: { fields: ["id", "title", "slug"] },
                },
              }
            );
            product = (fullChat as any)?.product ?? null;
            if (product) {
              (chat as any).product = product;
            }
          }
        } else {
          if (!productId || Number.isNaN(productId)) {
            return ctx.badRequest("productId is required");
          }

          const result = await chatService.getOrCreateChat({
            buyerId: userId,
            productId,
          });
          chat = result.chat;
          product = result.product;
          if (product) {
            (chat as any).product = product;
          }
        }

        if (!product || !product.id) {
          const error: any = new Error("Chat product not found");
          error.status = 400;
          throw error;
        }

        const messages = await chatService.fetchMessages(chat.id, {
          limit: payload.limit ?? 20,
        });

        const centrifugoConfig = getCentrifugoConfig(strapi);
        const channel = getChatChannel(chat.id, strapi);
        const clientToken = generateClientToken(strapi, {
          sub: String(userId),
          info: {
            chatId: chat.id,
            productId: product.id,
            userId,
          },
        });

        let channelToken: string | null = null;
        try {
          channelToken = generateChannelToken(strapi, {
            sub: String(userId),
            channel,
          });
        } catch (error) {
          strapi.log.warn(
            `Channel token not generated: ${(error as Error).message}`
          );
        }

        strapi.log.info(
          `chat.start tokens: channelToken=${channelToken ? "present" : "missing"}`
        );

        const viewerRole =
          chat?.buyer?.id === userId
            ? "buyer"
            : chat?.seller?.id === userId
            ? "seller"
            : null;
        const peerId =
          viewerRole === "buyer"
            ? chat?.seller?.id ?? null
            : viewerRole === "seller"
            ? chat?.buyer?.id ?? null
            : null;

        let presenceUserIds: number[] | undefined;
        try {
          const presence = await fetchCentrifugoPresence(strapi, channel);
          if (presence) {
            presenceUserIds = Object.values(presence)
              .map((client) => {
                const userIdRaw = (client as { user?: string | number }).user;
                const numericId = Number(userIdRaw);
                return Number.isNaN(numericId) ? null : numericId;
              })
              .filter((value): value is number => value !== null);
          } else {
            presenceUserIds = [];
          }
        } catch (presenceError) {
          strapi.log.warn(
            `Failed to fetch Centrifugo presence for channel ${channel}: ${(presenceError as Error).message}`
          );
          presenceUserIds = [];
        }

        ctx.body = {
          chat,
          messages,
          centrifugo: {
            wsUrl: centrifugoConfig.wsUrl,
            channel,
            clientToken,
            channelToken,
          },
          viewer: {
            role: viewerRole,
            userId,
            peerId,
          },
          presence: {
            userIds: presenceUserIds,
          },
        };
      } catch (error) {
        const status = (error as any)?.status ?? 500;
        const message = (error as Error).message ?? "Failed to start chat";
        if (status >= 500) {
          strapi.log.error("Chat start failed", error);
        }
        ctx.status = status;
        ctx.body = { error: message };
      }
    },

    async messages(ctx) {
      const userId = ctx?.state?.user?.id;
      if (!userId) {
        return ctx.unauthorized("Authentication required");
      }

      const chatId = Number(ctx.params.id);
      if (!chatId || Number.isNaN(chatId)) {
        return ctx.badRequest("Chat id is invalid");
      }

      const limit = ctx.query?.limit ? Number(ctx.query.limit) : 50;
      const cursor = ctx.query?.cursor ? String(ctx.query.cursor) : null;

      try {
        const chatService = strapi.service("api::chat.chat");
        await chatService.assertChatParticipant(chatId, userId);
        const messages = await chatService.fetchMessages(chatId, {
          limit: limit && limit > 0 ? Math.min(limit, 100) : 50,
          cursor,
        });

        ctx.body = {
          items: messages,
        };
      } catch (error) {
        const status = (error as any)?.status ?? 500;
        const message = (error as Error).message ?? "Failed to fetch messages";
        if (status >= 500) {
          strapi.log.error("Fetching chat messages failed", error);
        }
        ctx.status = status;
        ctx.body = { error: message };
      }
    },

    async postMessage(ctx) {
      const userId = ctx?.state?.user?.id;
      if (!userId) {
        return ctx.unauthorized("Authentication required");
      }

      const chatId = Number(ctx.params.id);
      if (!chatId || Number.isNaN(chatId)) {
        return ctx.badRequest("Chat id is invalid");
      }

      const payload = extractBody(ctx);
      const rawBody = typeof payload.body === "string" ? payload.body : "";
      const text = rawBody.trim();

      const attachmentIds: number[] = Array.isArray(payload.attachments)
        ? payload.attachments
            .map((value: unknown) => Number(value))
            .filter((value: number) => !Number.isNaN(value))
        : [];
      const hasAttachments = attachmentIds.length > 0;

      if (!text && !hasAttachments) {
        return ctx.badRequest("Message body or attachments are required");
      }

      try {
        const chatService = strapi.service("api::chat.chat");
        const chat = await chatService.assertChatParticipant(chatId, userId);

        const message = await chatService.createMessage({
          chat,
          authorId: userId,
          body: text || " ",
          attachments: attachmentIds.length ? attachmentIds : undefined,
        });

        if (!text) {
          (message as any).body = "";
        }

        const channel = getChatChannel(chat.id, strapi);
        await publishToCentrifugo(strapi, channel, {
          event: "chat.message.created",
          chatId: chat.id,
          message,
        });

        ctx.body = { message };
      } catch (error) {
        const status = (error as any)?.status ?? 500;
        const message = (error as Error).message ?? "Failed to post message";
        if (status >= 500) {
          strapi.log.error("Posting chat message failed", error);
        }
        ctx.status = status;
        ctx.body = { error: message };
      }
    },
  })
);
