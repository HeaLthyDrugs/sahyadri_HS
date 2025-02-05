create table public.staff (
  id bigserial not null,
  name text not null,
  type public.staff_type not null,
  organisation text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint staff_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_staff_name on public.staff using btree (name) TABLESPACE pg_default;

create index IF not exists idx_staff_type on public.staff using btree (type) TABLESPACE pg_default;

create index IF not exists idx_staff_organisation on public.staff using btree (organisation) TABLESPACE pg_default;

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();