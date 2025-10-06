import { supabase } from '@/lib/supabase/client';

export interface Document {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
  category: 'general' | 'policy' | 'form' | 'guide' | 'legal' | 'financial' | 'other';
  is_public: boolean;
  uploaded_by: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentOptions {
  name: string;
  description?: string;
  category: Document['category'];
  is_public: boolean;
  uploaded_by: string;
}

export async function uploadDocument(
  organizationId: string,
  file: File,
  options: UploadDocumentOptions
): Promise<Document> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: organizationId,
        name: options.name,
        description: options.description || null,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: options.category,
        is_public: options.is_public,
        uploaded_by: options.uploaded_by
      })
      .select()
      .single();

    if (docError) {
      await supabase.storage.from('documents').remove([fileName]);
      throw new Error(`Database insert failed: ${docError.message}`);
    }

    return docData;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to upload document');
  }
}

export async function getOrganizationDocuments(organizationId: string): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch documents');
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error('Document not found');
    }

    const filePath = doc.file_url.split('/').slice(-2).join('/');

    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion failed:', storageError);
    }

    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      throw new Error(`Failed to delete document: ${dbError.message}`);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete document');
  }
}

export async function downloadDocument(fileUrl: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    const { error } = await supabase.rpc('increment_document_downloads', {
      doc_id: fileUrl
    });

    if (error) {
      console.error('Failed to increment download count:', error);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to download document');
  }
}
