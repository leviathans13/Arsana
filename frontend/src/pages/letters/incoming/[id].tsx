import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Download, 
  Calendar,
  FileText,
  User,
  Tag,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIncomingLetter, useDeleteIncomingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const categoryColors = {
  GENERAL: 'badge-gray',
  INVITATION: 'badge-primary',
  OFFICIAL: 'badge-info',
  ANNOUNCEMENT: 'badge-success',
};

const categoryLabels = {
  GENERAL: 'Umum',
  INVITATION: 'Undangan',
  OFFICIAL: 'Resmi',
  ANNOUNCEMENT: 'Pengumuman',
};

export default function IncomingLetterDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  const { data: letter, isLoading, error } = useIncomingLetter(id as string);
  const deleteLetterMutation = useDeleteIncomingLetter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleDelete = async () => {
    if (!letter) return;
    
    try {
      await deleteLetterMutation.mutateAsync(letter.id);
      toast.success('Surat masuk berhasil dihapus');
      router.push('/letters/incoming');
    } catch (error) {
      toast.error('Gagal menghapus surat masuk');
    }
  };

  const handleDownload = () => {
    if (letter?.filePath) {
      // Create a download link
      const link = document.createElement('a');
      link.href = `/api/files/${letter.filePath}`;
      link.download = letter.fileName || 'document';
      link.click();
    }
  };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner h-8 w-8"></div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Surat tidak ditemukan</h1>
          <p className="text-gray-600 mb-6">Surat yang Anda cari tidak ditemukan atau telah dihapus.</p>
          <Link href="/letters/incoming" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Daftar Surat
          </Link>
        </div>
      </Layout>
    );
  }

  if (!letter) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/letters/incoming"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="section-title">Detail Surat Masuk</h1>
              <p className="section-description">
                Nomor: {letter.letterNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/letters/incoming/${letter.id}/edit`}
              className="btn btn-secondary btn-sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-danger btn-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Letter Information */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Informasi Surat
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Subjek</label>
                  <p className="text-lg font-medium text-gray-900">{letter.subject}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Pengirim</label>
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{letter.sender}</span>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Kategori</label>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <span className={`badge ${categoryColors[letter.category as keyof typeof categoryColors]}`}>
                        {categoryLabels[letter.category as keyof typeof categoryLabels]}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="form-label">Tanggal Diterima</label>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{formatDate(letter.receivedDate)}</span>
                  </div>
                </div>
                {letter.description && (
                  <div>
                    <label className="form-label">Deskripsi</label>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{letter.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Event Information */}
            {letter.isInvitation && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Informasi Acara
                </h2>
                <div className="space-y-4">
                  {letter.eventDate && (
                    <div>
                      <label className="form-label">Tanggal & Waktu Acara</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{formatDate(letter.eventDate)}</span>
                      </div>
                    </div>
                  )}
                  {letter.eventLocation && (
                    <div>
                      <label className="form-label">Lokasi Acara</label>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{letter.eventLocation}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Attachment */}
            {letter.fileName && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">File Lampiran</h2>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{letter.fileName}</p>
                      <p className="text-xs text-gray-500">Klik untuk mengunduh</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="btn btn-primary btn-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Unduh
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tindakan Cepat</h3>
              <div className="space-y-3">
                <Link
                  href={`/letters/incoming/${letter.id}/edit`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Surat
                </Link>
                {letter.fileName && (
                  <button
                    onClick={handleDownload}
                    className="btn btn-secondary w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Unduh File
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-danger w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Surat
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-gray-600">Dibuat oleh</label>
                  <p className="font-medium">{letter.user.name}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Tanggal dibuat</label>
                  <p className="font-medium">{formatDate(letter.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Terakhir diubah</label>
                  <p className="font-medium">{formatDate(letter.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin menghapus surat "{letter.subject}"? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLetterMutation.isLoading}
                  className="btn btn-danger"
                >
                  {deleteLetterMutation.isLoading ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}