-- Run manually in the Supabase SQL Editor, after 001-003.
--
-- New tables aren't part of the realtime publication by default; the
-- Whiteboard needs live updates on jobs.

alter publication supabase_realtime add table jobs;
