# Arsana - Digital Document Archive System

Arsana adalah sistem arsip surat digital yang menggantikan spreadsheet manual. Sistem ini dibangun dengan Node.js + TypeScript untuk backend dan Next.js + TypeScript untuk frontend.

## Fitur Utama

- 🔐 **Autentikasi JWT** dengan peran berbasis (Admin/Staf)
- 📄 **CRUD Surat Masuk/Keluar** dengan subkategori dan unggah file
- 📅 **Kalender Otomatis** dari undangan
- 🔔 **Notifikasi** melalui cron jobs
- 🎨 **Interface Modern** dengan Tailwind CSS
- 📱 **Responsif** untuk desktop dan mobile

## Teknologi yang Digunakan

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL + Prisma ORM
- JWT untuk autentikasi
- Multer untuk upload file
- Node-cron untuk scheduled tasks
- Nodemailer untuk email notifications

### Frontend
- Next.js + TypeScript
- Tailwind CSS
- Axios untuk API calls
- React Hook Form
- React Query untuk state management
- React Hot Toast untuk notifications

## Instalasi dan Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd Arsana
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Buat file `.env` dari `.env.example`:
```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan konfigurasi:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/arsana_db"
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads

# Email configuration for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Setup database dengan Prisma:
```bash
npx prisma migrate dev
npx prisma generate
```

Jalankan backend:
```bash
npm run dev
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Pastikan file `.env.local` sudah sesuai:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Jalankan frontend:
```bash
npm run dev
```

### 4. Setup Database PostgreSQL

Pastikan PostgreSQL sudah terinstall dan running, kemudian buat database:
```sql
CREATE DATABASE arsana_db;
```

### 5. Menjalankan Seluruh Aplikasi

Dari root directory:
```bash
npm install
npm run dev
```

## Struktur Project

```
arsana/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── app.ts           # Main application file
│   ├── prisma/              # Database schema
│   └── uploads/             # Uploaded files
├── frontend/                # Frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities and API client
│   │   ├── pages/           # Next.js pages
│   │   ├── styles/          # CSS styles
│   │   └── types/           # TypeScript types
│   └── public/              # Static files
└── package.json             # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users (Admin only)

### Incoming Letters
- `GET /api/incoming-letters` - Get all incoming letters
- `GET /api/incoming-letters/:id` - Get single incoming letter
- `POST /api/incoming-letters` - Create new incoming letter
- `PUT /api/incoming-letters/:id` - Update incoming letter
- `DELETE /api/incoming-letters/:id` - Delete incoming letter

### Outgoing Letters
- `GET /api/outgoing-letters` - Get all outgoing letters
- `GET /api/outgoing-letters/:id` - Get single outgoing letter
- `POST /api/outgoing-letters` - Create new outgoing letter
- `PUT /api/outgoing-letters/:id` - Update outgoing letter
- `DELETE /api/outgoing-letters/:id` - Delete outgoing letter

### Calendar
- `GET /api/calendar/events` - Get calendar events
- `GET /api/calendar/upcoming` - Get upcoming events

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

## Default Login

Setelah setup, Anda dapat mendaftar user baru melalui halaman `/auth/register` atau membuat user langsung di database.

## Development

### Backend Development
```bash
cd backend
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

## Deployment

### Environment Variables untuk Production
Pastikan semua environment variables sudah diset dengan benar untuk production, terutama:
- `NODE_ENV=production`
- `DATABASE_URL` dengan connection string production
- `JWT_SECRET` dengan secret key yang aman
- Email SMTP configuration untuk notifications

### Database Migration
```bash
cd backend
npx prisma migrate deploy
```

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

Distributed under the MIT License.