create table public.products (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  description text null,
  package_id uuid null,
  rate numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  index integer not null,
  slot_start time without time zone not null,
  slot_end time without time zone not null,
  serve_item_no integer null,
  quantity text null,
  constraint products_pkey primary key (id),
  constraint products_index_unique unique (index),
  constraint products_package_id_fkey foreign KEY (package_id) references packages (id) on delete CASCADE
) TABLESPACE pg_default;