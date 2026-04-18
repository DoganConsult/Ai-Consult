import type { ProductPlugin } from '@dogan/kernel';
import notesModule from './modules/notes.js';

const plugin: ProductPlugin = async (app, ctx) => {
  app.get('/health', async () => ({
    product: ctx.product.id,
    version: ctx.product.version,
    status: 'ok',
  }));

  await app.register(
    async (instance) => {
      await notesModule(instance, {
        product: ctx.product,
        module: {
          id: 'consult.notes',
          product: ctx.product.id,
          version: '0.1.0',
          kernel: { requires: ctx.product.kernel.requires },
          caps: ['db', 'authz'],
          routes: { prefix: '/notes' },
          db: { schema: 'product_consult' },
        },
        services: ctx.services,
      });
    },
    { prefix: '/notes' },
  );
};

export default plugin;
