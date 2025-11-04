/**
 * cart-item router
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/cart-items",
      handler: "cart-item.create",
    },
    {
      method: "GET",
      path: "/cart-items",
      handler: "cart-item.find",
    },
    {
      method: "GET",
      path: "/cart-items/:id",
      handler: "cart-item.findOne",
    },
    {
      method: "PUT",
      path: "/cart-items/:id",
      handler: "cart-item.update",
    },
    {
      method: "DELETE",
      path: "/cart-items/:id",
      handler: "cart-item.delete",
    },
  ],
};
