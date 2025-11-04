module.exports = {
  async afterCreate(event) { await recalc(event.result.developer.id); },
  async afterUpdate(event) { await recalc(event.result.developer.id); },
  async afterDelete(event) { await recalc(event.result.developer.id); },
};

async function recalc(developerId) {
  const reviews = await strapi.entityService.findMany('api::developer-review.developer-review', {
    filters: { developer: developerId },
    fields: ['rating']
  });
  const total_reviews = reviews.length;
  const rating = total_reviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews
    : 0;
  await strapi.entityService.update('api::developer-profile.developer-profile', developerId, {
    data: { rating: parseFloat(rating.toFixed(2)), total_reviews }
  });
}
