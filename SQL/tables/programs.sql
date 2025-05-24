create table public.programs (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  start_date date not null,
  start_time time without time zone not null default '09:00:00'::time without time zone,
  end_date date not null,
  end_time time without time zone not null default '17:00:00'::time without time zone,
  days integer not null,
  total_participants integer not null,
  status character varying(20) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  customer_name character varying(255) not null,
  program_number serial not null,
  package_id uuid null,
  constraint programs_pkey primary key (id),
  constraint programs_package_id_fkey foreign KEY (package_id) references packages (id),
  constraint programs_status_check check (
    (
      (status)::text = any (
        array[
          ('Upcoming'::character varying)::text,
          ('Ongoing'::character varying)::text,
          ('Completed'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trigger_update_program_month_mapping
after INSERT
or
update OF end_date on programs for EACH row
execute FUNCTION update_program_month_mapping ();