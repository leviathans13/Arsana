import React, { useState } from 'react';
import { Download, Eye, FileText, Image, FileImage } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface FileDownloadProps {
  letterId: string;
  letterType: 'incoming' | 'outgoing';
  fileName?: string;
  className?: string;
}

interface FileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  isViewable: boolean;
  letterNumber: string;
}

const FileDownload: React.FC<FileDownloadProps> = ({
  letterId,
  letterType,
  fileName: initialFileName,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const { token } = useAuth();

  // Check if file exists and get info
  const checkFileInfo = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/files/${letterType}/${letterId}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFileExists(data.exists);
        setFileInfo(data.fileInfo);
      }
    } catch (error) {
      console.error('Error checking file info:', error);
    }
  };

  // Initialize file info on mount
  React.useEffect(() => {
    checkFileInfo();
  }, [letterId, letterType, token]);

  const downloadFile = async () => {
    if (!token || loading) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/files/${letterType}/${letterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get filename from response headers or use fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = initialFileName || fileInfo?.fileName || 'document';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const previewFile = async () => {
    if (!token || loading || !fileInfo?.isViewable) return;

    try {
      const url = `/api/files/${letterType}/${letterId}/preview`;
      window.open(`${url}?token=${token}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (fileExists === false) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No file attached</p>
      </div>
    );
  }

  if (!fileInfo) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="animate-pulse flex items-center justify-center">
          <FileText className="h-6 w-6 text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading file info...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {getFileIcon(fileInfo.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileInfo.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(fileInfo.fileSize)} • {fileInfo.mimeType}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {fileInfo.isViewable && (
            <button
              onClick={previewFile}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              title="Preview file"
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </button>
          )}
          
          <button
            onClick={downloadFile}
            disabled={loading}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
            title="Download file"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-700 mr-1"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-3 w-3 mr-1" />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileDownload;