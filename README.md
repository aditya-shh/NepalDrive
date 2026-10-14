# 🚙 NepalDrive | Premium Vehicle Rental Platform in Nepal

**NepalDrive** is a production-grade, full-stack vehicle hiring and expedition platform engineered specifically for the rugged terrains, diverse climates, and regulatory standards of Nepal. Built with the **PERN stack** (PostgreSQL, Express.js, React, Node.js) and **TypeScript**, NepalDrive offers a robust rental ecosystem featuring 4x4 SUVs, high-altitude mountain Jeeps, electric vehicles (EVs), and touring bikes.

---

## 🌟 Key Features & Capabilities

### 1. 🛡️ Secure KYC & Document Upload System
*   **Identity Document Uploads:** Secure uploads for citizenship certificates (front and back), government driving licenses, and passports (JPEG, PNG, WEBP, PDF up to 10MB).
*   **Live Status & Preview:** Instant file preview, upload metadata tracking, and real-time verification status badges (**Pending**, **Approved**, **Rejected**).
*   **Owner Rejection & Re-upload:** If a document is rejected by the fleet owner with a stated reason, renters can easily re-upload corrected documents.

### 2. 👑 Fleet Owner Verification Dashboard
*   **Centralized Review Console:** Fleet owners can inspect customer identity documents, driving licenses, and payment receipts before approving or rejecting rental requests.
*   **Secure Document Previews:** Private storage backed by short-lived signed access tokens and secure inspection modals (`DocumentPreviewModal`).
*   **Audit Logging:** Every verification action, approval, and rejection is recorded in `document_verification_history` and `audit_logs`.

### 3. 📜 Original ID Document Retention & Rental Policy
*   **No Collateral Surrender:** Enforces compliance with Nepalese privacy and transport laws—renters retain their original citizenship certificates in their personal possession.
*   **Physical Custody Handover Records:** Station staff can document physical inspection or temporary station custody/returns via `document_custody_records`.
*   **Mandatory Checkout Confirmations:** Checkboxes during booking confirmation acknowledging identity ownership, original document retention, and rental terms.

### 4. 🏍️ Comprehensive 27-Vehicle Himalayan Fleet
*   **Diverse Options:** From Toyota Land Cruisers, Ford Raptors, and Mahindra Scorpios to Royal Enfield Himalayans and Hyundai Kona EVs.
*   **Strict Booking Privacy:** Rented vehicles are automatically removed from public availability so no two users can book the same vehicle simultaneously.

### 5. 💳 Secure QR Payment & Transactional Email
*   **Digital Wallets & QR:** Integrated support for Nepal Fonepay/eSewa QR code scanning, Khalti, eSewa, and Office Counter payments.
*   **Resend Transactional Email:** Automated email notifications for contact inquiries, booking confirmations, and password resets dispatched securely via Resend to `aditya.shh15@gmail.com`.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite, TS), Tailwind CSS v4, Lucide Icons, Motion animations.
*   **Backend**: Node.js, Express.js, TypeScript, JWT Authentication, Bcrypt.js, Multer.
*   **Database**: Neon PostgreSQL connection pooling with automated schema migration & in-memory fallback.
*   **Email Engine**: Resend API integration.
*   **Containerization**: Docker, Docker Compose.

---

## 📂 Project Architecture

```
/
├── dist/                  # Built frontend static assets (production)
├── docs/                  # Architecture & SEO documentation
├── server.ts              # Full-stack Node/Express server entry
├── src/
│   ├── assets/images/     # Authentic vehicle photography assets
│   ├── components/        # Reusable UI components & modals
│   ├── db/
│   │   └── index.ts       # Neon PostgreSQL connection pool & mock DB fallback
│   ├── pages/             # All visual pages (Home, Fleet, VehicleDetail, Admin, Account)
│   ├── services/
│   │   └── api.ts         # Centralized API fetch layers
│   ├── store/
│   │   └── AuthContext.tsx# Secure React context & auth state
│   └── utils/             # SEO crawlers and audit utilities
├── Dockerfile             # Production container specs
├── docker-compose.yml     # Multi-container orchestration
└── package.json           # Dependencies & build scripts
```

---

## 💻 Local Development Setup

### 1. Prerequisites
*   Node.js (v20 or v22 recommended)
*   PostgreSQL / Neon PostgreSQL connection string (optional: app runs on high-fidelity mock memory if omitted)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```
Key environment variables:
* `DATABASE_URL`: Your pooled Neon PostgreSQL connection string (`?sslmode=require`).
* `JWT_SECRET`: A strong secret key used for signing JWT authentication tokens. Generate using `openssl rand -hex 32`.
* `ADMIN_EMAIL`: Fleet Owner & Administrator email address.
* `ADMIN_PASSWORD`: Administrator password (required for initial provisioning or password rotation).
* `RESEND_API_KEY`: API key from resend.com for transactional emails.
* `APP_URL`: Public website URL (e.g. `https://nepaldrive-three.vercel.app` or `http://localhost:3000`).

### 4. Run Development Server
```bash
npm run dev
```
*   **Web App**: `http://localhost:3000`
*   **REST API**: `http://localhost:3000/api/v1`

### 5. Build and Run for Production
```bash
npm run build
npm run start
```

### 6. Run via Docker
```bash
docker-compose up --build
```

---

## 🧪 Testing & Quality Control

To verify TypeScript compile safety and build integrity:
```bash
npm run lint
npm run build
```

---

## 🔒 Security & Administrator Configuration

NepalDrive enforces role-based access control (RBAC). Static default credentials are strictly prohibited in production.

### Initial Administrator Setup & Rotation

1. **Environment Variables**: Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your hosting platform (e.g. Vercel Project Settings &rarr; Environment Variables).
2. **Credential Rotation Requirement**:
   - If any placeholder or example passwords were used previously, immediately rotate the administrator password in production using the "Forgot Password" feature or by setting `ADMIN_PASSWORD` in Vercel.
   - Rotate `JWT_SECRET` whenever secrets may have been exposed. Rotating `JWT_SECRET` invalidates all existing user tokens immediately.
3. **Database Security**: Never expose `DATABASE_URL` to frontend client bundles. All queries run exclusively server-side via Express.
