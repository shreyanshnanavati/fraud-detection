# Verified User Database System

A NestJS-based backend system for managing verified user data with trust-based fraud prevention. This system processes user data from CSV files, calculates trust scores, and provides APIs for user management.

## Features

- **User Management**: Create, read, update, and delete user records
- **Pagination**: Efficient data retrieval with pagination support
- **Data Validation**: Robust input validation using class-validator
- **Error Handling**: Comprehensive error handling and logging
- **Database Integration**: Seamless integration with PostgreSQL using Prisma
- **Optimized Ingestion**: High-performance CSV processing with batch operations, retry mechanisms, and memory-efficient streaming
- **Performance Strategy**: Uses streaming and batch processing to handle large files efficiently - streaming prevents memory overflow while batching reduces database load by minimizing individual queries

## Key Features

### User Management
- User data storage with unique identifiers (email, PAN number)
- Trust score calculation based on user data
- Paginated user listing and filtering
- User statistics and summary endpoints

### Trust Score System

#### Current Implementation
The trust score system starts with a base score of 1.0 and evaluates user data quality:
- Invalid email: -0.3 points
- Invalid phone: -0.3 points
- Invalid/Short full name: -0.2 points

The final score is normalized between 0 and 1:
- 0.8-1.0: High trust
- 0.5-0.8: Medium trust
- 0.0-0.5: Low trust (flagged for review)

#### Future Evolution Plans

1. Data Completeness
   - Additional points for complete profile information
   - Bonus for verified government IDs
   - Points for profile picture verification

2. Historical Behavior
   - Transaction history analysis
   - Account age and activity metrics
   - Pattern recognition for suspicious activities

3. External Verifications
   - Integration with credit bureaus
   - Social media verification
   - Professional network validation

4. Machine Learning Integration
   - Anomaly detection
   - Risk prediction models
   - Dynamic scoring based on user behavior patterns

### Data Ingestion
- CSV file ingestion with validation
- Automatic trust score calculation
- Duplicate detection and handling
- Processed file tracking to prevent re-processing

### Technical Features
- RESTful API endpoints
- PostgreSQL database with Prisma ORM
- Docker support for easy deployment
- TypeScript for type safety
- Automated testing setup
- Logging and error handling

## Prerequisites

- Node.js 18 or later
- Docker and Docker Compose
- PostgreSQL (if running locally without Docker)

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd gala-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gala_intelligence?schema=public"
INGESTION_SOURCE_URL="https://example.com/csv-files"
PORT=3000
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

## Running the Application

### Using Docker (Recommended)
```bash
docker-compose up -d
```

### Local Development
1. Start the PostgreSQL database:
```bash
docker-compose up -d postgres
```

2. Run the application:
```bash
npm run start:dev
```

## API Endpoints

### User Management
- `GET /users` - List paginated users
- `GET /users/:id` - Get user by ID
- `GET /users/stats/summary` - Get user statistics

### Data Ingestion
- `POST /ingest` - Trigger CSV ingestion
- `GET /processed-files` - List processed files

## Database Schema

### User
- id: UUID
- fullName: String
- email: String (unique)
- phone: String
- panNumber: String (unique)
- trustScore: Float
- sourceFile: String
- ingestedAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime

### ProcessedFile
- id: UUID
- filename: String (unique)
- processedAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime

## Project Structure

```
src/
├── common/         # Shared utilities and constants
├── ingestion/      # CSV ingestion logic
├── processed-files/# Processed file tracking
├── prisma/         # Database schema and migrations
├── users/          # User management
└── app.module.ts   # Main application module
```

