import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
    catalogId?: string;  // Agora opcional para suportar documentos globais
    onUploadComplete?: () => void;
}

interface UploadingFile {
    name: string;
    progress: number;
    status: 'uploading' | 'processing' | 'complete' | 'error';
    error?: string;
    documentId?: string;
}

export function DocumentUpload({ catalogId, onUploadComplete }: DocumentUploadProps) {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            // Add to uploading list
            setUploadingFiles(prev => [...prev, {
                name: file.name,
                progress: 0,
                status: 'uploading'
            }]);

            try {
                // Upload file
                const formData = new FormData();
                formData.append('file', file);

                // Adicionar catalogId apenas se fornecido
                if (catalogId) {
                    formData.append('catalogId', catalogId);
                }

                const response = await fetch('/api/documents/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    const documentId = data.document.id;

                    // Update to processing status
                    setUploadingFiles(prev => prev.map(f =>
                        f.name === file.name
                            ? { ...f, status: 'processing', documentId, progress: 50 }
                            : f
                    ));

                    // Poll for processing status
                    monitorProcessing(file.name, documentId);
                } else {
                    throw new Error(data.error || 'Erro no upload');
                }
            } catch (error: any) {
                setUploadingFiles(prev => prev.map(f =>
                    f.name === file.name
                        ? { ...f, status: 'error', error: error.message }
                        : f
                ));
            }
        }
    }, [catalogId]);

    const monitorProcessing = async (fileName: string, documentId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/documents/${documentId}/status`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });

                const data = await response.json();

                setUploadingFiles(prev => prev.map(f =>
                    f.documentId === documentId
                        ? {
                            ...f,
                            progress: data.processingProgress || 50,
                            status: data.indexed ? 'complete' : 'processing',
                            error: data.processingError
                        }
                        : f
                ));

                if (data.indexed || data.processingError) {
                    clearInterval(interval);
                    if (data.indexed && onUploadComplete) {
                        onUploadComplete();
                    }
                }
            } catch (error) {
                console.error('Error checking status:', error);
                clearInterval(interval);
            }
        }, 2000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(interval), 300000);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        },
        maxSize: 50 * 1024 * 1024 // 50MB
    });

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                    }
        `}
            >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Solte os arquivos aqui...
                    </p>
                ) : (
                    <>
                        <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                            Arraste documentos aqui ou clique para selecionar
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Suporta PDF, DOCX, TXT (máx. 50MB)
                        </p>
                    </>
                )}
            </div>

            {/* Upload Progress */}
            {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                    {uploadingFiles.map((file, index) => (
                        <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate">
                                        {file.name}
                                    </span>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    {file.status === 'uploading' && (
                                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    )}
                                    {file.status === 'processing' && (
                                        <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                    )}
                                    {file.status === 'complete' && (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    )}
                                    {file.status === 'error' && (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {file.status !== 'error' && (
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${file.status === 'complete'
                                            ? 'bg-green-500'
                                            : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${file.progress}%` }}
                                    />
                                </div>
                            )}

                            {/* Status Text */}
                            <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                                {file.status === 'uploading' && 'Fazendo upload...'}
                                {file.status === 'processing' && 'Processando documento...'}
                                {file.status === 'complete' && '✓ Indexado e pronto para uso'}
                                {file.status === 'error' && `Erro: ${file.error}`}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
