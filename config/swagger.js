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
    // Rutas de autenticación
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
    '/auth/refresh-token': {
      post: {
        summary: 'Refrescar token de acceso',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Token refrescado correctamente'
          }
        }
      }
    },

    // Rutas de juego
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
    },
    '/games/join': {
      post: {
        summary: 'Unirse a una partida usando código',
        tags: ['Juegos'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: {
                    type: 'string',
                    example: 'ABC123'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Te has unido a la partida correctamente'
          }
        }
      }
    },
    '/games/{gameId}': {
      get: {
        summary: 'Obtener información de una partida por ID',
        tags: ['Juegos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'gameId',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Información de la partida'
          }
        }
      }
    },
    '/games/{gameId}/end': {
      put: {
        summary: 'Finalizar una partida',
        tags: ['Juegos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'gameId',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['winnerId'],
                properties: {
                  winnerId: {
                    type: 'integer'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Partida finalizada correctamente'
          }
        }
      }
    },
    '/games/{gameId}/state': {
      get: {
        summary: 'Obtener estado completo de una partida',
        tags: ['Juegos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'gameId',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Estado completo de la partida'
          }
        }
      }
    },

    // Rutas de dados
    '/dice/roll': {
      get: {
        summary: 'Obtener un dado basado en probabilidades',
        tags: ['Dados'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dado generado correctamente'
          }
        }
      }
    },
    '/dice/probabilities': {
      get: {
        summary: 'Obtener probabilidades actuales del usuario',
        tags: ['Dados'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Probabilidades obtenidas correctamente'
          }
        }
      },
      put: {
        summary: 'Actualizar probabilidades del usuario',
        tags: ['Dados'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dice_1', 'dice_2', 'dice_3', 'dice_4', 'dice_5', 'dice_6'],
                properties: {
                  dice_1: { type: 'number', minimum: 0 },
                  dice_2: { type: 'number', minimum: 0 },
                  dice_3: { type: 'number', minimum: 0 },
                  dice_4: { type: 'number', minimum: 0 },
                  dice_5: { type: 'number', minimum: 0 },
                  dice_6: { type: 'number', minimum: 0 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Probabilidades actualizadas correctamente'
          }
        }
      }
    },

    // Rutas de jugadas
    '/games/{gameId}/plays': {
      get: {
        summary: 'Obtener todas las jugadas de una partida',
        tags: ['Jugadas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'gameId',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de jugadas de la partida'
          }
        }
      }
    },
    '/games/{gameId}/play': {
      post: {
        summary: 'Registrar una jugada',
        tags: ['Jugadas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'gameId',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['column'],
                properties: {
                  column: {
                    type: 'string',
                    enum: ['1', '2', '3', '4', '5', '6'],
                    description: 'Columna donde colocar el dado'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Jugada registrada correctamente'
          }
        }
      }
    }
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
