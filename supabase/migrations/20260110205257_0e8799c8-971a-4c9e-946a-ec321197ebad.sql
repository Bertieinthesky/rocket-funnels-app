-- Add poc_name column to companies table
ALTER TABLE public.companies
ADD COLUMN poc_name text;

-- Add new columns to files table for enhanced file management
ALTER TABLE public.files
ADD COLUMN title text,
ADD COLUMN description text,
ADD COLUMN video_hosted_link text,
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Create updated_at trigger for files table
CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update file category enum to include new categories (documents, images, testimonials, video)
-- First create new enum type
CREATE TYPE public.file_category_new AS ENUM ('documents', 'images', 'testimonials', 'video', 'brand', 'content', 'designs', 'copy', 'other');

-- Alter the column to use text temporarily
ALTER TABLE public.files 
ALTER COLUMN category DROP DEFAULT,
ALTER COLUMN category TYPE text;

-- Drop old enum and rename new one
DROP TYPE public.file_category;
ALTER TYPE public.file_category_new RENAME TO file_category;

-- Alter column back to enum with new default
ALTER TABLE public.files 
ALTER COLUMN category TYPE public.file_category USING category::public.file_category,
ALTER COLUMN category SET DEFAULT 'other'::public.file_category;