create table public.billing_entry_comments (
  id uuid not null default extensions.uuid_generate_v4 (),
  billing_entry_id uuid not null,
  comment text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_entry_comments_pkey primary key (id),
  constraint billing_entry_comments_billing_entry_id_fkey foreign KEY (billing_entry_id) references billing_entries (id) on delete CASCADE
) TABLESPACE pg_default;