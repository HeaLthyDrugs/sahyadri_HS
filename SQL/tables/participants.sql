create table public.participants (
  id uuid not null default extensions.uuid_generate_v4 (),
  program_id uuid null,
  attendee_name text not null,
  security_checkin timestamp with time zone null,
  reception_checkin timestamp with time zone null,
  reception_checkout timestamp with time zone null,
  security_checkout timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  actual_arrival_date date null,
  actual_departure_date date null,
  type text not null default 'participant'::text,
  has_date_error boolean null default false,
  date_error_message text null,
  sequence_number integer null,
  constraint participants_pkey primary key (id),
  constraint participants_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE,
  constraint participants_type_check check (
    (
      type = any (
        array[
          'participant'::text,
          'guest'::text,
          'other'::text,
          'driver'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists participants_created_at_idx on public.participants using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists participants_attendee_name_idx on public.participants using btree (attendee_name) TABLESPACE pg_default;

create index IF not exists participants_type_idx on public.participants using btree (type) TABLESPACE pg_default;

create index IF not exists participants_actual_arrival_date_idx on public.participants using btree (actual_arrival_date) TABLESPACE pg_default;

create index IF not exists participants_actual_departure_date_idx on public.participants using btree (actual_departure_date) TABLESPACE pg_default;

create index IF not exists idx_participants_sequence_number on public.participants using btree (sequence_number) TABLESPACE pg_default;

create trigger participant_entry_calculator
after INSERT
or DELETE
or
update on participants for EACH row
execute FUNCTION calculate_entries_for_participant ();