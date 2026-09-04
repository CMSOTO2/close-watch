-- Back to 25 MB, where the cap started.
--
-- 10 MB is a comfortable ceiling for a text proposal and a mean one for the
-- kind this product is aimed at: an agency deck carrying case-study photography
-- and a full-bleed cover clears it easily, and being told to compress the
-- document is a bad first minute. The storage cost of the difference is
-- rounding error next to a $19 subscription.
--
-- Server-side as well as in the app, so the limit holds against a client that
-- skips the upload form. PDF_MAX_MB in src/constants.ts has to match; it is the
-- single source everything else in the app reads.
update storage.buckets
   set file_size_limit = 25 * 1024 * 1024
 where id = 'proposals';
