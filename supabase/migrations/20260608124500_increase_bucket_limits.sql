-- Increase file size limit for report-attachments (25MB) and report-documents (50MB)
UPDATE storage.buckets SET file_size_limit = 26214400 WHERE id = 'report-attachments';
UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'report-documents';
