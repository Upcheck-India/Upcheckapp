# Backend Architecture & Frontend Interaction

This document outlines the architecture of the backend system and how the frontend application interacts with it.

## Overview

The system utilizes a **Hybrid Architecture**:
1.  **Frontend (Mobile App)**: Built with React Native (Expo), it currently communicates **indirectly** with the backend database via the Supabase Client SDK for standard operations (Auth, CRUD).
2.  **Backend (API Server)**: A **NestJS** application designed to provide robust API endpoints, handle complex business logic, background tasks, and potentially serve as the primary gateway in future iterations.
3.  **Database**: A **PostgreSQL** database hosted on **Supabase**. Both the Frontend (via Supabase SDK) and the Backend (via TypeORM) connect to this same database instance.

---

## 2. Backend Details (NestJS)

The backend is located in the `backend/` directory and is built using the **NestJS** framework.

### Technology Stack
-   **Framework**: NestJS (Modular, TypeScript-based)
-   **Language**: TypeScript
-   **Database ORM**: TypeORM
-   **Database**: PostgreSQL (Supabase)
-   **Authentication**: Passport (JWT Strategy) - *Prepared for API security*

### directory Structure
The source code (`backend/src`) is organized by feature modules (Domain-Driven):

-   **App Module** (`app.module.ts`): The root module that imports all feature modules and configures the database connection.
-   **Feature Modules**:
    -   `auth/`: Authentication logic (Guards, Strategies).
    -   `farms/`: Farm management.
    -   `ponds/`: Pond operations.
    -   `feed-records/`: Feed tracking.
    -   `shrimp-calculations/`: Complex domain logic for growth/feed algorithms.
    -   `water-quality/`: Water parameter tracking.
    -   `alerts/`, `news/`, `products/`, `inventory/`, `transactions/`: Respective domain features.

### Key Components

-   **Entities** (`*.entity.ts`): Define the database schema using TypeORM decorators. These map directly to the PostgreSQL tables.
-   **DTOs** (`*.dto.ts`): Data Transfer Objects define the shape of data sent over the network (e.g., `CreateFarmDto`).
-   **Services** (`*.service.ts`): Contain the business logic and interact with the database repositories.
-   **Controllers** (`*.controller.ts`): Handle incoming HTTP requests, validate data using Pipes, and call services.

---

## 3. Frontend Interaction

The Frontend is located in `src/` and uses **React Native**.

### Current Interaction Pattern: **Direct-to-Database (Supabase)**

Currently, the frontend services (located in `src/services/`) act as a **BaaS (Backend-as-a-Service)** client.

-   **Authentication**: Uses `auth.ts` to call `supabase.auth.signInWithPassword`, `signUp`, etc.
-   **Data Access**: Services like `farmService.ts` use the `supabase` client to perform queries directly against the database.
    -   *Example*: `supabase.from('farms').select('*')`
-   **Security**: Relies on Supabase **RLS (Row Level Security)** policies to ensure users can only access their own data (`user_id`).

### The Role of the NestJS Backend

Although the frontend currently connects directly to Supabase, the NestJS backend is structured to:
1.  **Shared Database**: It connects to the exact same Postgres database defined in `DATABASE_URL`.
2.  **Future API Gateway**: It can expose RESTful endpoints (e.g., `GET /api/farms`) that the frontend can switch to consuming.
3.  **Complex Logic**: It is the ideal place for heavy calculations (e.g., `shrimp-calculations`) that shouldn't run on the client device.

### Interaction Diagram

```mermaid
graph TD
    User[User (Mobile App)]
    
    subgraph Frontend
        AuthService[Auth Service]
        FarmService[Farm Service]
    end
    
    subgraph Backend_Infrastructure
        Supabase[Supabase (PostgreSQL + Auth)]
        NestJS[NestJS API Server]
    end

    User --> AuthService
    User --> FarmService
    
    %% Current Flow
    AuthService -- "Auth SDK" --> Supabase
    FarmService -- "JS Client (REST/Realtime)" --> Supabase
    
    %% Backend Connection
    NestJS -- "TypeORM Connection" --> Supabase
    
    %% Future/Hybrid Flow (Dotted)
    FarmService -.-> |"HTTP Requests (Future)"| NestJS
```

## Summary

-   **Frontend** `src/services/*.ts` -> **Supabase SDK** (Auth, Persistence)
-   **Backend** `backend/src/**/*.ts` -> **TypeORM** -> **PostgreSQL** (Same DB)

This setup allows for rapid frontend prototyping using Supabase while maintaining a robust, scalable NestJS backend ready for complex logic and enterprise-grade API management.
