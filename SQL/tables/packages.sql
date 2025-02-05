create table public.packages (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  description text null,
  type character varying(100) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint packages_pkey primary key (id)
) TABLESPACE pg_default;