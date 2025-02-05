create table public.report_comments (
  id uuid not null default gen_random_uuid (),
  report_type character varying(50) not null,
  reference_id character varying(255) not null,
  month character varying(7) null,
  comment text not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_by uuid null,
  updated_by uuid null,
  constraint report_comments_pkey primary key (id),
  constraint report_comments_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint report_comments_updated_by_fkey foreign KEY (updated_by) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_report_comments_lookup on public.report_comments using btree (report_type, reference_id, month) TABLESPACE pg_default;

create trigger update_report_comments_updated_at BEFORE
update on report_comments for EACH row
execute FUNCTION update_updated_at_column ();