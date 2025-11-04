import type { Event } from "@strapi/database/dist/lifecycles";
import type { Core } from "@strapi/strapi";
import { recalcTotalProducts } from "../../../../utils/recalcTotalProducts";

declare const strapi: Core.Strapi;

async function fetchDevId(productId: number) {
  const p = (await strapi.entityService.findOne(
    "api::product.product",
    productId,
    {
      populate: { developer: { fields: ["id"] } },
    }
  )) as any;
  return p?.developer?.id ?? null;
}

export default {
  async beforeDelete(event: Event) {
    const id = (event.params as any)?.where?.id;
    (event as any).state = {
      ...(event as any).state,
      devIdToRecalc: await fetchDevId(id),
    };
  },

  async afterDelete(event: Event) {
    await recalcTotalProducts(strapi, (event as any).state?.devIdToRecalc);
  },

  async beforeCreate(event: Event) {
    // Логика итоговой цены при создании продукта
    const data = event.params.data as Partial<{
      price_base: number;
      discount: number;
      price: number;
    }>;
    const base = Number(data.price_base ?? 0);
    const disc = Number(data.discount ?? 0);

    // Если есть скидка, применяем её к базовой цене, иначе используем базовую цену
    data.price = disc > 0 ? Math.round((base * (100 - disc)) / 100) : base;
  },

  async afterCreate(event: Event) {
    const id = (event.result as any)?.id;
    await recalcTotalProducts(strapi, await fetchDevId(id));
  },

  async beforeUpdate(event: Event) {
    // Логика итоговой цены: если есть скидка, то price = price_base со скидкой, иначе price = price_base
    const data = event.params.data as Partial<{
      price_base: number;
      discount: number;
      price: number;
    }>;
    const existing = (event.result ?? {}) as {
      price_base?: number;
      discount?: number;
    };
    const base = Number(data.price_base ?? existing.price_base ?? 0);
    const disc = Number(data.discount ?? existing.discount ?? 0);

    // Если есть скидка, применяем её к базовой цене, иначе используем базовую цену
    data.price = disc > 0 ? Math.round((base * (100 - disc)) / 100) : base;

    const id = (event.params as any)?.where?.id;
    (event as any).state = {
      ...(event as any).state,
      prevDevId: await fetchDevId(id),
    };
  },

  async afterUpdate(event: Event) {
    const id = (event.params as any)?.where?.id ?? (event.result as any)?.id;
    const prevDevId = (event as any).state?.prevDevId ?? null;
    const newDevId = await fetchDevId(id);

    const ids = new Set(
      [prevDevId, newDevId].filter(Boolean) as (number | string)[]
    );
    for (const devId of ids) await recalcTotalProducts(strapi, devId);
  },
};
