module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    const sold = await strapi.db.query('api::order-item.order-item').count({
      where: { product: data.product }
    });
    const product = await strapi.entityService.findOne('api::product.product', data.product, { fields: ['max_sales_count'] });
    if (sold + data.quantity > product.max_sales_count) {
      throw new Error('Превышено максимальное количество продаж этого продукта');
    }
  }
};
