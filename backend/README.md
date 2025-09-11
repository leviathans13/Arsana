# Arsana Backend - Digital Document Archive System

A robust, scalable backend API for managing digital document archives with advanced features including letter management, notifications, calendar integration, and comprehensive security measures.

## 🚀 Features

### Core Functionality
- **User Management**: Authentication, authorization, and role-based access control
- **Letter Management**: Incoming and outgoing letter processing with file attachments
- **Notification System**: Real-time notifications with email integration
- **Calendar Integration**: Event management and scheduling
- **File Management**: Secure file upload, validation, and storage

### Advanced Features
- **Database Connection Pooling**: Optimized database connections with Prisma
- **Caching Layer**: Redis-compatible caching for improved performance
- **Rate Limiting**: Multi-tier rate limiting with user and endpoint-specific limits
- **Input Validation**: Comprehensive validation and sanitization with Zod
- **Error Handling**: Custom error classes with detailed error responses
- **Logging & Monitoring**: Request logging, performance monitoring, and metrics
- **File Security**: File validation, virus scanning, and secure storage
- **API Documentation**: Complete OpenAPI/Swagger documentation
- **Transaction Management**: Database transactions for complex operations
- **Pagination**: Advanced pagination with filtering and sorting

## 🛠️ Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Validation**: Zod schema validation
- **Caching**: Node-cache (Redis-compatible)
- **File Upload**: Multer with security validation
- **Documentation**: Swagger/OpenAPI 3.0
- **Monitoring**: Custom logging and metrics
- **Security**: Helmet, CORS, rate limiting

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run database migrations
   npm run prisma:migrate
   
   # (Optional) Seed the database
   npm run prisma:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host | Optional |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | Optional |
| `SMTP_PASS` | SMTP password | Optional |

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3001/api-docs`
- **OpenAPI JSON**: `http://localhost:3001/api-docs.json`

## 🏗️ Project Structure

```
src/
├── config/                 # Configuration files
│   ├── database.ts        # Database connection management
│   └── swagger.ts         # API documentation setup
├── controllers/           # Request handlers
│   ├── auth.controller.ts
│   ├── incomingLetter.controller.ts
│   └── ...
├── middleware/            # Express middleware
│   ├── auth.ts           # Authentication middleware
│   ├── errorHandler.ts   # Error handling
│   ├── logging.ts        # Request logging
│   └── rateLimiting.ts   # Rate limiting
├── routes/               # API routes
│   ├── auth.routes.ts
│   ├── incomingLetter.routes.ts
│   └── ...
├── services/             # Business logic services
│   └── cronService.ts    # Scheduled tasks
├── utils/                # Utility functions
│   ├── auth.ts          # Authentication utilities
│   ├── cache.ts         # Caching utilities
│   ├── errors.ts        # Custom error classes
│   ├── fileUpload.ts    # File upload utilities
│   ├── pagination.ts    # Pagination utilities
│   ├── transactions.ts  # Database transactions
│   └── validation.ts    # Input validation
└── app.ts               # Application entry point
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, STAFF)
- Password hashing with bcrypt
- Token expiration and refresh

### Input Validation & Sanitization
- Zod schema validation
- DOMPurify for XSS prevention
- File type and size validation
- SQL injection prevention with Prisma

### Rate Limiting
- IP-based rate limiting
- User-specific rate limiting
- Endpoint-specific limits
- Admin bypass capabilities

### File Security
- File type validation
- File size limits
- Basic virus scanning
- Secure file storage
- Orphaned file cleanup

## 📊 Monitoring & Logging

### Request Logging
- Request/response logging
- Performance monitoring
- Error tracking
- User activity logging

### Metrics
- Request counts by status
- Response time analytics
- Error rates
- User activity metrics

### Health Checks
- Database connectivity
- Service status
- Memory usage
- Uptime tracking

## 🚀 Performance Optimizations

### Caching
- In-memory caching with node-cache
- Cache warming on startup
- Intelligent cache invalidation
- Cache statistics and monitoring

### Database
- Connection pooling
- Query optimization
- Transaction management
- Pagination for large datasets

### File Handling
- Efficient file upload processing
- Background file cleanup
- Optimized file storage

## 🔄 Background Jobs

### Cron Jobs
- Event reminder notifications
- Overdue invitation checks
- Weekly summary reports
- System maintenance tasks

### File Management
- Orphaned file cleanup
- File integrity checks
- Storage optimization

## 📈 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Incoming Letters
- `GET /api/incoming-letters` - List incoming letters
- `POST /api/incoming-letters` - Create incoming letter
- `GET /api/incoming-letters/:id` - Get letter by ID
- `PUT /api/incoming-letters/:id` - Update letter
- `DELETE /api/incoming-letters/:id` - Delete letter

### Outgoing Letters
- `GET /api/outgoing-letters` - List outgoing letters
- `POST /api/outgoing-letters` - Create outgoing letter
- `GET /api/outgoing-letters/:id` - Get letter by ID
- `PUT /api/outgoing-letters/:id` - Update letter
- `DELETE /api/outgoing-letters/:id` - Delete letter

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### System
- `GET /api/health` - Health check
- `GET /api/metrics` - System metrics
- `GET /api/rate-limit/status` - Rate limit status

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t arsana-backend .

# Run container
docker run -p 3001:3001 arsana-backend
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Configure production database URL
- Set secure JWT secret
- Configure SMTP settings
- Set up monitoring and logging

## 🔧 Development

### Code Style
- ESLint for code linting
- Prettier for code formatting
- TypeScript strict mode
- Consistent naming conventions

### Git Workflow
- Feature branches
- Pull request reviews
- Automated testing
- Code quality checks

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the logs for error details

## 🔄 Changelog

### v1.0.0
- Initial release with core functionality
- User management and authentication
- Letter management system
- Notification system
- Calendar integration
- File upload and management
- API documentation
- Security features
- Performance optimizations