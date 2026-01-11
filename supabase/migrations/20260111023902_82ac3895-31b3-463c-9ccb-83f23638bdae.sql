-- Add 'one_time' to the retainer_type enum
ALTER TYPE public.retainer_type ADD VALUE IF NOT EXISTS 'one_time';