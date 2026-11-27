-- Sample data. Insert-only: every statement uses ON CONFLICT DO NOTHING, and the migration
-- runner executes this file only once (marker 'seed:v1' in app_meta), so it never overwrites
-- admin edits, re-activates deactivated items or re-creates deleted working hours.

INSERT INTO locations (slug, city, name, address, sort_order) VALUES
  ('sofia',  'София', 'Сладка кутия – София', 'ул. „Примерна“ 1, София (адресът ще бъде уточнен)', 1),
  ('burgas', 'Бургас', 'Сладка кутия – Бургас', 'ул. „Примерна“ 2, Бургас (адресът ще бъде уточнен)', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO consultants (slug, name, location_id, buffer_minutes, sort_order)
SELECT v.slug, v.name, l.id, 15, v.sort_order
FROM (VALUES
  ('maria-sofia', 'Мария Петрова', 'sofia', 1),
  ('georgi-burgas', 'Георги Николов', 'burgas', 2)
) AS v(slug, name, location_slug, sort_order)
JOIN locations l ON l.slug = v.location_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tasting_types (slug, name, description, duration_minutes, price_cents, sort_order) VALUES
  ('office-team', 'Офис дегустация за екип',
   'Носим подбрани кутии за целия екип: опитвате, сравнявате и избирате абонамент за офиса.', 90, 12000, 1),
  ('personal', 'Лична дегустация',
   'Спокойна среща един към един с консултант, за да откриете любимите си вкусове.', 45, 2500, 2),
  ('kids-birthday', 'Кутия за детски рожден ден',
   'Весела дегустация за малките гости с изненади и сладки, подходящи за деца.', 60, 6000, 3)
ON CONFLICT (slug) DO NOTHING;

-- Weekdays 09:00–18:00 for both consultants.
INSERT INTO weekly_hours (consultant_id, iso_weekday, start_time, end_time)
SELECT c.id, d.wd, '09:00', '18:00'
FROM consultants c
CROSS JOIN generate_series(1, 5) AS d(wd)
WHERE c.slug IN ('maria-sofia', 'georgi-burgas')
ON CONFLICT (consultant_id, iso_weekday, start_time) DO NOTHING;
