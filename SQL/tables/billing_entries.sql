create table public.billing_entries (
  id uuid not null default extensions.uuid_generate_v4 (),
  program_id uuid null,
  package_id uuid null,
  product_id uuid null,
  participant_id uuid null,
  entry_date date not null,
  quantity integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_entries_pkey primary key (id),
  constraint billing_entries_program_id_package_id_product_id_entry_date_key unique (program_id, package_id, product_id, entry_date),
  constraint billing_entries_package_id_fkey foreign KEY (package_id) references packages (id),
  constraint billing_entries_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint billing_entries_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE,
  constraint billing_entries_participant_id_fkey foreign KEY (participant_id) references participants (id) on delete CASCADE,
  constraint billing_entries_quantity_check check ((quantity >= 0))
) TABLESPACE pg_default;