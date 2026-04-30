# DiagnoAI — System Architecture

## Component Overview
The DiagnoAI system coordinates across several layers. The typical data flow is:
**Frontend → Backend API → Database → Redis → Celery workers**

1. **Frontend**: React-based client driving the user interface and interactions.
2. **Backend API**: FastAPI application handling RESTful communication, validation, and integrations.
3. **Database**: PostgreSQL storing structural data (users, permissions, metrics).
4. **Redis**: In-memory data broker for async messaging and caching.
5. **Celery Workers**: Handles heavy-duty background tasks and AI inference.

## Backend Modules
The backend follows a service-oriented separation of concerns to maintain a scalable infrastructure:
- **`routers/`** — HTTP route handlers routing API endpoints to specific controllers.
- **`services/`** — Core business logic, orchestrating internal processes and AI inference operations.
- **`models/`** — SQLAlchemy ORM models representing database tables and domain entities.
- **`schemas/`** — strictly typed Pydantic contracts ensuring input validation and serialization.
- **`dependencies.py`** — Auth + RBAC guards defining dependency injection for route protection.

## AI Pipeline
The AI architecture powers Explainable AI capabilities for diagnostic insights:
**DenseNet121 → Grad-CAM → XAI Engine → JSON Response**
1. **DenseNet121**: Primary classification model optimized for radiological abnormalities.
2. **Grad-CAM**: Generates class activation maps (heatmaps) highlighting regions of interest.
3. **XAI Engine**: Compiles heatmap evidence and correlates clinical knowledge.
4. **JSON Response**: Packages predictions, confidence metrics, and human-readable metadata.

## Security Layers
DiagnoAI implements robust multi-layer security components including:
- **CSRF (Cross-Site Request Forgery)** protection.
- **CORS (Cross-Origin Resource Sharing)** restrict authorized domains.
- **Rate Limiting** via Redis to prevent abuse.
- **JWT (JSON Web Tokens)** managing stateless authentication.
- **RBAC (Role-Based Access Control)** handling authorization levels per identity.

## Frontend Structure
The presentation layer is built on a scalable React architecture:
- **Pages**: Top-level route components mapping to major experiences.
- **Reusable Components**: Shared UI elements (e.g., specific XAIMetricsPanel implementation).
- **API Layer**: Centralized network services mediating HTTP calls.
- **Auth Flow**: Protected routes ensuring secure and smooth authentication state management.

## Deployment Overview
DiagnoAI leverages containerized infrastructure for deployment:
- **Docker-based Orchestration**: Includes `docker-compose.yml` and `docker-compose.prod.yml` to spin up environments seamlessly.
- **Nginx**: Functions as the primary reverse proxy managing load balancing and static content.
- **Render deployment configuration**: Present via `render.yaml` for managed platform deployment options.
