create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '^[A-Za-z]+( [A-Za-z]+)*$'),
  age integer not null check (age between 0 and 120),
  gender text not null check (gender in ('Female', 'Male', 'Other')),
  ward text not null check (ward in ('General Ward', 'ICU', 'Pediatrics', 'Maternity', 'Surgical Ward', 'Private Room')),
  department text not null check (department in ('Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Surgery', 'Oncology', 'Gynecology')),
  doctor text not null check (doctor in ('Dr. Ananya Sharma', 'Dr. Rohan Mehta', 'Dr. Priya Rao', 'Dr. Arjun Kapoor', 'Dr. Meera Nair', 'Dr. Kunal Das')),
  admission_date date not null,
  status text not null default 'Admitted' check (status in ('Admitted', 'Discharged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_created_at_idx on public.patients (created_at desc);
create index if not exists patients_name_idx on public.patients (name);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists patients_updated_at on public.patients;
create trigger patients_updated_at before update on public.patients
for each row execute function public.set_updated_at();

-- The API uses the service role key on the server. Keep it private and do not
-- expose it to React. Enable RLS so direct public access is not available.
alter table public.patients enable row level security;

