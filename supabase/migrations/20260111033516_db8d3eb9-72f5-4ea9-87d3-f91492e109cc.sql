-- Add is_optimized column to files table
ALTER TABLE public.files 
ADD COLUMN is_optimized boolean DEFAULT false;

-- Add original_file_size to track compression savings
ALTER TABLE public.files 
ADD COLUMN original_file_size bigint DEFAULT null;