-- Suggestions can point at a spot in the house (house coordinates, meters).
alter table public.comments
  add column pos_x double precision,
  add column pos_z double precision,
  add column room_id text check (room_id is null or char_length(room_id) <= 64),
  add constraint comments_pos_pair check ((pos_x is null) = (pos_z is null));
