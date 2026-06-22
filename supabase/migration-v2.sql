-- ============================================================
-- MIGRATION V2
-- Corre esto en Supabase → SQL Editor → New query
-- ============================================================

-- 1. Renombrar ticker → activo en assets
alter table assets rename column ticker to activo;

-- 2. Eliminar fees de transactions
alter table transactions drop column if exists fees;

-- 3. Agregar currency, exchange_rate, total_usd a transactions
alter table transactions
  add column if not exists currency text not null default 'USD'
    check (currency in ('USD', 'MXN')),
  add column if not exists exchange_rate numeric(10, 6) not null default 1,
  add column if not exists total_usd numeric(18, 4);

-- 4. Poblar total_usd en filas existentes (asumimos que ya estaban en USD)
update transactions set total_usd = total_amount where total_usd is null;

-- 5. Hacer total_usd not null
alter table transactions alter column total_usd set not null;

-- 6. Recrear el view holdings con el nuevo nombre de columna
drop view if exists holdings;

create or replace view holdings as
select
  t.user_id,
  t.asset_id,
  a.name,
  a.activo,
  a.category,
  a.risk_profile,
  a.currency,
  a.category_id,
  sum(case when t.transaction_type = 'buy'  then t.quantity else 0 end)
  - sum(case when t.transaction_type = 'sell' then t.quantity else 0 end)
    as quantity,
  sum(case when t.transaction_type = 'buy' then t.total_usd else 0 end)
  / nullif(
      sum(case when t.transaction_type = 'buy' then t.quantity else 0 end), 0
    )
    as avg_cost_usd
from transactions t
join assets a on a.id = t.asset_id
where t.transaction_type in ('buy', 'sell')
group by t.user_id, t.asset_id, a.name, a.activo, a.category, a.risk_profile, a.currency, a.category_id;
