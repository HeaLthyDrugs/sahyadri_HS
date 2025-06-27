create table public.staff_billing_entries (
  id uuid not null default extensions.uuid_generate_v4 (),
  package_id uuid not null,
  product_id uuid not null,
  entry_date date not null,
  quantity integer not null default 0,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_by uuid null,
  updated_by uuid null,
  constraint staff_billing_entries_pkey primary key (id),
  constraint staff_billing_entries_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint staff_billing_entries_package_id_fkey foreign KEY (package_id) references packages (id),
  constraint staff_billing_entries_product_id_fkey foreign KEY (product_id) references products (id),
  constraint staff_billing_entries_updated_by_fkey foreign KEY (updated_by) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_staff_billing_entries_date on public.staff_billing_entries using btree (entry_date) TABLESPACE pg_default;