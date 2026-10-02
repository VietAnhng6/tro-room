-- S2-05 prerequisite for public listing detail and S2-04 district filtering.
-- Run after the base tro_room.sql schema.

ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS district VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_buildings_district
    ON buildings(district);
