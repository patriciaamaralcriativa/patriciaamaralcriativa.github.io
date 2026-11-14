# RADIOQUIZ — backend setup

## Current repository state
- `index.html`: responsive visual prototype for teacher and student views.
- `supabase/migrations/202611140001_radioquiz_schema.sql`: isolated database schema foundation.

## Important: not connected yet
The SQL file is a starting schema proposal, not a live database deployment. It has **not** been applied to any Supabase project. The migration enables Row Level Security and revokes direct browser access to every table. A subsequent migration must add narrowly scoped server-side RPC functions for teacher authentication, room creation, PIN-based team entry, question delivery, answer submission, scoring and room state. Never expose a Supabase service-role key in browser code.

## Apply only after the project is confirmed
1. Open the Supabase project intended for RADIOQUIZ.
2. Confirm it is a dedicated project or that the owner explicitly approves adding the isolated `radioquiz_*` tables.
3. Review the migration in the SQL Editor or use the Supabase CLI against a staging environment.
4. Do not paste service-role keys, database passwords, or private tokens into chat or GitHub.
5. After applying the schema, implement and test the RPC layer before enabling the buttons in the website.

## Game rules captured for implementation
- Teams consist of exactly two students.
- Each team submits one answer per question.
- Score and answer validation must be calculated on the server, not trusted from the browser.
- A room uses a short join PIN, stored as a digest rather than plain text.
- Student-facing screens should not reveal the correct answer before the teacher advances the game.
- Collect only the minimum student information required for the classroom activity.
