-- billing_entries table 
create table
  public.billing_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id uuid REFERENCES programs(id),
    package_id uuid REFERENCES packages(id),
    product_id uuid REFERENCES products(id),
    entry_date date NOT NULL,
    quantity integer NOT NULL DEFAULT 0,
    UNIQUE(program_id, package_id, product_id, entry_date)
  ) tablespace pg_default;

  -- categories table 
create table
  public.categories (
    id uuid not null default extensions.uuid_generate_v4 (),
    name text not null,
    description text null,
    color text not null default '#E5E7EB'::text,
    text_color text not null default '#1F2937'::text,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    constraint categories_pkey primary key (id)
  ) tablespace pg_default;


  -- invoice_config table 
  create table
  public.invoice_config (
    id uuid not null default extensions.uuid_generate_v4 (),
    company_name text not null,
    from_address text[] null default '{}'::text[],
    gstin text null,
    pan text null,
    footer_note text null,
    logo_url text null,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
    bill_to_address text[] null default '{}'::text[],
    constraint invoice_config_pkey primary key (id)
  ) tablespace pg_default;



-- invoice_items table 
create table
  public.invoice_items (
    id uuid not null default gen_random_uuid (),
    invoice_id uuid not null,
    product_id uuid not null,
    quantity integer not null,
    rate numeric(10, 2) not null,
    amount numeric(10, 2) not null,
    created_at timestamp with time zone null default now(),
    constraint invoice_items_pkey primary key (id),
    constraint invoice_items_invoice_id_fkey foreign key (invoice_id) references invoices (id),
    constraint invoice_items_product_id_fkey foreign key (product_id) references products (id)
  ) tablespace pg_default;


  -- invoices table 
create table
  public.invoices (
    id uuid not null default gen_random_uuid (),
    package_id uuid not null,
    program_id uuid null,
    invoice_number character varying(50) not null,
    invoice_date date not null,
    billing_period_start date not null,
    billing_period_end date not null,
    subtotal numeric(10, 2) not null,
    gst_amount numeric(10, 2) not null,
    total_amount numeric(10, 2) not null,
    status character varying(20) not null default 'PENDING'::character varying,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint invoices_pkey primary key (id),
    constraint invoices_package_id_fkey foreign key (package_id) references packages (id),
    constraint invoices_program_id_fkey foreign key (program_id) references programs (id),
    constraint invoices_status_check check (
      (
        (status)::text = any (
          (
            array[
              'PENDING'::character varying,
              'PAID'::character varying,
              'CANCELLED'::character varying
            ]
          )::text[]
        )
      )
    )
  ) tablespace pg_default;

create trigger update_invoices_updated_at before
update on invoices for each row
execute function update_updated_at_column ();


-- packages table 
create table
  public.packages (
    id uuid not null default gen_random_uuid (),
    name character varying(255) not null,
    description text null,
    type character varying(100) not null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint packages_pkey primary key (id)
  ) tablespace pg_default;

create trigger update_packages_updated_at before
update on packages for each row
execute function update_updated_at_column ();


-- participants table 
create table
  public.participants (
    id uuid not null default extensions.uuid_generate_v4 (),
    attendee_name text not null,
    security_checkin timestamp with time zone null,
    reception_checkin timestamp with time zone not null,
    reception_checkout timestamp with time zone not null,
    security_checkout timestamp with time zone null,
    created_at timestamp with time zone not null default now(),
    type text null default 'participant'::text,
    program_id uuid null,
    constraint participants_pkey primary key (id),
    constraint participants_program_id_fkey foreign key (program_id) references programs (id) on delete cascade
  ) tablespace pg_default;

create index if not exists participants_created_at_idx on public.participants using btree (created_at desc) tablespace pg_default;

create index if not exists participants_attendee_name_idx on public.participants using btree (attendee_name) tablespace pg_default;


-- products table 
create table
  public.products (
    id uuid not null default gen_random_uuid (),
    name character varying(255) not null,
    description text null,
    package_id uuid null,
    rate numeric(10, 2) not null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    index integer not null,
    slot_start time without time zone not null,
    slot_end time without time zone not null,
    category uuid not null,
    constraint products_pkey primary key (id),
    constraint products_index_unique unique (index),
    constraint products_category_fkey foreign key (category) references categories (id),
    constraint products_package_id_fkey foreign key (package_id) references packages (id) on delete cascade
  ) tablespace pg_default;

create trigger update_products_updated_at before
update on products for each row
execute function update_updated_at_column ();


-- programs table 
create table
  public.programs (
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
  ) tablespace pg_default;

create trigger update_programs_updated_at before
update on programs for each row
execute function update_updated_at_column ();


-- profiles table 
create table
  public.profiles (
    id uuid not null,
    username text not null,
    role text not null default 'staff'::text,
    full_name text null,
    avatar_url text null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint profiles_pkey primary key (id),
    constraint profiles_username_key unique (username),
    constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade,
    constraint profiles_role_check check (
      (
        role = any (
          array['admin'::text, 'staff'::text, 'owner'::text]
        )
      )
    )
  ) tablespace pg_default;

-- Remove product_rules table if it exists
DROP TABLE IF EXISTS product_rules;

-- Ensure products table has slot_start and slot_end
ALTER TABLE products ADD COLUMN IF NOT EXISTS slot_start time without time zone NOT NULL DEFAULT '00:00:00';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slot_end time without time zone NOT NULL DEFAULT '23:59:59';



