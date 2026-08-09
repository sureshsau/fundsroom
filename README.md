# 🏬 Full-Stack Enterprise Mini ERP & CRM Operations Portal

A production-grade, transaction-safe **Mini ERP & CRM Operations Portal** engineered for wholesale, distribution, and supply chain businesses. 

Designed with modern full-stack architecture, this platform guarantees transactional safety under high concurrency, granular Role-Based Access Control (RBAC), real-time event notifications via Socket.IO, resilient background job processing with Redis and BullMQ, and comprehensive audit compliance logging.

---

## 📋 Table of Contents
1. [Quick Start & Local Setup](#-quick-start--local-setup)
2. [Docker Deployment](#-docker-deployment)
3. [System Architecture & Design](#-system-architecture--design)
4. [Transaction Safety & Data Consistency](#-transaction-safety--data-consistency)
5. [Database Design & ERD Specifications](#-database-design--erd-specifications)
6. [Data Flow Diagrams (DFD)](#-data-flow-diagrams-dfd)
   - [DFD Level 0 — Context Diagram](#dfd-level-0--context-diagram)
   - [DFD Level 1 — System Process Decomposition](#dfd-level-1--system-process-decomposition)
   - [DFD Level 2 — Detailed Sub-Process Diagrams](#dfd-level-2--detailed-sub-process-diagrams)
7. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
8. [API Endpoint Catalog](#-api-endpoint-catalog)
9. [Tech Stack Specifications](#-tech-stack-specifications)

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.x or later
- **PostgreSQL**: v14.x or later
- **Redis**: v6.x or later (Optional; fallback available if Redis is offline)

### 1. Environment Configuration

Copy environment template files in both subdirectories:

**Backend Setup (`backend/.env`)**:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minierp?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
REDIS_HOST="localhost"
REDIS_PORT=6379
CLIENT_URL="http://localhost:5173"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-pass"
```

**Frontend Setup (`frontend/.env`)**:
```env
VITE_API_BASE_URL="http://localhost:5000/api"
VITE_SOCKET_URL="http://localhost:5000"
```

### 2. Backend Initialization
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

### 🔑 Pre-Seeded Default Test Accounts

| Role | Email | Password | Primary Capability |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin-sureshsau631@gmail.com` | `Admin@123` | System config, user administration, audit logs |
| **Sales** | `sales-sureshsau403@gmail.com` | `Sales@123` | Lead management, draft challan creation |
| **Warehouse** | `wirehouse-sureshsau7586@gmail.com` or `sureshsau7586@gmail.com` | `Warehouse@123` | Stock-in, catalog management, inventory logs |
| **Accounts** | `accounts@example.com` | `Accounts@123` | Financial confirmation, challan cancellation |

---

## 🐳 Docker Deployment

The entire stack (PostgreSQL + Redis + Express Backend + Nginx Frontend) can be started with a single command:

```bash
docker-compose up --build -d
```

- **Frontend Portal**: `http://localhost`
- **Backend API**: `http://localhost:5000/api`
- **Swagger Documentation**: `http://localhost:5000/api-docs`

---

## 🏗️ System Architecture & Design

The platform adopts a **Monolithic Modular Architecture** combining a React + TypeScript single-page client with an Express + TypeScript application server. Real-time notifications and asynchronous email worker processes run in tandem alongside PostgreSQL transactional persistence.

```mermaid
graph TD
    subgraph Client Layer
        UI["React 18 SPA (Vite + TS + Tailwind)"]
        SocketClient["Socket.IO Web Client"]
    end

    subgraph API Gateway & Security Layer
        Helmet["Helmet Security & CORS"]
        AuthMiddleware["JWT Authentication Middleware"]
        RBACGuard["RBAC Permission Guard"]
        ZodValidator["Zod Schema Validator"]
    end

    subgraph Core Modular Logic Engine
        AuthMod["Auth & OTP Module"]
        CustMod["Customer & Lead Module"]
        FollowMod["Follow-Up Module"]
        ProdMod["Product & StockType Module"]
        InvMod["Inventory Movement Module"]
        ChallanMod["Sales Challan Engine"]
        NotifMod["Notification System"]
        AuditMod["Audit Logging Engine"]
        DashMod["Analytics Dashboard"]
    end

    subgraph Messaging & Async Worker Infrastructure
        SocketServer["Socket.IO Server Engine"]
        BullQueue["BullMQ / Redis Job Queue"]
        MailService["Nodemailer SMTP Dispatcher"]
    end

    subgraph Persistence Layer
        PrismaORM["Prisma ORM v6"]
        PostgreSQL[("PostgreSQL Database")]
        RedisDB[("Redis In-Memory Data Store")]
    end

    UI -->|HTTPS / REST API| Helmet
    UI <-->|WebSocket Connection| SocketServer
    Helmet --> AuthMiddleware
    AuthMiddleware --> RBACGuard
    RBACGuard --> ZodValidator

    ZodValidator --> AuthMod
    ZodValidator --> CustMod
    ZodValidator --> FollowMod
    ZodValidator --> ProdMod
    ZodValidator --> InvMod
    ZodValidator --> ChallanMod
    ZodValidator --> NotifMod
    ZodValidator --> AuditMod
    ZodValidator --> DashMod

    ChallanMod -->|Serializable Transaction| PrismaORM
    InvMod -->|Atomic Update| PrismaORM
    CustMod -->|CRUD| PrismaORM
    AuthMod -->|CRUD| PrismaORM
    
    PrismaORM <--> PostgreSQL

    ChallanMod -->|Dispatch Event| SocketServer
    InvMod -->|Dispatch Event| SocketServer
    ChallanMod -->|Queue Email Job| BullQueue
    BullQueue <--> RedisDB
    BullQueue -->|Process Email| MailService
```

---

## 🔒 Transaction Safety & Data Consistency

Handling inventory deduction and customer billing requires strict concurrency controls to prevent overselling, race conditions, and corrupted historical pricing.

### 1. Concurrency Control & Stock Safety
When confirming a **Sales Challan** (`DRAFT` → `CONFIRMED`), the system executes a multi-step database operation inside a transaction configured with **Serializable Isolation**:

```typescript
await prisma.$transaction(
  async (tx) => {
    // 1. Validate Challan state
    // 2. Atomically verify and decrement product stock
    const result = await tx.product.updateMany({
      where: {
        id: item.productId,
        currentStock: { gte: item.quantity }, // Row-level stock safety check
      },
      data: {
        currentStock: { decrement: item.quantity },
      },
    });

    if (result.count === 0) {
      throw new ApiError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    // 3. Create stock movement audit record (Type: OUT)
    // 4. Update Challan status to CONFIRMED
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 10000,
  }
);
```

### 2. Product Price & Details Snapshotting
Product pricing and details change over time. To ensure that past invoices and sales challans maintain accurate financial history, product attributes are **snapshotted** into the `challan_items` table at the moment a draft challan is created:

- `productName` (string snapshot)
- `sku` (string snapshot)
- `unitPrice` (Decimal snapshot)
- `imageUrl` (string snapshot)

Future changes to `Product.unitPrice` or `Product.name` do **not** affect historical sales challans.

---

## 🗄️ Database Design & ERD Specifications

The relational schema is built on PostgreSQL via Prisma ORM, enforcing foreign key integrity, index optimizations, cascades, and enum-restricted state machines.

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ OtpVerification : "owns"
    User ||--o{ Notification : "receives"
    User ||--o{ NotificationPreference : "has"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ StockMovement : "performs"
    User ||--o{ SalesChallan : "creates"
    User ||--o{ CustomerFollowUp : "assigned_to"

    Customer ||--o{ CustomerFollowUp : "has"
    Customer ||--o{ SalesChallan : "places"

    StockType ||--o{ Product : "categorizes"
    Product ||--o{ StockMovement : "tracks"
    Product ||--o{ ChallanItem : "included_in"

    SalesChallan ||--|{ ChallanItem : "contains"

    User {
        uuid id PK
        string name
        string email "UK"
        string passwordHash
        enum role
        boolean isActive
        boolean isEmailVerified
        datetime createdAt
        datetime updatedAt
    }

    OtpVerification {
        uuid id PK
        uuid userId FK
        string email
        string otpHash
        enum purpose
        datetime expiresAt
        int attempts
        datetime verifiedAt
        datetime createdAt
    }

    Customer {
        uuid id PK
        string name
        string mobile
        string email
        string businessName
        string gstNumber
        enum customerType
        string address
        enum status
        datetime followUpDate
        string notes
        datetime createdAt
        datetime updatedAt
    }

    CustomerFollowUp {
        uuid id PK
        uuid customerId FK
        uuid userId FK
        datetime followUpDate
        string notes
        enum status
        datetime createdAt
        datetime updatedAt
    }

    StockType {
        uuid id PK
        string name "UK"
        string description
        datetime createdAt
        datetime updatedAt
    }

    Product {
        uuid id PK
        string name
        string sku "UK"
        string category
        uuid stockTypeId FK
        decimal unitPrice
        int currentStock
        int minimumStock
        string warehouseLocation
        string imageUrl
        datetime createdAt
        datetime updatedAt
    }

    StockMovement {
        uuid id PK
        uuid productId FK
        int quantity
        enum movementType
        string reason
        enum referenceType
        string referenceId
        uuid createdBy FK
        datetime createdAt
    }

    SalesChallan {
        uuid id PK
        string challanNumber "UK"
        uuid customerId FK
        enum status
        int totalQuantity
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
    }

    ChallanItem {
        uuid id PK
        uuid challanId FK
        uuid productId FK
        string productName
        string sku
        decimal unitPrice
        string imageUrl
        int quantity
        decimal totalPrice
    }

    Notification {
        uuid id PK
        uuid userId FK
        enum type
        string title
        string message
        string entityType
        string entityId
        boolean isRead
        datetime createdAt
    }

    NotificationPreference {
        uuid id PK
        uuid userId FK "UK"
        boolean lowStockEmail
        boolean criticalStockEmail
        boolean challanEmail
        boolean followupEmail
        boolean lowStockSocket
        boolean criticalStockSocket
        boolean challanSocket
        boolean followupSocket
    }

    AuditLog {
        uuid id PK
        uuid userId FK
        enum action
        string entityType
        string entityId
        json oldData
        json newData
        string ipAddress
        datetime createdAt
    }
```

### Table Indexing Strategy

| Table | Index Columns | Index Type | Business Justification |
| :--- | :--- | :--- | :--- |
| `users` | `email` | UNIQUE B-Tree | Rapid login credential verification |
| `customers` | `name`, `mobile`, `status`, `customerType` | B-Tree | Accelerated CRM text search and status filtering |
| `products` | `sku` | UNIQUE B-Tree | Fast barcode/SKU inventory lookups |
| `products` | `name`, `category`, `stockTypeId` | B-Tree | Catalog filtering and category aggregation |
| `sales_challans` | `challanNumber` | UNIQUE B-Tree | Sequential invoice number retrieval |
| `sales_challans` | `customerId`, `status` | B-Tree | Filter customer order history and draft lists |
| `audit_logs` | `userId`, `entityType`, `entityId`, `createdAt` | B-Tree | Compliance timeline filtering and security audits |

---

## 📊 Data Flow Diagrams (DFD)

### DFD Level 0 — Context Diagram
The Level 0 Context Diagram depicts system boundaries and interactions between primary external entities and the Mini ERP Engine.

```mermaid
graph TD
    Admin["System Administrator"]
    Sales["Sales Representative"]
    Warehouse["Warehouse Manager"]
    Accounts["Accounts Staff"]
    SMTP["SMTP Mail Server"]
    Sockets["Socket Clients"]

    ERP(("1.0 Mini ERP & CRM System Engine"))

    Admin <-->|User Management, System Audits, Full Access| ERP
    Sales <-->|Customers, Follow-ups, Create Draft Challans| ERP
    Warehouse <-->|Inventory Management, Stock-In, Products| ERP
    Accounts <-->|Customer Reports, Confirm/Cancel Challans| ERP

    ERP -->|Dispatch Async OTP & Alert Emails| SMTP
    ERP <-->|Push Real-Time Alerts & Stock Badges| Sockets
```

---

### DFD Level 1 — System Process Decomposition
Level 1 decomposes the central system into 6 core business process domains:

```mermaid
graph TD
    %% External Entities
    UserExt["User / Employee"]
    CustExt["Customer / Client"]

    %% Data Stores
    D1[("D1: Users & Auth Store")]
    D2[("D2: Customers & Followups")]
    D3[("D3: Products & Stock Store")]
    D4[("D4: Sales Challans Store")]
    D5[("D5: Notifications Store")]
    D6[("D6: Audit Log Store")]

    %% Level 1 Processes
    P1(("1.0 Auth & User Management"))
    P2(("2.0 Customer & Lead Engine"))
    P3(("3.0 Inventory & Product Control"))
    P4(("4.0 Sales Challan Engine"))
    P5(("5.0 Notification & Event Worker"))
    P6(("6.0 Audit Logging & Compliance"))

    %% Data Flows
    UserExt -->|Credentials & OTP| P1
    P1 <-->|Read / Write Credentials| D1
    P1 -->|Log Auth Events| P6

    UserExt -->|Customer Profile & Follow-ups| P2
    P2 <-->|Read / Write Customer Data| D2
    P2 -->|Log CRM Actions| P6

    UserExt -->|Stock In, Product CRUD| P3
    P3 <-->|Read / Write Product & Movement| D3
    P3 -->|Stock Threshold Alerts| P5
    P3 -->|Log Inventory Actions| P6

    UserExt -->|Draft / Confirm Challans| P4
    P4 <-->|Read Customer Details| D2
    P4 <-->|Validate & Deduct Stock| D3
    P4 <-->|Write Challan & Items| D4
    P4 -->|Trigger Challan Events| P5
    P4 -->|Log Financial Transactions| P6

    P5 <-->|Store Notifications| D5
    P5 -->|Push Socket & Email Alerts| UserExt

    P6 <-->|Write Compliance Audit Logs| D6
```

---

### DFD Level 2 — Detailed Sub-Process Diagrams

#### 1. Process 4.0 Sub-Decomposition (Sales Challan Transaction Lifecycle)

```mermaid
graph TD
    subgraph DFD Level 2 - Process 4.0 Sales Challan Engine
        SalesRep["Sales Staff"]
        AcctStaff["Accounts / Sales Staff"]

        D2[("D2: Customer Store")]
        D3[("D3: Product Store")]
        D4[("D4: Sales Challan Store")]
        D5[("D5: Notification Store")]
        D6[("D6: Audit Log Store")]

        P4_1(("4.1 Create Draft Challan"))
        P4_2(("4.2 Snapshot Product Details"))
        P4_3(("4.3 Serializable Transaction Execution"))
        P4_4(("4.4 Deduct Stock & Write Movement"))
        P4_5(("4.5 Finalize Confirmation & Dispatch Alerts"))

        SalesRep -->|Select Customer & Items| P4_1
        P4_1 -->|Fetch Customer Info| D2
        P4_1 -->|Fetch Current Price & SKU| D3
        P4_1 -->|Pass Items| P4_2
        P4_2 -->|Write DRAFT Challan + Snapshots| D4

        AcctStaff -->|Request Confirmation| P4_3
        P4_3 -->|Read DRAFT Status| D4
        P4_3 -->|Atomic Stock Check currentStock >= Qty| P4_4
        P4_4 -->|Decrement Stock & Record StockMovement OUT| D3
        P4_4 -->|Update Status to CONFIRMED| D4
        P4_4 -->|Pass Result| P4_5

        P4_5 -->|Emit CONFIRM_CHALLAN Audit| D6
        P4_5 -->|Check Low Stock & Push Socket/Email| D5
    end
```

#### 2. Process 1.0 Sub-Decomposition (Auth & Email OTP Flow)

```mermaid
graph TD
    subgraph DFD Level 2 - Process 1.0 Auth & OTP Management
        Client["Client App"]
        MailService["Email Service"]
        D1[("D1: Users & OTP Store")]

        P1_1(("1.1 Validate Credentials"))
        P1_2(("1.2 Generate & Hash OTP"))
        P1_3(("1.3 Dispatch Email OTP"))
        P1_4(("1.4 Verify OTP Hash"))
        P1_5(("1.5 Issue JWT Access Token"))

        Client -->|Submit Email + Password| P1_1
        P1_1 -->|Read User & PasswordHash| D1
        P1_1 -->|Credentials Valid| P1_2
        P1_2 -->|Save Hash & Expiration| D1
        P1_2 -->|Send OTP Payload| P1_3
        P1_3 -->|Dispatch SMTP Mail| MailService

        Client -->|Submit Email + 6-Digit OTP| P1_4
        P1_4 -->|Fetch Unexpired Hash| D1
        P1_4 -->|BCrypt Compare Matches| P1_5
        P1_5 -->|Return Signed JWT Token| Client
    end
```

#### 3. Process 3.0 Sub-Decomposition (Stock Management & Threshold Alert Flow)

```mermaid
graph TD
    subgraph DFD Level 2 - Process 3.0 Inventory Control
        WhStaff["Warehouse Staff"]
        D3[("D3: Product & Movement Store")]
        D5[("D5: Notification Store")]

        P3_1(("3.1 Stock-In Entry"))
        P3_2(("3.2 Atomic Increment & Movement Log"))
        P3_3(("3.3 Low/Critical Threshold Evaluator"))
        P3_4(("3.4 Broadcast Stock Alert"))

        WhStaff -->|Select Product + Quantity + Reason| P3_1
        P3_1 -->|Execute Stock Update| P3_2
        P3_2 -->|Increment Product currentStock| D3
        P3_2 -->|Create StockMovement IN Record| D3
        P3_2 -->|Trigger Evaluator| P3_3
        
        P3_3 -->|Read minimumStock Limits| D3
        P3_3 -->|If currentStock <= minimumStock| P3_4
        P3_4 -->|Write Notification & Socket Broadcast| D5
    end
```

---

## 🔒 Role-Based Access Control (RBAC) Matrix

The system implements strict route guards on the frontend and role-verification middleware on backend endpoints.

| Feature / Resource | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
| :--- | :---: | :---: | :---: | :---: |
| **User Management** (Create, Update, List, Revoke Users) | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** (View System Audit Logs) | ✅ | ❌ | ❌ | ❌ |
| **Customer Management** (Create, Edit Customers) | ✅ | ✅ | ❌ | 👁️ Read-Only |
| **Customer Follow-ups** (Create, Update Follow-ups) | ✅ | ✅ | ❌ | ❌ |
| **Stock Types** (Manage Categories) | ✅ | ❌ | ✅ | ❌ |
| **Product Catalog** (Create/Edit Products) | ✅ | 👁️ Read-Only | ✅ | 👁️ Read-Only |
| **Inventory Stock-In** (Add Stock Movements) | ✅ | ❌ | ✅ | ❌ |
| **Sales Challans (Create Draft)** | ✅ | ✅ | ❌ | ❌ |
| **Sales Challans (Confirm & Deduct Stock)** | ✅ | ✅ | ❌ | ✅ |
| **Sales Challans (Cancel Challan)** | ✅ | ❌ | ❌ | ✅ |
| **Dashboard Analytics** (Revenue & Operations View) | ✅ | 👁️ Sales Only | 👁️ Stock Only | 👁️ Finance Only |

---

## 🌐 API Endpoint Catalog

All routes are prefixed with `/api`. Complete Swagger / OpenAPI 3.0 specification is available interactively at `/api-docs`.

### Authentication Module (`/api/auth`)
- `POST /api/auth/register` — Register a user account (Admin only).
- `POST /api/auth/login` — Authenticate credentials & return partial auth state.
- `POST /api/auth/send-otp` — Request Email OTP verification code.
- `POST /api/auth/verify-otp` — Verify OTP code and receive JWT Bearer token.
- `GET /api/auth/me` — Retrieve current authenticated user session context.

### Customer & Lead Module (`/api/customers`)
- `GET /api/customers` — List customers with pagination, search, and type filters.
- `GET /api/customers/:id` — Get customer details with full follow-up and challan history.
- `POST /api/customers` — Create a new customer profile or lead.
- `PUT /api/customers/:id` — Update customer details and business information.
- `DELETE /api/customers/:id` — Archive/delete customer (Admin only).

### Customer Follow-Up Module (`/api/followups`)
- `GET /api/followups` — List assigned follow-ups with date range filtering.
- `POST /api/followups` — Schedule a new follow-up reminder.
- `PATCH /api/followups/:id/status` — Update status (`PENDING` → `COMPLETED` / `CANCELLED`).

### Stock Type Module (`/api/stock-types`)
- `GET /api/stock-types` — List dynamic product stock categories.
- `POST /api/stock-types` — Add new stock category (Warehouse/Admin).
- `PUT /api/stock-types/:id` — Edit stock category details.
- `DELETE /api/stock-types/:id` — Delete stock category.

### Product Catalog Module (`/api/products`)
- `GET /api/products` — List products with SKU search, category, and stock filter.
- `GET /api/products/:id` — View detailed product stock levels and history.
- `POST /api/products` — Add a new product to catalog.
- `PUT /api/products/:id` — Update pricing, SKU, and threshold settings.

### Inventory Module (`/api/inventory`)
- `GET /api/inventory/movements` — View historical stock movement audit log (`IN`/`OUT`).
- `POST /api/inventory/stock-in` — Receive stock into warehouse and update counts.

### Sales Challans Module (`/api/challans`)
- `GET /api/challans` — List sales challans by status, customer, or date.
- `GET /api/challans/:id` — Get full challan detail with snapshot item breakdown.
- `POST /api/challans` — Create a draft sales challan with item price snapshots.
- `PUT /api/challans/:id` — Update draft challan items.
- `POST /api/challans/:id/confirm` — **Serializable Transaction**: Confirm challan & deduct stock.
- `POST /api/challans/:id/cancel` — Cancel challan & restore stock balance.

### Notifications & Preferences (`/api/notifications`)
- `GET /api/notifications` — Fetch user's in-app notification feed.
- `PATCH /api/notifications/:id/read` — Mark notification as read.
- `GET /api/notifications/preferences` — Get user alert delivery settings.
- `PUT /api/notifications/preferences` — Update Email and Socket alert preferences.

### System Audit & Compliance (`/api/audit-logs`)
- `GET /api/audit-logs` — Filter and view system-wide operational audit logs (Admin only).

---

## 💻 Tech Stack Specifications

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **State & Query**: `@tanstack/react-query` v5 + Axios
- **Form Validation**: React Hook Form + Zod
- **Styling**: Tailwind CSS + Custom Design System tokens
- **Real-Time Client**: Socket.IO Client + `react-hot-toast`
- **Visual Analytics**: Recharts

### Backend
- **Runtime**: Node.js 18+ + Express.js + TypeScript
- **Database & ORM**: PostgreSQL + Prisma ORM v6
- **Authentication**: JWT + BCrypt + OTP Service
- **Real-Time Communications**: Socket.IO Room Manager
- **Async Queue**: Redis + BullMQ (Fallback to direct delivery)
- **Documentation**: OpenAPI 3.0 / Swagger UI (`http://localhost:5000/api-docs`)

---

## 📄 License
This project is proprietary software built for corporate ERP & CRM operational deployment. All rights reserved.
