import { inject } from "vitest";

process.env.DATABASE_URL = inject("databaseUrl");
process.env.CONTACT_PHONE ??= "+359 888 000 000";
