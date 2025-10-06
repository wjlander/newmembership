import { supabase } from '@/lib/supabase/client';

/**
 * Initialize the documents storage bucket
 * This should be called once during setup
 */
export async function initDocumentsBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError.message };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'documents');

    if (bucketExists) {
      console.log('Documents bucket already exists');
      return { success: true, message: 'Bucket already exists' };
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 10485760, // 10MB in bytes
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'text/csv'
      ]
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return { success: false, error: error.message };
    }

    console.log('Documents bucket created successfully:', data);
    return { success: true, message: 'Bucket created successfully', data };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
