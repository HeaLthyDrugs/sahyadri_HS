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
  constraint programs_pkey primary key (id),
  constraint programs_status_check check (
    (
      (status)::text = any (
        (
          array[
            'Upcoming'::character varying,
            'Ongoing'::character varying,
            'Completed'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;