import { Server } from "@hapi/hapi";

export const staticRoutesWithoutAuth = (server: Server) => {
  server.route([
    {
      method: 'GET',
      path: '/',
      options: {
        auth: false,
        description: 'Just a sanity check',
        tags: ['api']
      },
      handler: async () => {
        return 'Server is successfully running - please use one of the API endpoints';
      }
    },
    {
      method: 'GET',
      path: '/health',
      options: {
        auth: false,
        description: 'Health check',
        tags: ['api', 'health']
      },
      handler: async (request, h) => {
        return h.response({ status: 'UP' });
      }
    }
  ])
};