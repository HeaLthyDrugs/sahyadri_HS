create table public.staff_comments (
  id bigserial not null,
  staff_id bigint not null,
  comment text not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_at timestamp with time zone null default now(),
  constraint staff_comments_pkey primary key (id),
  constraint staff_comments_created_by_fkey foreign key (created_by) references auth.users (id),
  constraint staff_comments_staff_id_fkey foreign key (staff_id) references public.staff (id) on delete cascade
) TABLESPACE pg_default;

create index IF not exists idx_staff_comments_staff_id on public.staff_comments using btree (staff_id) TABLESPACE pg_default;

create trigger update_staff_comments_updated_at BEFORE
update on staff_comments for EACH row
execute FUNCTION update_updated_at_column ();