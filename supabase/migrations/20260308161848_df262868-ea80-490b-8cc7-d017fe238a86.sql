
-- Create body progress tracking table
CREATE TABLE public.body_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  body_fat NUMERIC,
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  biceps NUMERIC,
  thighs NUMERIC,
  notes TEXT,
  photo_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

-- RLS policy for authenticated users
CREATE POLICY "Authenticated users can manage body progress"
  ON public.body_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Updated at trigger
CREATE TRIGGER update_body_progress_updated_at
  BEFORE UPDATE ON public.body_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload progress photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'progress-photos');

CREATE POLICY "Authenticated users can view progress photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'progress-photos');

CREATE POLICY "Authenticated users can delete progress photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'progress-photos');
