const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Matatena API',
    version: '1.0.0',
    description: 'API REST para el juego Matatena con autenticación JWT y WebSockets',
    contact: {
      name: 'API Support',
      email: 'support@matatena.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Servidor de desarrollo'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del usuario'
          },
          username: {
            type: 'string',
            description: 'Nombre de usuario'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación del usuario'
          }
        }
      },
      Game: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único de la partida (UUID)'
          },
          host_user: {
            type: 'integer',
            description: 'ID del usuario anfitrión'
          },
          guest_user: {
            type: 'integer',
            description: 'ID del usuario invitado'
          },
          winner: {
            type: 'integer',
            description: 'ID del usuario ganador'
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de inicio de la partida'
          },
          ended_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de finalización de la partida'
          }
        }
      },
      Play: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único de la jugada (UUID)'
          },
          match_id: {
            type: 'string',
            description: 'ID de la partida'
          },
          move: {
            type: 'integer',
            description: 'ID del usuario que hizo la jugada'
          },
          dice: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
            description: 'Valor del dado (1-6)'
          },
          column: {
            type: 'integer',
            minimum: 0,
            maximum: 2,
            description: 'Columna donde se coloca el dado (0-2)'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error'
          },
          statusCode: {
            type: 'integer',
            example: 400
          },
          message: {
            type: 'string',
            example: 'Mensaje de error'
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success'
          },
          message: {
            type: 'string',
            example: 'Operación exitosa'
          },
          data: {
            type: 'object',
            description: 'Datos de respuesta'
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Rutas donde están las anotaciones de Swagger
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;