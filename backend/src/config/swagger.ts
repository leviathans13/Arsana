import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arsana Digital Document Archive API',
      version: '1.0.0',
      description: 'A comprehensive API for managing digital document archives with letter management, notifications, and calendar features.',
      contact: {
        name: 'API Support',
        email: 'support@arsana.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.arsana.com' 
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'role'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: 'clh1234567890abcdef',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'STAFF'],
              description: 'User role',
              example: 'STAFF',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        IncomingLetter: {
          type: 'object',
          required: ['id', 'letterNumber', 'subject', 'sender', 'receivedDate', 'category'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique letter identifier',
              example: 'clh1234567890abcdef',
            },
            letterNumber: {
              type: 'string',
              description: 'Letter reference number',
              example: 'IN-2024-001',
            },
            subject: {
              type: 'string',
              description: 'Letter subject',
              example: 'Meeting Invitation',
            },
            sender: {
              type: 'string',
              description: 'Letter sender',
              example: 'Ministry of Education',
            },
            receivedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when letter was received',
            },
            category: {
              type: 'string',
              enum: ['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT'],
              description: 'Letter category',
              example: 'INVITATION',
            },
            description: {
              type: 'string',
              description: 'Letter description',
              example: 'Invitation to attend the annual conference',
            },
            fileName: {
              type: 'string',
              description: 'Uploaded file name',
              example: 'invitation.pdf',
            },
            filePath: {
              type: 'string',
              description: 'File storage path',
              example: '/uploads/invitation-123456.pdf',
            },
            isInvitation: {
              type: 'boolean',
              description: 'Whether this is an invitation letter',
              example: true,
            },
            eventDate: {
              type: 'string',
              format: 'date-time',
              description: 'Event date for invitation letters',
            },
            eventLocation: {
              type: 'string',
              description: 'Event location for invitation letters',
              example: 'Convention Center, Room A',
            },
            userId: {
              type: 'string',
              description: 'ID of user who created this letter',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Letter creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Letter last update timestamp',
            },
          },
        },
        OutgoingLetter: {
          type: 'object',
          required: ['id', 'letterNumber', 'subject', 'recipient', 'sentDate', 'category'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique letter identifier',
              example: 'clh1234567890abcdef',
            },
            letterNumber: {
              type: 'string',
              description: 'Letter reference number',
              example: 'OUT-2024-001',
            },
            subject: {
              type: 'string',
              description: 'Letter subject',
              example: 'Response to Inquiry',
            },
            recipient: {
              type: 'string',
              description: 'Letter recipient',
              example: 'Ministry of Education',
            },
            sentDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when letter was sent',
            },
            category: {
              type: 'string',
              enum: ['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT'],
              description: 'Letter category',
              example: 'OFFICIAL',
            },
            description: {
              type: 'string',
              description: 'Letter description',
              example: 'Response to the inquiry about project status',
            },
            fileName: {
              type: 'string',
              description: 'Uploaded file name',
              example: 'response.pdf',
            },
            filePath: {
              type: 'string',
              description: 'File storage path',
              example: '/uploads/response-123456.pdf',
            },
            isInvitation: {
              type: 'boolean',
              description: 'Whether this is an invitation letter',
              example: false,
            },
            eventDate: {
              type: 'string',
              format: 'date-time',
              description: 'Event date for invitation letters',
            },
            eventLocation: {
              type: 'string',
              description: 'Event location for invitation letters',
              example: 'Conference Room B',
            },
            userId: {
              type: 'string',
              description: 'ID of user who created this letter',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Letter creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Letter last update timestamp',
            },
          },
        },
        Notification: {
          type: 'object',
          required: ['id', 'title', 'message', 'type'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique notification identifier',
              example: 'clh1234567890abcdef',
            },
            title: {
              type: 'string',
              description: 'Notification title',
              example: 'New Letter Received',
            },
            message: {
              type: 'string',
              description: 'Notification message',
              example: 'A new incoming letter has been added to the system',
            },
            type: {
              type: 'string',
              enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'],
              description: 'Notification type',
              example: 'INFO',
            },
            isRead: {
              type: 'boolean',
              description: 'Whether notification has been read',
              example: false,
            },
            userId: {
              type: 'string',
              description: 'ID of user this notification belongs to (null for system-wide notifications)',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Notification creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Notification last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Resource not found',
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'NOT_FOUND_ERROR',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format',
                  },
                },
              },
              description: 'Detailed error information',
            },
          },
        },
        Pagination: {
          type: 'object',
          required: ['current', 'limit', 'total', 'pages'],
          properties: {
            current: {
              type: 'integer',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page',
              example: 10,
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 100,
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 10,
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page',
              example: true,
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page',
              example: false,
            },
            nextPage: {
              type: 'integer',
              description: 'Next page number (if available)',
              example: 2,
            },
            prevPage: {
              type: 'integer',
              description: 'Previous page number (if available)',
              example: null,
            },
          },
        },
        AuthResponse: {
          type: 'object',
          required: ['token', 'user'],
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          required: ['status', 'timestamp'],
          properties: {
            status: {
              type: 'string',
              description: 'Service status',
              example: 'OK',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Current timestamp',
            },
            environment: {
              type: 'string',
              description: 'Current environment',
              example: 'development',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Access token is required',
                code: 'AUTHENTICATION_ERROR',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Insufficient permissions',
                code: 'AUTHORIZATION_ERROR',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Resource not found',
                code: 'NOT_FOUND_ERROR',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Validation failed',
                details: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                ],
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Too many requests from this IP',
                code: 'RATE_LIMIT_ERROR',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Incoming Letters',
        description: 'Incoming letter management',
      },
      {
        name: 'Outgoing Letters',
        description: 'Outgoing letter management',
      },
      {
        name: 'Notifications',
        description: 'Notification management',
      },
      {
        name: 'Calendar',
        description: 'Calendar and event management',
      },
      {
        name: 'System',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Arsana API Documentation',
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;