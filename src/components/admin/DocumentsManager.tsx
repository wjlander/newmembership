import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Trash2, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadDocument, deleteDocument, getOrganizationDocuments, downloadDocument, type Document } from '@/lib/storage/documents';
import { supabase } from '@/lib/supabase/client';

interface DocumentsManagerProps {
  organizationId: string;
  userId: string;
}

export function DocumentsManager({ organizationId, userId }: DocumentsManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentCategory, setDocumentCategory] = useState<Document['category']>('general');
  const [isPublic, setIsPublic] = useState(false);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);

  useEffect(() => {
    checkBucket();
  }, []);

  useEffect(() => {
    if (bucketExists) {
      loadDocuments();
    }
  }, [organizationId, bucketExists]);

  const checkBucket = async () => {
    try {
      // Try to list files in the bucket - this is a client-safe operation
      const { error } = await supabase.storage
        .from('documents')
        .list('', { limit: 1 });
      
      if (error) {
        // Check if error indicates bucket doesn't exist
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.warn('Documents bucket does not exist - manual setup required');
          setBucketExists(false);
          setLoading(false); // Stop loading to show warning banner
        } else {
          // Other errors (permissions, etc.) - assume bucket exists but there's an issue
          console.error('Error checking bucket:', error);
          setBucketExists(true); // Allow uploads to try and show real error
          // Let loadDocuments handle loading state
        }
        return;
      }

      // Bucket exists if we got here without error
      setBucketExists(true);
      // Let loadDocuments handle loading state
    } catch (error: any) {
      console.error('Bucket check error:', error);
      setBucketExists(false);
      setLoading(false); // Stop loading to show warning banner
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getOrganizationDocuments(organizationId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size exceeds maximum allowed size of 10MB. Selected file is ${formatFileSize(file.size)}.`);
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name);
      }
    }
  };

  const handleUpload = async () => {
    if (bucketExists === false) {
      toast.error('Document storage bucket not found. Please create the "documents" bucket in Supabase Storage settings.');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!documentName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      setUploading(true);
      await uploadDocument(organizationId, selectedFile, {
        name: documentName,
        description: documentDescription,
        category: documentCategory,
        is_public: isPublic,
        uploaded_by: userId
      });

      toast.success('Document uploaded successfully');
      
      setSelectedFile(null);
      setDocumentName('');
      setDocumentDescription('');
      setDocumentCategory('general');
      setIsPublic(false);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(documentId);
      toast.success('Document deleted successfully');
      await loadDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocument(doc.file_url, doc.name);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="p-8 text-center">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Document Library</h2>
      </div>

      {bucketExists === false && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Storage Bucket Setup Required:</strong> The "documents" storage bucket needs to be created in your Supabase project.
                {' '}Go to your Supabase Dashboard → Storage → Create a new bucket called "documents" with Public access enabled. 
                <a 
                  href="https://supabase.com/dashboard/project/_/storage/buckets" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium hover:text-yellow-800"
                >
                  Open Supabase Storage
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {selectedFile ? (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Maximum file size: 10MB
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              placeholder="Brief description of the document"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={documentCategory}
              onValueChange={(value: any) => setDocumentCategory(value)}
            >
              <SelectTrigger id="category" disabled={uploading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(!!checked)}
              disabled={uploading}
            />
            <Label htmlFor="is_public">Make this document publicly accessible</Label>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No documents uploaded yet. Upload your first document above.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{doc.category}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{doc.download_count} downloads</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
