// Definición directa sin usar swagger-jsdoc
const swaggerSpec = {
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
  paths: {
    '/auth/register': {
      post: {
        summary: 'Registrar un nuevo usuario',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    example: 'jugador1'
                  },
                  password: {
                    type: 'string',
                    example: 'contraseña123'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Usuario registrado correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success'
                    },
                    message: {
                      type: 'string',
                      example: 'Usuario registrado correctamente'
                    },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          $ref: '#/components/schemas/User'
                        },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: {
                              type: 'string'
                            },
                            refreshToken: {
                              type: 'string'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Iniciar sesión',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    example: 'jugador1'
                  },
                  password: {
                    type: 'string',
                    example: 'contraseña123'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Inicio de sesión exitoso'
          }
        }
      }
    },
    '/games': {
      post: {
        summary: 'Crear una nueva partida',
        tags: ['Juegos'],
        security: [{ bearerAuth: [] }],
        responses: {
          '201': {
            description: 'Partida creada correctamente'
          }
        }
      }
    }
    // Aquí irían el resto de las rutas...
  },
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
      }
    }
  }
};

module.exports = swaggerSpec;