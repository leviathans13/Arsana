import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOutgoingLetters, useDeleteOutgoingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { formatDate } from '@/lib/utils';
import { OutgoingLetter, LetterCategory } from '@/types';

const categoryColors = {
  GENERAL: 'bg-gray-100 text-gray-800',
  INVITATION: 'bg-purple-100 text-purple-800',
  OFFICIAL: 'bg-blue-100 text-blue-800',
  ANNOUNCEMENT: 'bg-green-100 text-green-800',
};

const categoryLabels = {
  GENERAL: 'Umum',
  INVITATION: 'Undangan',
  OFFICIAL: 'Resmi',
  ANNOUNCEMENT: 'Pengumuman',
};

export default function OutgoingLettersPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LetterCategory | ''>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, error } = useOutgoingLetters({
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
  });

  const deleteLetterMutation = useDeleteOutgoingLetter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLetterMutation.mutateAsync(id);
      setShowConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete letter:', error);
    }
  };

  const handleDownload = (letter: OutgoingLetter) => {
    if (letter.filePath) {
      const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
      window.open(`${baseURL}/uploads/${letter.fileName}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const letters = data?.letters || [];
  const pagination = data?.pagination;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Surat Keluar</h1>
            <p className="text-gray-600">Kelola surat keluar organisasi Anda</p>
          </div>
          <Link
            href="/letters/outgoing/create"
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Surat</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor surat, subjek, atau penerima..."
                  className="input pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as LetterCategory | '')}
              >
                <option value="">Semua Kategori</option>
                <option value="GENERAL">Umum</option>
                <option value="INVITATION">Undangan</option>
                <option value="OFFICIAL">Resmi</option>
                <option value="ANNOUNCEMENT">Pengumuman</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Letters Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : letters.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Surat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Penerima
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {letters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {letter.letterNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {letter.subject}
                            </div>
                            {letter.isInvitation && letter.eventDate && (
                              <div className="flex items-center text-xs text-purple-600 mt-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(letter.eventDate)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {letter.recipient}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${categoryColors[letter.category]}`}>
                            {categoryLabels[letter.category]}
                          </span>
                          {letter.isInvitation && (
                            <span className="badge badge-primary ml-1">
                              Undangan
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(letter.sentDate)}
                        </td>
                        <td className="px-6 py-4">
                          {letter.fileName ? (
                            <button
                              onClick={() => handleDownload(letter)}
                              className="flex items-center text-sm text-primary-600 hover:text-primary-500"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {letter.fileName}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link
                              href={`/letters/outgoing/${letter.id}`}
                              className="text-gray-600 hover:text-gray-900"
                              title="Lihat"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {(user?.role === 'ADMIN' || letter.userId === user?.id) && (
                              <>
                                <Link
                                  href={`/letters/outgoing/${letter.id}/edit`}
                                  className="text-primary-600 hover:text-primary-900"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => setShowConfirmDelete(letter.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="bg-white px-6 py-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Menampilkan {((pagination.current - 1) * pagination.limit) + 1} sampai{' '}
                      {Math.min(pagination.current * pagination.limit, pagination.total)} dari{' '}
                      {pagination.total} hasil
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="btn btn-secondary text-sm disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                        disabled={currentPage >= pagination.pages}
                        className="btn btn-secondary text-sm disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada surat keluar</h3>
              <p className="text-gray-500 mb-4">
                Mulai dengan menambahkan surat keluar pertama Anda.
              </p>
              <Link
                href="/letters/outgoing/create"
                className="btn btn-primary"
              >
                Tambah Surat Keluar
              </Link>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Konfirmasi Hapus
              </h3>
              <p className="text-gray-600 mb-4">
                Apakah Anda yakin ingin menghapus surat ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className="btn btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(showConfirmDelete)}
                  disabled={deleteLetterMutation.isLoading}
                  className="btn btn-danger flex-1"
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