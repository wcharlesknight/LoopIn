## Multi-Repo Integration
- **Backend Core:** [gather-service](~/Projects/gather-service)
  - Layout map for quick reference:
    - Controllers: `~/Projects/gather-service/src/controllers/`
    - Prisma / Database Schemas: `~/Projects/gather-service/prisma/schema.prisma`
    - Main App Entry: `~/Projects/gather-service/src/app.ts`

## Workflow Guardrails
- **CRITICAL:** Before writing any frontend API services or updating client-side TypeScript types, Claude **MUST** use its file-reading tools to check the controller routing files and data types inside `gather-service` to prevent data layout mismatches.