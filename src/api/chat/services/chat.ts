import { factories } from "@strapi/strapi";

type ChatEntity = {
  id: number;
  chat_status: string;
  buyer?: { id: number } | null;
  seller?: { id: number } | null;
  product?: { id: number } | null;
};

const ensureParticipant = (chat: ChatEntity, userId: number) => {
  const buyerId = chat.buyer?.id;
  const sellerId = chat.seller?.id;
  if (buyerId !== userId && sellerId !== userId) {
    const error: any = new Error("Access denied to chat");
    error.status = 403;
    throw error;
  }
};

export default factories.createCoreService("api::chat.chat", ({ strapi }) => ({
  async resolveProductSeller(productId: number) {
    const product = await strapi.entityService.findOne(
      "api::product.product",
      productId,
      {
        populate: { developer: true },
      }
    );

    if (!product) {
      const error: any = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    const sellerId = (product as any)?.developer?.id;
    if (!sellerId) {
      const error: any = new Error("Product developer not found");
      error.status = 400;
      throw error;
    }

    return { product, sellerId };
  },

  async findExistingChat({
    buyerId,
    sellerId,
    productId,
  }: {
    buyerId: number;
    sellerId: number;
    productId: number;
  }) {
    const chats = await strapi.entityService.findMany("api::chat.chat", {
      filters: {
        buyer: { id: buyerId },
        seller: { id: sellerId },
        product: { id: productId },
      },
      populate: {
        buyer: { fields: ["id", "username", "full_name"] },
        seller: { fields: ["id", "username", "full_name"] },
        product: { fields: ["id", "title", "slug"] },
      },
      limit: 1,
    });

    return chats[0] ?? null;
  },

  async createChat({
    buyerId,
    sellerId,
    productId,
  }: {
    buyerId: number;
    sellerId: number;
    productId: number;
  }) {
    const chat = await strapi.entityService.create("api::chat.chat", {
      data: {
        buyer: buyerId,
        seller: sellerId,
        product: productId,
        chat_status: "active",
        last_message_at: new Date(),
      },
      populate: {
        buyer: { fields: ["id", "username", "full_name"] },
        seller: { fields: ["id", "username", "full_name"] },
        product: { fields: ["id", "title", "slug"] },
      },
    });

    return chat;
  },

  async getOrCreateChat(params: {
    buyerId: number;
    productId: number;
  }) {
    const { product, sellerId } = await this.resolveProductSeller(
      params.productId
    );

    const existing = await this.findExistingChat({
      buyerId: params.buyerId,
      sellerId,
      productId: params.productId,
    });

    if (existing) {
      return { chat: existing, sellerId, product };
    }

    const created = await this.createChat({
      buyerId: params.buyerId,
      sellerId,
      productId: params.productId,
    });

    return { chat: created, sellerId, product };
  },

  async assertChatParticipant(chatId: number, userId: number) {
    const chat = (await strapi.entityService.findOne("api::chat.chat", chatId, {
      populate: {
        buyer: { fields: ["id", "username", "full_name"] },
        seller: { fields: ["id", "username", "full_name"] },
        product: { fields: ["id", "title", "slug"] },
      },
    })) as ChatEntity | null;

    if (!chat) {
      const error: any = new Error("Chat not found");
      error.status = 404;
      throw error;
    }

    ensureParticipant(chat, userId);
    return chat;
  },

  async fetchMessages(chatId: number, { limit = 50, cursor }: { limit?: number; cursor?: string | null }) {
    const filters: Record<string, any> = { chat: { id: chatId } };
    if (cursor) {
      filters.id = { $lt: Number(cursor) };
    }

    const messages = await strapi.entityService.findMany(
      "api::chat-message.chat-message",
      {
        filters,
        sort: { id: "desc" },
        limit,
        populate: {
          author: {
            fields: ["id", "username", "full_name"],
            populate: { avatar: true, developer_profile: true },
          },
          attachments: true,
        },
      }
    );

    return messages.reverse();
  },

  async createMessage({
    chat,
    authorId,
    body,
    attachments,
  }: {
    chat: ChatEntity;
    authorId: number;
    body: string;
    attachments?: number[];
  }) {
    const now = new Date();
    const messageData: any = {
      chat: chat.id,
      author: authorId,
      body,
      sent_at: now,
    };

    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    const created = await strapi.entityService.create(
      "api::chat-message.chat-message",
      {
        data: messageData,
        populate: {
          author: {
            fields: ["id", "username", "full_name"],
            populate: { avatar: true, developer_profile: true },
          },
          attachments: true,
        },
      }
    );

    await strapi.entityService.update("api::chat.chat", chat.id, {
      data: { last_message_at: now },
    });

    return created;
  },

  ensureParticipant,
}));
