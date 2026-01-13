import React from 'react';
import { FileText, Trash2, RefreshCw, Download } from 'lucide-react';

interface Document {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath?: string;  // Caminho do arquivo para download
    indexed: boolean;
    processingProgress: number;
    processingError?: string | null;
    chunkCount?: number | null;
    totalTokens?: number | null;
    uploadedAt: string;
    indexedAt?: string | null;
}

interface DocumentListProps {
    documents: Document[];
    onDelete: (documentId: string) => void;
    onReindex: (documentId: string) => void;
    onDownload?: (documentId: string, fileName: string) => void;
    renderExtraActions?: (doc: Document) => React.ReactNode;
}

export function DocumentList({ documents, onDelete, onReindex, onDownload, renderExtraActions }: DocumentListProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDownload = async (docId: string, fileName: string) => {
        if (onDownload) {
            onDownload(docId, fileName);
        }
    };

    const getFileIcon = (fileType: string) => {
        return <FileText className="w-5 h-5 text-gray-500" />;
    };

    if (documents.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento enviado ainda</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {documents.map((doc) => (
                <div
                    key={doc.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {getFileIcon(doc.fileType)}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {doc.fileName}
                                </h4>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    {doc.indexed && doc.chunkCount && (
                                        <span>{doc.chunkCount} chunks</span>
                                    )}
                                    {doc.indexed && doc.totalTokens && (
                                        <span>{doc.totalTokens.toLocaleString()} tokens</span>
                                    )}
                                </div>

                                {/* Status Badge */}
                                <div className="mt-2">
                                    {doc.indexed ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            ✓ Indexado
                                        </span>
                                    ) : doc.processingError ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                            ✗ Erro: {doc.processingError}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            ⏳ Processando... {doc.processingProgress}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                            {/* Extra Actions (e.g., Move to Folder) */}
                            {renderExtraActions && renderExtraActions(doc)}
                            {/* Download Button */}
                            <button
                                onClick={() => handleDownload(doc.id, doc.fileName)}
                                className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                title="Baixar documento"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            {doc.indexed && (
                                <button
                                    onClick={() => onReindex(doc.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Reindexar documento"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(doc.id)}
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Deletar documento"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
