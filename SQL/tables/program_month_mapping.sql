create table public.program_month_mappings (
  id uuid not null default extensions.uuid_generate_v4 (),
  program_id uuid not null,
  billing_month character varying(7) not null,
  created_at timestamp with time zone null default now(),
  constraint program_month_mappings_pkey primary key (id),
  constraint program_month_mappings_program_id_key unique (program_id),
  constraint program_month_mappings_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_program_month_mappings_billing_month on public.program_month_mappings using btree (billing_month) TABLESPACE pg_default;