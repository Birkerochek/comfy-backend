import type { Schema, Struct } from '@strapi/strapi';

export interface ProductAbilities extends Struct.ComponentSchema {
  collectionName: 'components_product_abilities';
  info: {
    displayName: 'abilities';
    icon: 'code';
  };
  attributes: {
    title: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
        minLength: 2;
      }>;
  };
}

export interface ProductIncluded extends Struct.ComponentSchema {
  collectionName: 'components_product_includeds';
  info: {
    displayName: 'included';
    icon: 'feather';
  };
  attributes: {
    title: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
        minLength: 2;
      }>;
  };
}

export interface ProductMediaItem extends Struct.ComponentSchema {
  collectionName: 'components_product_media_items';
  info: {
    description: '\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u0438\u043B\u0438 \u0432\u0438\u0434\u0435\u043E \u0434\u043B\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430';
    displayName: 'MediaItem';
  };
  attributes: {
    media: Schema.Attribute.Media<'images' | 'videos', true> &
      Schema.Attribute.Required;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    type: Schema.Attribute.Enumeration<['screenshot', 'thumbnail', 'preview']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'screenshot'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'product.abilities': ProductAbilities;
      'product.included': ProductIncluded;
      'product.media-item': ProductMediaItem;
    }
  }
}
