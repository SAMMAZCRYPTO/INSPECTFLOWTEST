-- Fix specialization column type mismatch
-- Change from TEXT[] (array) to TEXT (string) to match form behavior

ALTER TABLE inspectors
ALTER COLUMN specialization TYPE TEXT;

COMMENT ON COLUMN inspectors.specialization IS 'Inspector area of specialization or expertise';
