-- Cap the proposals bucket at 10 MB server-side, so the limit holds even if a
-- client bypasses the upload form. Matches MAX_BYTES in the app.
update storage.buckets
   set file_size_limit = 10 * 1024 * 1024
 where id = 'proposals';
