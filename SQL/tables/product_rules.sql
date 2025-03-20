create table public.product_rules (
  id uuid not null default extensions.uuid_generate_v4 (),
  participant_type text not null,
  product_id uuid not null,
  allowed boolean not null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint product_rules_pkey primary key (id),
  constraint product_rules_participant_type_product_id_key unique (participant_type, product_id),
  constraint product_rules_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_product_rules_participant_type on public.product_rules using btree (participant_type) TABLESPACE pg_default;

create index IF not exists idx_product_rules_product_id on public.product_rules using btree (product_id) TABLESPACE pg_default;