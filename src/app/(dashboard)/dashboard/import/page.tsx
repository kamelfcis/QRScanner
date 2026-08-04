'use client';

import { useState, useCallback } from 'react';
import { useImportJobs, useDeleteImportJob } from '@/hooks/useImportJobs';
import { startImportPipeline, confirmImport, updateJobData } from '@/lib/import/pipeline';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { FileUpload } from '@/components/import/FileUpload';
import { ImportPreview } from '@/components/import/ImportPreview';
import { ImportStatus } from '@/components/import/ImportStatus';
import type { ImportJob, ImportExtractedData } from '@/types/database';
import { FileUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';

type View = 'list' | 'upload' | 'preview';

export default function ImportPage() {
  const { data: jobs, isLoading, error, refetch } = useImportJobs();
  const deleteMutation = useDeleteImportJob();
  const t = useTranslations('import');
  const tCommon = useTranslations('common');

  const [view, setView] = useState<View>('list');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [deletingJob, setDeletingJob] = useState<ImportJob | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const job = await startImportPipeline(file);
      setSelectedJob(job);
      setView('preview');
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleViewJob = useCallback((job: ImportJob) => {
    setSelectedJob(job);
    setView('preview');
  }, []);

  const handleConfirmImport = useCallback(
    async (data: ImportExtractedData) => {
      if (!selectedJob) return;
      setIsImporting(true);
      try {
        await updateJobData(selectedJob.id, { extracted_data: data });
        await confirmImport(selectedJob.id);
        setView('list');
        setSelectedJob(null);
        refetch();
      } catch (err) {
        console.error('Import failed:', err);
      } finally {
        setIsImporting(false);
      }
    },
    [selectedJob, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingJob) return;
    await deleteMutation.mutateAsync(deletingJob.id);
    setDeletingJob(null);
  }, [deletingJob, deleteMutation]);

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {view === 'list' && (
          <Button onClick={() => setView('upload')}>
            <FileUp className="mr-2 h-4 w-4" />
            {t('newImport')}
          </Button>
        )}
        {view !== 'list' && (
          <Button
            variant="outline"
            onClick={() => { setView('list'); setSelectedJob(null); }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToList')}
          </Button>
        )}
      </div>

      {view === 'list' && (
        <>
          {!jobs?.length ? (
            <EmptyState
              icon={<FileUp className="h-12 w-12 text-muted-foreground/50" />}
              title={t('noImports')}
              description={t('uploadDescription')}
              action={{ label: t('newImport'), onClick: () => setView('upload') }}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <ImportStatus
                  key={job.id}
                  job={job}
                  onView={() => handleViewJob(job)}
                  onDelete={() => setDeletingJob(job)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'upload' && (
        <div className="mx-auto max-w-2xl">
          <FileUpload onUpload={handleUpload} isLoading={isUploading} />
        </div>
      )}

      {view === 'preview' && selectedJob && (
        <>
          {selectedJob.extracted_data ? (
            <ImportPreview
              data={selectedJob.extracted_data}
              onConfirm={handleConfirmImport}
              onCancel={() => { setView('list'); setSelectedJob(null); }}
              isLoading={isImporting}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">{t('processing')}</p>
              <p className="text-sm text-muted-foreground">
                {t('processingHint')}
              </p>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deletingJob}
        onOpenChange={() => setDeletingJob(null)}
        title={t('deleteImport')}
        description={t('confirmDelete', { name: deletingJob?.file_name || '' })}
        confirmLabel={tCommon('delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
