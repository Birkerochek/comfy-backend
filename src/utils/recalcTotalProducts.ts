import type { Core } from '@strapi/strapi';

export async function recalcTotalProducts(strapi: Core.Strapi, userId?: number | string) {
  if (!userId) return;

  const count = await strapi.entityService.count('api::product.product', {
    filters: { developer: { id: userId } },
  });

  const [profile] = await strapi.entityService.findMany('api::developer-profile.developer-profile', {
    filters: { user: { id: userId } },
    fields: ['id'],
  });

  if (profile?.id) {
    await strapi.entityService.update('api::developer-profile.developer-profile', profile.id, {
      data: { total_products: count },
    });
  }
}
