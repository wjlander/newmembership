# Supabase Storage Bucket Setup

## Issue

When trying to upload documents, you see the error: **"Bucket not found"**

## Cause

The Supabase Storage bucket named "documents" doesn't exist in your project yet. Storage buckets must be created manually in the Supabase dashboard because bucket creation requires service-role privileges.

## Solution: Create the Storage Bucket

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar

### Step 2: Create the Bucket

1. Click **"New bucket"** or **"Create a new bucket"**
2. Fill in the bucket details:
   - **Name**: `documents` (must be exactly this name)
   - **Public bucket**: ✅ **Yes, enable** (so documents can be accessed via URLs)
   - **File size limit**: `10485760` bytes (10MB) - optional but recommended
   - **Allowed MIME types**: Leave blank or add specific types - optional

3. Click **"Create bucket"**

### Step 3: Configure Bucket Policies (Optional but Recommended)

For better security, set up Row Level Security policies:

1. In Storage → Click on the "documents" bucket
2. Go to **Policies** tab
3. Add these policies:

**Upload Policy (Admins only):**
```sql
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role IN ('admin', 'super_admin')
    )
  )
);
```

**Read Policy (Public for public docs, authenticated for private):**
```sql
CREATE POLICY "Anyone can view public documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

**Delete Policy (Admins only):**
```sql
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role IN ('admin', 'super_admin')
    )
  )
);
```

### Step 4: Verify Setup

1. Go back to your application
2. Navigate to Admin Portal → Documents
3. The yellow warning banner should disappear
4. Try uploading a test document
5. If successful, you'll see "Document uploaded successfully"

## Troubleshooting

### Warning Banner Still Shows

- **Refresh the page**: The bucket check runs on component mount
- **Check bucket name**: Must be exactly `documents` (lowercase, no spaces)
- **Check public access**: Ensure the bucket is marked as public

### Upload Still Fails

1. **Check file size**: Maximum 10MB per file
2. **Check file type**: Supported types include:
   - PDFs (application/pdf)
   - Word documents (.doc, .docx)
   - Excel spreadsheets (.xls, .xlsx)
   - Images (JPEG, PNG, GIF)
   - Text files (.txt, .csv)

3. **Check browser console**: Open Developer Tools → Console for detailed error messages

4. **Check Supabase logs**: 
   - Go to Supabase Dashboard → Logs
   - Look for storage-related errors

### Permission Errors

If you get "permission denied" errors:

1. Verify you're logged in as an admin
2. Check the RLS policies in Supabase (see Step 3 above)
3. Make sure your profile has `role = 'admin'` or `role = 'super_admin'`

## Technical Details

### Why Manual Setup?

Storage bucket creation requires the Supabase **service role key**, which has full administrative privileges. For security reasons:
- Service role keys should never be exposed to the browser
- Client-side JavaScript only has access to the **anon key** (public, limited privileges)
- Bucket creation must be done via Supabase Dashboard or server-side scripts

### Bucket Configuration

The application expects this bucket configuration:

| Setting | Value | Required |
|---------|-------|----------|
| **Name** | `documents` | ✅ Yes |
| **Public** | `true` | ✅ Yes |
| **File size limit** | `10485760` (10MB) | ⚠️ Recommended |
| **Allowed MIME types** | PDF, Word, Excel, Images, Text | ⚠️ Recommended |

### File Storage Structure

Documents are stored with this path structure:
```
documents/
  └── {organizationId}/
      └── {timestamp}-{filename}.pdf
```

Example:
```
documents/
  └── 550e8400-e29b-41d4-a716-446655440000/
      └── 1633024800000-membership-form.pdf
```

This ensures:
- **Organization isolation**: Each org's files are in separate folders
- **Unique filenames**: Timestamps prevent name collisions
- **Easy cleanup**: Delete all files for an organization by removing the folder

### Database Records

Each uploaded document also creates a record in the `documents` table:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES profiles(user_id),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Related Files

- **Component**: `src/components/admin/DocumentsManager.tsx`
- **Storage Utils**: `src/lib/storage/documents.ts`
- **Bucket Check**: Runs on component mount via `checkBucket()`

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Creating Storage Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [Storage Security](https://supabase.com/docs/guides/storage/security/access-control)
