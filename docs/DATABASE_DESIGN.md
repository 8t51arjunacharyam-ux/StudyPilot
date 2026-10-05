# StudyPilot — Database Design

**Status:** Design approved, not yet applied
**Supabase:** PostgreSQL + Auth + Row Level Security
**Applies to:** Phase 2 of [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
**Last updated:** 2026-10-05

---

## 0. Scope and Status

This document defines the complete database for StudyPilot. **Nothing in it has
been applied yet** — no migration has been run against the live Supabase project.

This matters: because nothing is applied, we are free to use the correct table
names rather than being constrained by an earlier draft. The Phase 2 draft
(`supabase/migrations/20260101000000_initial_schema.sql`) used different names
(`availability_windows`, `energy_preferences`, `topic_reviews`) and will be
**replaced** before it is ever run. See §12.

---

## 1. Security Model

### 1.1 We never store passwords

**Our database contains no password column of any kind.** Not hashed, not
encrypted.

Passwords live only in Supabase's own `auth.users` table. We link to it with a
UUID and never read the credential. Consequences:

- If our database leaked, **no student passwords would be exposed**
- We cannot leak a password we never possess
- No hashing code, no salt handling, no credential-stuffing defence to write

All authentication goes through Supabase Auth. We never compare passwords.

### 1.2 Roles and who may do what

| Postgres role | Can it read other users' rows? | Where it is used |
| --- | --- | --- |
| `anon` | **No** — RLS blocks it | Browser, with the anon key |
| `authenticated` | **No** — RLS blocks it | Server, acting as the signed-in student |
| `service_role` | **Yes — RLS is bypassed entirely** | Server only, and **not used in this phase** |

### 1.3 The anon key is safe in the browser

This inverts the usual instinct, so it is worth stating plainly:

The **anon key is designed to be public.** The browser must have something to
talk to Supabase with. What protects the data is **not** key secrecy — it is
**Row Level Security**, which is enforced by PostgreSQL itself.

Analogy: the anon key is the address of a building. Giving it out lets people
find the building. What keeps them out is the lock on each door, and RLS is that
lock — one lock, keyed to the visitor's verified identity.

### 1.4 Service-role key: defined but unused

`SUPABASE_SERVICE_ROLE_KEY` is defined in `.env.example` but **is not used
anywhere in this phase.** Every query can be performed as the signed-in student
with RLS doing the enforcement. This is simpler and safer than bypassing RLS.

It would only ever be needed for a genuinely privileged operation that has no
user context — for example a nightly job recalculating forgetting curves. That
is a Phase 10+ concern.

**Rule enforced:** the service-role key is never imported into any Client
Component. Next.js replaces non-`NEXT_PUBLIC_` variables with `undefined` in
browser bundles, so such an import **fails the build** rather than leaking
silently.

---

## 2. Entity Relationship Overview

```
                    auth.users   (Supabase's table — we never read it)
                         │ 1:1
                         ▼
                    ┌─────────┐
                    │profiles │  no password column, ever
                    └────┬────┘
                         │ 1:n
     ┌───────────────┬───┴───────────────┬──────────────┬─────────────┐
     ▼               ▼                   ▼              ▼             ▼
┌─────────┐   ┌──────────────┐   ┌────────────┐  ┌───────────┐ ┌──────────────┐
│subjects │   │daily_energy  │   │ study_prefs│  │achievements│ │ study_plans │
└────┬────┘   └──────────────┘   └────────────┘  └────────────┘ └──────┬───────┘
     │ 1:n                                                              │ 1:n
     ▼                                                                   │
┌────────┐  ┌────────────────┐                                           │
│ topics │  │     exams      │                                           │
└───┬────┘  └────────────────┘                                           │
    │ 1:n                          ┌──────────────┐                      │
    ├──────────────┬───────────────►│study_sessions│◄─────────────────────┘
    ▼              │                └──────────────┘
┌────────────────┐ │
│memory_reviews  │─┘  (append-only)
└────────────────┘
```

**Cascade direction:** deleting a `subject` removes its `topics`, which removes
that topic's `memory_reviews` and `study_sessions`, plus its `exams`. This was
confirmed as the desired behaviour — a subject deletion should not leave
unreachable orphan data behind.

**Why `study_plans` exists:** when Plan Rescue redistributes missed work, the
old plan is marked inactive and a new one is created. This preserves an audit
trail ("what did the plan look like before I missed three days?") and makes the
scheduling algorithm debuggable after the fact.
---

## 3. Data Type Conventions

These choices are deliberate and applied consistently across every table.

| Concern | Type used | Why |
| --- | --- | --- |
| Identifiers | `uuid` | Generated by Postgres. Guessing another user's ID is infeasible, and sequential IDs leak how many users exist. |
| Timestamps | `timestamptz` | Timezone-aware. A student studying from another timezone must see correct times. Never use `timestamp`. |
| Enumerations | `text` + `check` constraint | A Postgres `enum` requires a type migration to add a value. A `check` constraint needs only `alter table`. |
| Durations | `integer` minutes | Simple arithmetic, no timezone traps. |
| Ratings | `smallint` + `check` | 1–5 scales. Explicit that this is not an arbitrary number. |
| Percentages | `smallint` 0–100 | Constrained so a bad calculation cannot store 150 or −20. |

### A note on `generated_at` vs `created_at`

`created_at` = when the row was inserted. `generated_at` = when an algorithm
produced it. `study_plans` needs both. Most tables need only `created_at`.

---

## 4. Table Specifications

### 4.1 `profiles`

One row per student, created automatically by a trigger on signup.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, `references auth.users(id) on delete cascade` | Same ID as the auth user. Never a separate ID. |
| `email` | `text` | nullable | Copied from auth for display. **Never used for login.** |
| `full_name` | `text` | nullable | |
| `timezone` | `text` | not null, default `'UTC'` | IANA name, e.g. `Asia/Kolkata`. Drives display conversion. |
| `onboarding_completed` | `boolean` | not null, default `false` | Redirect guard until setup finishes. |
| `daily_study_goal_minutes` | `integer` | not null, default `120`, check 0–1440 | The student's self-imposed daily cap. |
| `current_streak_days` | `integer` | not null, default `0`, check >= 0 | Cached for fast dashboard display. |
| `longest_streak_days` | `integer` | not null, default `0`, check >= 0 | Personal best. |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Maintained by trigger. |

**No password column.** This is the single most important property of this table.

### 4.2 `subjects`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
### 4.3 `topics`

The atom of the entire scheduling system. Everything placed into a calendar is
a topic.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `subject_id` | `uuid` | not null, FK → `subjects(id)` on delete cascade | Owning subject. |
| `name` | `text` | not null, check length 1–160 | |
| `estimated_minutes` | `integer` | not null, default `45`, check 5–480 | Length of one focused session. |
| `difficulty` | `smallint` | not null, default `3`, check 1–5 | |
| `confidence` | `smallint` | not null, default `50`, check 0–100 | **Current** belief: 0 = forgotten, 100 = solid. |
| `last_reviewed_at` | `timestamptz` | nullable | Null = never reviewed. |
| `needs_active_recall` | `boolean` | not null, default `false` | Set by Memory Radar. |
| `is_new` | `boolean` | not null, default `true` | True while first-time study is outstanding. |
| `created_at` / `updated_at` | `timestamptz` | not null, default `now()` | |

**Why `confidence` here but history in `memory_reviews`:** `topics.confidence`
is the *current belief* — cheap to read, fast to sort by. `memory_reviews` is
the *history*, append-only. Keeping them separate lets the dashboard sort by
confidence with no join, while Memory Radar still has the full evidence trail
needed for a forgetting curve. Folding history into this row would force a
rewrite on every single review.

**Indexes:**
- `(user_id)`
- `(subject_id)` — subject detail view
- partial `(user_id, is_new) where is_new = true` — "what still needs first-time study", the scheduler's hottest query
- `(user_id, confidence)` — Memory Radar's at-risk ordering

### 4.4 `exams`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `subject_id` | `uuid` | not null, FK → `subjects(id)` cascade | |
| `title` | `text` | not null, check length 1–160 | |
| `exam_date` | `timestamptz` | not null | Drives urgency weighting. |
| `importance` | `smallint` | not null, default `3`, check 1–5 | 5 = the exam that matters most. |
| `topics_covered` | `uuid[]` | not null, default `'{}'` | Topics in scope. |
| `created_at` / `updated_at` | `timestamptz` | not null, default `now()` | |

**Indexes:** `(user_id)`, `(exam_date)`, `(subject_id)`.

**Note on `topics_covered`:** a deliberate exception to normalising. A join
table would be three tables' worth of machinery for a list only ever read
whole, never filtered by membership. `uuid[]` is right-sized here; add a GIN
index if membership queries ever become necessary.

**`exam_date` permits past dates** — a student may add an exam retroactively.
### 4.6 `daily_energy`

Records what energy the student **actually felt** on a specific day — as opposed
to `study_preferences.energy_level`, which describes their routine.

**This distinction is the product.** Plan Rescue exists to detect reality
diverging from the plan, and this table is the evidence. Merging the two would
destroy the only signal that a student is consistently over-committing.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `log_date` | `date` | not null | Local calendar date, **not** a timestamp. |
| `energy_level` | `smallint` | not null, check 1–5 | 1 = exhausted, 5 = peak. |
| `note` | `text` | nullable, check length <= 280 | Optional context: "slept badly", "long lab". |
| `created_at` | `timestamptz` | not null, default `now()` | |

**Unique:** `(user_id, log_date)` — one entry per day, so re-logging updates
rather than duplicating.

**Indexes:** `(user_id, log_date desc)` — the trend-chart query.

**On `date` vs `timestamptz`:** energy is a *feeling about a day*, not an
instant. A timestamp would create phantom timezone bugs — "Monday's energy" must
not shift when a student travels.

### 4.7 `achievements`

**Server-written only.** Rows are created by our own code after a completed
session, never by the student.

**Why:** a student-writable achievements table is trivially cheatable — one
`insert` call and every badge is yours. The value of an achievement comes
entirely from the server having decided you earned it.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `achievement_key` | `text` | not null | Stable identifier, e.g. `first_session`, `streak_7`. |
| `title` | `text` | not null | Denormalised so past awards keep their wording. |
| `description` | `text` | nullable | |
| `icon` | `text` | nullable | Lucide icon name. |
| `earned_at` | `timestamptz` | not null, default `now()` | |

### 4.9 `study_sessions`

The concrete scheduled work units.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `plan_id` | `uuid` | FK → `study_plans(id)` on delete cascade | |
| `topic_id` | `uuid` | not null, FK → `topics(id)` on delete cascade | |
| `scheduled_start` / `scheduled_end` | `timestamptz` | not null | Constraint: end > start. |
| `planned_minutes` | `integer` | not null, check 0–1440 | |
| `actual_minutes` | `integer` | nullable, check 0–1440 | Null until completed. |
| `status` | `text` | not null, default `'planned'`, check in (`planned`,`completed`,`skipped`,`rescheduled`) | |
| `energy_match` | `text` | nullable, check in (`peak`,`steady`,`light`) | BrainFit result: how well work matched the hour's energy. |
| `rescued_from_id` | `uuid` | nullable, FK → `study_sessions(id)` on delete set null | Lineage: which missed session this work came from. Makes Plan Rescue auditable. |
| `completed_at` | `timestamptz` | nullable | |
| `created_at` / `updated_at` | `timestamptz` | not null, default `now()` | |

**Indexes:**
- `(user_id, scheduled_start)` — the dashboard's main query
- partial `(user_id) where status in ('planned','skipped')` — what Plan Rescue scans for missed work
- `(plan_id)`, `(topic_id)`

**`scheduled_start` is deliberately NOT constrained to the future.** A plan is
generated ahead of time and its sessions include past-dated entries once time
passes. Filtering by time is the query's job, not the database's.

### 4.10 `memory_reviews`

**Append-only.** The raw evidence Memory Radar learns from.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `topic_id` | `uuid` | not null, FK → `topics(id)` on delete cascade | |
| `reviewed_at` | `timestamptz` | not null, default `now()` | |
| `confidence_after` | `smallint` | not null, check 0–100 | Confidence following this review. |
| `recalled_correctly` | `boolean` | nullable | Did active recall work? Null = not attempted. |
| `review_type` | `text` | not null, default `'active_recall'`, check in (`active_recall`,`passive_re-read`,`mock_exam`) | Different methods yield different retention. |
| `note` | `text` | nullable, check length <= 500 | What was forgotten. |
| `created_at` | `timestamptz` | not null, default `now()` | |

**Indexes:** `(topic_id, reviewed_at desc)` — a topic's history in order, and
`(user_id, reviewed_at desc)` — the activity feed.

**Append-only enforcement:** RLS grants SELECT and INSERT only. With no UPDATE
or DELETE policy, both are denied by default. This is deliberate — if recall
history could be edited, a student could quietly delete their own failures and
make the forgetting curve report they are ready when they are not.

---

## 5. Referential Integrity Summary

| Child | Parent | On delete | Reason |
| --- | --- | --- | --- |
| `subjects.user_id` | `auth.users` | CASCADE | Deleting the account removes everything. |
| `topics.subject_id` | `subjects` | CASCADE | A topic cannot exist without a subject. |
| `exams.subject_id` | `subjects` | CASCADE | Same. |
| `exams.topics_covered` | `topics` | *(no FK)* | Array; not FK-enforceable. Entries may dangle after a topic delete — acceptable, and we ignore unknown ids on read. |
| `study_sessions.topic_id` | `topics` | CASCADE | A session without a topic is meaningless. |
| `study_sessions.plan_id` | `study_plans` | CASCADE | Deleting a plan removes its sessions. |
| `study_sessions.rescued_from_id` | `study_sessions` | SET NULL | Self-reference. Deleting the original keeps the rescued session, just without lineage. |
| `memory_reviews.topic_id` | `topics` | CASCADE | History belongs to its topic. |
| `daily_energy.user_id` | `auth.users` | CASCADE | |
| `achievements.user_id` | `auth.users` | CASCADE | |

**The cascade chain:** `auth.users` → `subjects` → `topics` → {`memory_reviews`,
`study_sessions`}. Deleting a subject therefore removes topics, their review
history, their sessions, and the subject's exams. This is the confirmed
behaviour: no unreachable orphans.

---

## 6. Index Strategy

Indexes are chosen from the queries in §8, not added speculatively. Every index
below earns its place by serving a specific known query.

| Table | Index | Serves |
| --- | --- | --- |
| `profiles` | PK | Direct lookup by session user |
| `subjects` | `(user_id)` | Subject list |
| `subjects` | partial `(user_id) where archived_at is null` | Active subjects on dashboard |
| `topics` | `(user_id)`, `(subject_id)` | Topic list, subject detail |
| `topics` | partial `(user_id, is_new) where is_new` | **Scheduler's hot path** |
| `topics` | `(user_id, confidence)` | Memory Radar ordering |
| `exams` | `(user_id)`, `(exam_date)`, `(subject_id)` | Exam list, upcoming exams |
| `study_preferences` | `(user_id, day_of_week)`, partial active | Availability lookup |
| `daily_energy` | `(user_id, log_date desc)` | Energy trend chart |
| `study_plans` | `(user_id)`, unique partial active | Exactly one active plan |
---

## 7. Row Level Security Strategy

**This is the core security requirement of the entire project.**

### 7.1 The principle

> A student may only ever read or modify rows they own — enforced by the
> database, not by application code.

Why the database rather than the app? Because an ownership check in application
code is one forgotten `if` away from a data leak. One bad query, one refactor,
one bug written at 2am, and student A sees student B's study plan. RLS policies
live *inside* Postgres and apply to every query path — including code that
doesn't exist yet.

### 7.2 `auth.uid()` — the verified identity

Every policy compares against `auth.uid()`, a function Supabase provides that
returns the authenticated user's UUID **derived from the verified session
token**. A client cannot forge it, because it is set by Supabase when it
validates the JWT — not by anything the browser sends.

If there is no valid session, `auth.uid()` returns `NULL`, and `auth.uid() =
user_id` evaluates to false. So an anonymous visitor matches **zero rows**. Not
"probably zero" — zero, guaranteed by Postgres.

### 7.3 The policy pattern

```sql
create policy "Users manage own subjects"
  on subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Two clauses, and both are essential:

| Clause | Controls | Consequence if omitted |
| --- | --- | --- |
| `USING` | who may read / update / delete **existing** rows | A student could read or modify another user's rows |
| `WITH CHECK` | what a row may **contain** on insert or update | A student could **insert** a row belonging to someone else — privilege escalation |

`WITH CHECK` is the clause people forget, and it is the dangerous one.

### 7.4 Three policy shapes

**Shape A — full ownership (most tables)**

```sql
-- subjects, topics, exams, study_preferences, daily_energy, study_plans
create policy "Users manage own <table>"
  on <table> for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Shape B — append-only** (`memory_reviews`)

```sql
create policy "Users read own reviews"  on memory_reviews for select
  using (auth.uid() = user_id);

create policy "Users add own reviews"   on memory_reviews for insert
  with check (auth.uid() = user_id);
-- NO update or delete policy => both are denied by default.
```

**Shape C — read-only** (`achievements`)

```sql
create policy "Users read own achievements" on achievements for select
  using (auth.uid() = user_id);
-- No INSERT policy: a client cannot grant itself a badge.
```

### 7.5 `profiles` is slightly different

Its primary key **is** the user id, so the check is `auth.uid() = id`:

```sql
create policy "Users read own profile"   on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

**No INSERT policy** — profiles are created by the signup trigger, not by the
client. Allowing inserts would let a student create rows for other users.

### 7.6 Signup trigger

```sql
create function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
---

## 8. Expected Queries

These are the queries the app will actually run, and they drive the indexes in
§6. **Every query runs as the signed-in student** using the anon or
authenticated client. RLS applies to all of them — none needs a service-role key.

### 8.1 Dashboard — today's sessions

```sql
select s.id, s.scheduled_start, s.scheduled_end, s.planned_minutes,
       s.status, s.energy_match,
       t.name as topic_name, t.id as topic_id,
       sub.name as subject_name, sub.color as subject_color
from study_sessions s
join topics t     on t.id = s.topic_id
join subjects sub on sub.id = t.subject_id
where s.user_id = auth.uid()
  and s.scheduled_start >= date_trunc('day', now())
  and s.scheduled_start <  date_trunc('day', now()) + interval '1 day'
order by s.scheduled_start;
```

Uses the `(user_id, scheduled_start)` index. **Note:** `user_id = auth.uid()` is
written explicitly even though RLS already enforces it. It makes the intent
readable and keeps the query correct if a future admin tool runs as a different
role.

### 8.2 Study Now — the single most urgent session

```sql
select t.id, t.name, t.confidence, t.difficulty, t.estimated_minutes,
       sub.name as subject_name, sub.color
from topics t
join subjects sub on sub.id = t.subject_id
where t.user_id = auth.uid()
  and t.is_new = true
order by t.confidence asc, t.difficulty desc
limit 1;
```

Lowest confidence + highest difficulty = the most at-risk topic. The real
version (Phase 10) adds exam proximity and energy matching.

### 8.3 Plan Rescue — find missed work

```sql
select s.id, s.topic_id, s.planned_minutes, s.scheduled_start
from study_sessions s
where s.user_id = auth.uid()
  and s.status in ('planned', 'skipped')
  and s.scheduled_end < now()
order by s.scheduled_start;
```

Served by the partial index on `(user_id) where status in ('planned','skipped')`.
The redistribution logic itself runs server-side and is not a SQL concern.

### 8.4 Memory Radar — topics at risk of being forgotten

```sql
select t.id, t.name, t.confidence, t.last_reviewed_at,
       now() - t.last_reviewed_at as time_since_review,
       (select count(*) from memory_reviews mr where mr.topic_id = t.id)
         as review_count
from topics t
where t.user_id = auth.uid()
### 8.6 Insert a memory review (append-only)

```sql
insert into memory_reviews (user_id, topic_id, confidence_after,
                            recalled_correctly, review_type, note)
values (auth.uid(), $1, $2, $3, $4, $5)
returning id, reviewed_at;
```

Allowed by RLS. A subsequent `update` on the same row would be **denied**.

### 8.7 Log daily energy (upsert)

```sql
insert into daily_energy (user_id, log_date, energy_level, note)
values (auth.uid(), $1, $2, $3)
on conflict (user_id, log_date)
do update set energy_level = excluded.energy_level,
              note = excluded.note;
```

The unique constraint turns a re-log into an update instead of a duplicate.

### 8.8 Read own profile

```sql
select id, email, full_name, timezone,
       daily_study_goal_minutes, onboarding_completed,
       current_streak_days, longest_streak_days
from profiles where id = auth.uid();
```

Returns exactly one row, or none. **There is no password column to select.**

### 8.9 Creating a study plan (Plan Rescue)

Must be transactional — deactivate the old plan and insert the new one together:

```sql
begin;

update study_plans set is_active = false
where user_id = auth.uid() and is_active = true;

insert into study_plans (user_id, name, is_active, generation_reason,
                         generated_at, plan_start_date, plan_end_date)
values (auth.uid(), $1, true, 'plan_rescue', now(), $2, $3)
returning id;

-- ... insert study_sessions referencing the returned plan id ...

commit;
```

The partial unique index means a concurrent second attempt **fails loudly** with
a constraint violation rather than silently producing two active plans. That is
the correct failure mode.

---

## 9. Migration Plan and Safe Application

### 9.1 Principles

- **The migration file is the source of truth.** The database is never
  hand-edited; that is how schemas drift out of sync with the code.
- **Numbered, ordered, committed SQL files** in `supabase/migrations/`.
- **Idempotent where practical** — `if not exists` and `on conflict` guards, so a
  re-run is harmless.
- **Forward-only** — no destructive changes without explicit approval.

### 9.2 Steps

1. **Review the migration file** for secrets. It must contain only SQL — no URLs,
   no keys, no passwords, ever.
2. **Test in a sandbox first.** Create a separate Supabase project if you want
   maximum caution; the free tier makes this easy.
3. **Apply via the SQL Editor.** Supabase dashboard → SQL Editor → New query →
   paste → Run. Chosen over the CLI because it needs no Docker and no extra
   credentials on your machine.
4. **Verify structure** with the read-only check in §9.3.
5. **Verify isolation** with the two-account test in §9.4. This is the one that
   actually proves the security model.
6. **Generate types** so TypeScript knows the row shapes.
7. **Commit** the migration file so the schema is versioned with the code.

### 9.3 Verification query (read-only)

```sql
select tablename, rowsecurity, count(p.policyname) as policies
---

## 10. Deferred Decisions

Honest notes on what is deliberately left open:

| Decision | Why deferred | Revisit |
| --- | --- | --- |
| Full-text search on topics | Needs `pg_trgm` or `tsvector`; subject counts are small enough for `ILIKE` now | When a user has 100+ topics |
| Soft delete on `topics` | `archived_at` exists on subjects, but hard delete is acceptable at this scale | If users want "undo delete" |
| Achievement eligibility logic | Needs real completion data to be meaningful | Phase 8, after sessions work |
| `daily_energy` decay model | How to weight today's energy against the routine is an algorithm decision | Phase 9 |
| Read replicas / caching | Overkill at this stage | Phase 12 if load warrants |

---

## 11. Rule Compliance

| Requirement | How this design satisfies it |
|---|---|
| No insecure public access | RLS on all 10 tables; no anonymous SELECT policy anywhere |
| Don't store passwords ourselves | No password column in any table; credentials live only in `auth.users` |
| No service-role key in the browser | Service key unused this phase; non-public env vars fail the build if referenced client-side |
| No secrets in source | Migration is pure SQL; keys live only in gitignored `.env.local` |
| Private data protected by RLS | Every table RLS-enabled with `auth.uid()` policies, including `with check` |

---

## 12. Open Questions

1. **Subject ordering.** Should subjects have a manual `sort_order` for the
   student's preferred arrangement? Currently alphabetical.
2. **Session splitting.** If a topic needs 120 minutes but only 60 remain in a
   slot, split into two sessions or move it whole? Affects a `check` on
   `planned_minutes`.
3. **Study-preference granularity.** Weekly recurrence only, or support
   date-specific exceptions (e.g. "no study this Thursday")?
4. **Achievement catalogue.** Which specific badges ship? The schema supports any
   `achievement_key`; the list is a product decision.

---

## 13. Summary

| Aspect | Design |
| --- | --- |
| **Tables** | 10 (`profiles`, `subjects`, `topics`, `exams`, `study_preferences`, `daily_energy`, `study_plans`, `study_sessions`, `memory_reviews`, `achievements`) |
| **Primary keys** | `uuid`, `gen_random_uuid()`; `profiles.id` mirrors `auth.users.id` |
| **Foreign keys** | Every `user_id` → `auth.users(id)` cascade; content FKs cascade; `rescued_from_id` sets null |
| **Data types** | `uuid` ids, `timestamptz` timestamps, `text` + `check` enums, `smallint` ratings, `integer` minutes |
| **Indexes** | 22, each tied to a specific query in §8 |
| **RLS** | Enabled on all 10; three policy shapes (full / append-only / read-only) |
| **Passwords** | Never stored by us |
| **Service role** | Not used in this phase |
| **Status** | Designed, **not applied** |
from pg_tables t
left join pg_policies p on p.tablename = t.tablename
where t.schemaname = 'public'
group by tablename, rowsecurity
order by tablename;
```

Expected: **all 10 tables** with `rowsecurity = true` and a policy count > 0.

### 9.4 Isolation test — the important one

```
1. Sign up as User A. Add a subject. Note its id.
2. Sign up as User B in a private/incognito window.
3. As User B, attempt to read User A's subject id.
   Expected: zero rows, or a permission error. THIS IS CORRECT.
4. As User B, attempt to update or delete it.
   Expected: zero rows affected. THIS IS CORRECT.
5. As User A, confirm the subject is still there and unmodified.
```

If step 3 returns User A's data, **stop and fix RLS before writing any
features.** A data leak found now costs an hour; found after launch, it costs
trust.

### 9.5 Rollback

This migration is small enough to reverse by hand — `drop table` in reverse
dependency order. **There is no automated down-migration**, deliberately:
`drop table` destroys student data, so it must never be automatic. Once real
data exists, the safe rollback is a **Supabase point-in-time restore**, not a
drop.

### 9.6 Relationship to the existing draft migration

`supabase/migrations/20260101000000_initial_schema.sql` (from Phase 2) uses older
table names: `availability_windows`, `energy_preferences`, `topic_reviews`. It
has **never been applied**.

| Option | Action | Outcome |
| --- | --- | --- |
| **Replace** *(recommended)* | Delete the draft; write one migration using the final names | Clean history, no cruft |
| Keep both | Add a second migration that renames | Preserves the draft, leaves confusing history for a schema that never ran |

Recommend **replace**, since the draft has never touched a real database.
  and t.last_reviewed_at is not null
order by t.confidence asc, t.last_reviewed_at asc
limit 20;
```

Cheap because `topics.confidence` is denormalised — no join into review history
just to rank risk. Full curve computation is Phase 10 domain code, not SQL.

### 8.5 Difficulty Debt — riskiest subjects

```sql
select sub.id, sub.name, sub.color,
       count(t.id) as total_topics,
       count(t.id) filter (where t.is_new) as untouched_topics,
       round(avg(t.confidence)) as avg_confidence,
       min(e.exam_date) as next_exam
from subjects sub
left join topics t on t.subject_id = sub.id
left join exams e  on e.subject_id = sub.id
where sub.user_id = auth.uid()
  and sub.archived_at is null
group by sub.id, sub.name, sub.color
order by avg_confidence asc, next_exam asc nulls last;
```
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Why `security definer`:** the brand-new user cannot yet insert into
`profiles` (no row exists to authorise them). `security definer` lets the
trigger do it. This is safe because the function writes exactly one row using
only `new.id` and `new.email` — values from the verified auth row, never user
input. The attacker cannot influence the contents.

**Why `set search_path = public`:** without it, a user who can create objects in
a schema earlier in the search path could shadow a function name and hijack the
trigger. This is a standard hardening measure.

### 7.7 Defence in depth

RLS is the security boundary, but it is not the *only* layer:

| Layer | Job |
| --- | --- |
| **RLS policies** | Guarantee row-level isolation for every query, always |
| **Server Action checks** | Verify session and ownership *before* invoking the engine — clearer error messages, and protects against logic bugs in complex actions |
| **Not caching per-user data** | Authenticated pages are dynamic, never statically cached or shared |

Both are required. RLS is the safety net; explicit application checks are the
primary, human-readable defence.

### 7.8 What we deliberately do NOT do

- **No public read policies.** There is no table anyone can read without a session.
- **No `service_role` usage in the initial build.** Every query runs as the
  signed-in student, so RLS always applies.
- **No blanket `for all` on append-only tables.** `memory_reviews` and
  `achievements` get narrow policies on purpose.
- **No RLS bypass in application code**, and no attempt to "optimise" queries
  by using the service key.
| `study_sessions` | `(user_id, scheduled_start)` | **Dashboard's main query** |
| `study_sessions` | partial `(user_id) where status in (planned, skipped)` | Plan Rescue scan |
| `memory_reviews` | `(topic_id, reviewed_at desc)`, `(user_id, reviewed_at desc)` | Forgetting-curve history |
| `achievements` | `(user_id, earned_at desc)`, unique `(user_id, key)` | Badge display, dedupe |

**Note on redundant indexes:** in Postgres, a leading `user_id` already serves
most lookups, so `(user_id, confidence)` and `(user_id)` overlap. The composite
is kept because it also sorts by confidence, avoiding a separate sort step.

**Not indexed deliberately:** `topics_covered` (array, only read whole),
`achievements.icon` and similar display-only fields.
**Unique:** `(user_id, achievement_key)` — a badge cannot be earned twice.

**Indexes:** `(user_id, earned_at desc)`, `(user_id, achievement_key)`.

**RLS note:** students get **SELECT only**. With no INSERT policy, a client
cannot grant themselves an achievement. The server inserts using the service-role
key *only after* independently verifying progress — or, better, via a Postgres
function that computes eligibility so the check cannot be bypassed.

### 4.8 `study_plans`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `name` | `text` | not null, check length 1–120 | |
| `is_active` | `boolean` | not null, default `true` | |
| `generation_reason` | `text` | not null, default `'initial'`, check in (`initial`,`plan_rescue`,`manual_regenerate`) | Why this version exists. |
| `generated_at` | `timestamptz` | not null, default `now()` | When the algorithm produced it. |
| `plan_start_date` / `plan_end_date` | `date` | not null | Covered window. |
| `created_at` | `timestamptz` | not null, default `now()` | |

**Unique (partial):** `create unique index on study_plans (user_id) where
is_active;` — exactly one active plan per student, enforced by the database
rather than by application code that could be forgotten.

**Indexes:** `(user_id)`, `(is_active)`.
There is deliberately no `check (exam_date > now())`.

### 4.5 `study_preferences`

**Merged** from the earlier draft's `availability_windows` and
`energy_preferences`. "When am I free, and how well do I focus then?" is one
concept, so it deserves one row:

> `day_of_week = 1, start = 18:00, end = 21:00, energy = 4`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` cascade | |
| `day_of_week` | `smallint` | not null, check 0–6 | 0 = Sunday. Matches JS `Date.getDay()`. |
| `start_time` | `time` | not null | |
| `end_time` | `time` | not null | |
| `energy_level` | `smallint` | not null, default `3`, check 1–5 | **Routine** energy: what I *usually* manage. |
| `is_active` | `boolean` | not null, default `true` | Pause a window without deleting it. |
| `created_at` / `updated_at` | `timestamptz` | not null, default `now()` | |

**Constraint:** `check (end_time > start_time)` — prevents saving 22:00–06:00 by
accident.

**Unique:** `(user_id, day_of_week, start_time)` so overlapping windows are
caught at insert time rather than silently double-booking a day.

**Indexes:** `(user_id, day_of_week)`, partial `(user_id) where is_active`.
| `id` | `uuid` | **PK**, default `gen_random_uuid()` | |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` on delete cascade | Ownership anchor for RLS. |
| `name` | `text` | not null, check length 1–120 | e.g. "Calculus" |
| `color` | `text` | not null, default `'#4f46e5'` | Hex colour for consistent UI. |
| `difficulty` | `smallint` | not null, default `3`, check 1–5 | Subject-level default difficulty. |
| `archived_at` | `timestamptz` | nullable | Soft-hide a past semester without deleting history. |
| `created_at` / `updated_at` | `timestamptz` | not null, default `now()` | |

**Indexes:** `(user_id)`, plus partial `(user_id) where archived_at is null` —
the dashboard nearly always filters to active subjects.