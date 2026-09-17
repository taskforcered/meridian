'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { SourceDocument } from '@/lib/types';

interface Props {
  caseId: number;
  onUploaded: (doc: SourceDocument) => void;
}

const BATCH_SIZE = 20;
const CONCURRENCY = 3;

// Recursively walks dropped folders via the (widely supported, if informally
// standardized) webkitGetAsEntry API. Falls back to a flat file list if a
// browser doesn't support it — individual file/multi-file drops still work.
async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items;
  if (!items || !items[0]?.webkitGetAsEntry) {
    return Array.from(dataTransfer.files);
  }

  const roots = Array.from(items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e);

  const files: File[] = [];

  async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const all: FileSystemEntry[] = [];
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      all.push(...batch);
    }
    return all;
  }

  async function walk(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      files.push(file);
    } else if (entry.isDirectory) {
      const children = await readAllEntries((entry as FileSystemDirectoryEntry).createReader());
      for (const child of children) await walk(child);
    }
  }

  for (const entry of roots) await walk(entry);
  return files;
}

export default function UploadDropzone({ caseId, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  async function uploadAll(files: File[]) {
    if (files.length === 0) return;
    setFailed([]);
    setTotal(files.length);
    setDone(0);
    setUploading(true);

    const batches: File[][] = [];
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    let next = 0;
    async function worker() {
      while (next < batches.length) {
        const batch = batches[next++];
        try {
          const res = await api.documents.bulkUpload(caseId, batch);
          res.created.forEach(onUploaded);
          if (res.errors.length > 0) {
            setFailed((prev) => [...prev, ...res.errors.map((e) => e.filename)]);
          }
          setDone((d) => d + res.created.length);
        } catch {
          setFailed((prev) => [...prev, ...batch.map((f) => f.name)]);
          setDone((d) => d + 0);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          uploadAll(await filesFromDataTransfer(e.dataTransfer));
        }}
        className={[
          'border-2 border-dashed rounded-lg px-6 py-8 text-center transition-colors',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => uploadAll(Array.from(e.target.files ?? []))}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // non-standard attributes for whole-folder selection — supported in
          // Chromium/Firefox/Safari despite the lack of a React prop for them
          {...{ webkitdirectory: 'true', directory: 'true' }}
          className="hidden"
          onChange={(e) => uploadAll(Array.from(e.target.files ?? []))}
        />

        {uploading ? (
          <div>
            <p className="text-sm text-gray-500">
              Uploading {done}/{total}…
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Drop files or a folder here
            </p>
            <p className="text-xs text-gray-400 mt-1 mb-3">
              PDFs, images, or .zip archives of records — any number of files
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-blue-600 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-50"
              >
                Select files
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="text-xs font-medium text-blue-600 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-50"
              >
                Select folder
              </button>
            </div>
          </>
        )}
      </div>
      {failed.length > 0 && (
        <p className="text-xs text-red-600">
          Failed: {failed.join(', ')}
        </p>
      )}
    </div>
  );
}
