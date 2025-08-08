create table public.permissions (
  id uuid not null default extensions.uuid_generate_v4 (),
  role_id uuid null,
  page_name text not null,
  can_view boolean null default false,
  can_edit boolean null default false,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint permissions_pkey primary key (id),
  constraint permissions_role_id_page_name_key unique (role_id, page_name),
  constraint permissions_role_id_fkey foreign KEY (role_id) references roles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_permissions_page_name on public.permissions using btree (page_name) TABLESPACE pg_default;

create index IF not exists idx_permissions_role_id on public.permissions using btree (role_id) TABLESPACE pg_default;

create trigger update_permissions_updated_at BEFORE
update on permissions for EACH row
execute FUNCTION update_updated_at_column ();