create table public.billing_entries (
  id uuid not null,
  program_id uuid null,
  package_id uuid null,
  product_id uuid null,
  entry_date date not null,
  quantity integer not null,
  constraint billing_entries_pkey primary key (id),
  constraint billing_entries_program_id_package_id_product_id_entry_date_key unique (program_id, package_id, product_id, entry_date),
  constraint billing_entries_package_id_fkey foreign KEY (package_id) references packages (id),
  constraint billing_entries_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint billing_entries_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_billing_entries_lookup on public.billing_entries using btree (program_id, package_id, product_id, entry_date) TABLESPACE pg_default;