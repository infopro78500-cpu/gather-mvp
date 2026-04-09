-- Indexes recommandés (basés sur les requêtes observées dans le code)

-- Recherche d'événement par PIN (app/join, app/events/[pin])
create index if not exists events_pin_idx on public.events (pin);

-- Tri des leads par date (app/admin)
create index if not exists leads_landing_created_at_idx on public.leads_landing (created_at desc);

-- Filtrage/maintenance potentielle par expiration
create index if not exists events_expires_at_idx on public.events (expires_at);

-- Filtrage futur possible par hôte (si utilisé en back-office)
create index if not exists events_host_user_id_idx on public.events (host_user_id);
