'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type ImportBatch = {
  id: string; originalName: string; sheetName: string | null; firstDataRow: number | null; lastDataRow: number | null;
  selectedFromRow: number | null; selectedToRow: number | null; status: string; totalRows: number; selectedRows: number;
  readyRows: number; warningRows: number; invalidRows: number; duplicateRows: number; importedRows: number; failedRows: number;
};
type ImportRow = {
  id: string; excelRow: number; barcode: string | null; nameAr: string | null; nameEn: string | null;
  normalPrice: number | null; companyPrice: number | null; categoryName: string | null; sourceImage: string | null;
  action: 'create' | 'skip' | 'overwrite'; status: string; issues: string[] | null; existingProductId: string | null;
};
type RowsResponse = { data: ImportRow[]; total: number; page: number; totalPages: number };

const ISSUE_LABELS: Record<string, string> = {
  MISSING_BARCODE: 'Missing barcode', MISSING_PRODUCT_NAME: 'Missing product name', INVALID_RETAIL_PRICE: 'Invalid retail price',
  INVALID_CURRENCY: 'Currency must be USD', MISSING_ENGLISH_NAME: 'English name missing', MISSING_WHOLESALE_PRICE: 'Wholesale price missing',
  MISSING_IMAGE: 'Image missing', UNKNOWN_CATEGORY: 'Category not matched', UNKNOWN_SUBCATEGORY: 'Subcategory not matched',
  EXISTING_BARCODE: 'Already exists', DUPLICATE_IN_FILE: 'Repeated in this file', IMAGE_DOWNLOAD_FAILED: 'Image could not be copied',
  INVALID_IMAGE_URL: 'Invalid image URL', UNSUPPORTED_IMAGE_FORMAT: 'Image format needs replacement',
};

export default function ProductImportPage() {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fromRow, setFromRow] = useState(2);
  const [toRow, setToRow] = useState(31);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRows = useCallback(async (batchId: string, nextPage = page) => {
    const response = await api.get<RowsResponse>(`/product-imports/${batchId}/rows`, { params: { page: nextPage, limit: 50 } });
    setRows(response.data.data); setTotalPages(response.data.totalPages || 1);
  }, [page]);

  const refreshBatch = useCallback(async (batchId: string) => {
    const response = await api.get<ImportBatch>(`/product-imports/${batchId}`);
    setBatch(response.data);
    if (response.data.selectedRows) await loadRows(batchId);
    return response.data;
  }, [loadRows]);

  useEffect(() => {
    if (!batch || batch.status !== 'importing') return;
    const timer = window.setInterval(() => { void refreshBatch(batch.id); }, 3000);
    return () => window.clearInterval(timer);
  }, [batch, refreshBatch]);

  const upload = async () => {
    if (!file) return setError('Choose an Excel workbook first.');
    setBusy(true); setError(''); setMessage('');
    try {
      const body = new FormData(); body.append('file', file);
      const response = await api.post<ImportBatch>('/product-imports/upload', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBatch(response.data);
      setFromRow(response.data.firstDataRow || 2);
      setToRow(Math.min((response.data.firstDataRow || 2) + 29, response.data.lastDataRow || 31));
      setRows([]); setMessage('Workbook uploaded. Choose the rows to analyze.');
    } catch (err) { setError(getApiErrorMessage(err, 'Could not upload the workbook.')); }
    finally { setBusy(false); }
  };

  const analyze = async () => {
    if (!batch) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await api.post<ImportBatch>(`/product-imports/${batch.id}/analyze`, { fromRow, toRow });
      setBatch(response.data); setPage(1); await loadRows(batch.id, 1);
      setMessage('Analysis finished. Review the products and duplicate decisions.');
    } catch (err) { setError(getApiErrorMessage(err, 'Could not analyze these rows.')); }
    finally { setBusy(false); }
  };

  const setDuplicateAction = async (action: 'skip' | 'overwrite') => {
    if (!batch) return;
    setBusy(true); setError('');
    try { await api.patch(`/product-imports/${batch.id}/duplicates`, { action }); await loadRows(batch.id); }
    catch (err) { setError(getApiErrorMessage(err, 'Could not update duplicate decisions.')); }
    finally { setBusy(false); }
  };

  const updateAction = async (row: ImportRow, action: ImportRow['action']) => {
    try {
      await api.patch(`/product-imports/rows/${row.id}`, { action });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, action } : item));
    } catch (err) { setError(getApiErrorMessage(err, 'Could not update this row.')); }
  };

  const importBatch = async () => {
    if (!batch) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api.post(`/product-imports/${batch.id}/import`);
      await refreshBatch(batch.id); setMessage('Import started. Images are being copied into Nice Price Bazar storage.');
    } catch (err) { setError(getApiErrorMessage(err, 'Could not start the import.')); }
    finally { setBusy(false); }
  };

  const selectedCount = Math.max(0, toRow - fromRow + 1);
  const importFinished = batch && ['completed', 'completed_with_errors'].includes(batch.status);

  return (
    <div className="catalog-import-page">
      <div className="products-header">
        <div><Link className="catalog-back-link" href="/products">← Products</Link><h1>Import products</h1><p>Analyze an Excel range before adding anything to the catalog.</p></div>
        <div className="products-header-actions"><Link className="btn btn-outline" href="/products/imported">Imported products</Link><Link className="btn btn-outline" href="/products/import-history">Import history</Link></div>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <section className="card import-step-card">
        <div className="import-step-heading"><span>1</span><div><h2>Upload workbook</h2><p>Accepted format: .xlsx, maximum 60 MB.</p></div></div>
        <div className="import-upload-row">
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button className="btn btn-primary" type="button" disabled={busy || !file} onClick={upload}>{busy && !batch ? 'Uploading…' : 'Upload Excel'}</button>
        </div>
        {batch ? <div className="import-file-summary"><strong>{batch.originalName}</strong><span>Sheet: {batch.sheetName}</span><span>{batch.totalRows.toLocaleString()} product rows</span></div> : null}
      </section>

      <section className={`card import-step-card${batch ? '' : ' import-step-card--disabled'}`}>
        <div className="import-step-heading"><span>2</span><div><h2>Select Excel rows</h2><p>Row 1 contains the column names. Both selected row numbers are included.</p></div></div>
        <div className="import-range-grid">
          <label>From Excel row<input type="number" min={2} max={batch?.lastDataRow || 100000} value={fromRow} disabled={!batch || busy} onChange={(event) => setFromRow(Number(event.target.value))} /></label>
          <label>To Excel row<input type="number" min={2} max={batch?.lastDataRow || 100000} value={toRow} disabled={!batch || busy} onChange={(event) => setToRow(Number(event.target.value))} /></label>
          <div className="import-selected-count"><strong>{selectedCount.toLocaleString()}</strong><span>products selected</span></div>
          <button className="btn btn-primary" type="button" disabled={!batch || busy || selectedCount < 1} onClick={analyze}>{busy && batch?.status !== 'importing' ? 'Analyzing…' : 'Analyze & Preview'}</button>
        </div>
      </section>

      {batch?.selectedRows ? (
        <section className="card import-preview-card">
          <div className="import-preview-header"><div><h2>Preview rows {batch.selectedFromRow}–{batch.selectedToRow}</h2><p>No live product has been changed.</p></div><div className="import-summary-pills"><span>{batch.readyRows} ready</span><span>{batch.warningRows} warnings</span><span>{batch.invalidRows} invalid</span><span>{batch.duplicateRows} duplicates</span></div></div>
          {batch.duplicateRows ? <div className="import-bulk-actions"><span>Existing barcode decisions</span><button type="button" disabled={busy} onClick={() => setDuplicateAction('skip')}>Skip all</button><button type="button" disabled={busy} onClick={() => setDuplicateAction('overwrite')}>Overwrite all</button></div> : null}
          <div className="import-table-scroll"><table className="table import-preview-table"><thead><tr><th>Excel row</th><th>Product</th><th>Retail</th><th>Image</th><th>Checks</th><th>Decision</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.excelRow}</td><td><strong>{row.nameEn || row.nameAr || 'Unnamed product'}</strong><span className="import-cell-secondary">{row.barcode || 'No barcode'}</span></td><td>{row.normalPrice === null ? '—' : `$${row.normalPrice.toFixed(2)}`}</td><td>{row.sourceImage ? 'Found' : 'Missing'}</td><td><div className="import-issues">{row.issues?.length ? row.issues.map((issue) => <span key={issue} className={issue.startsWith('INVALID') || issue.startsWith('MISSING_BARCODE') ? 'is-error' : ''}>{ISSUE_LABELS[issue] || issue}</span>) : <span className="is-ready">Ready</span>}</div></td><td>{row.status === 'invalid' ? <strong className="text-danger">Rejected</strong> : row.existingProductId && !row.issues?.includes('DUPLICATE_IN_FILE') ? <select value={row.action} onChange={(event) => updateAction(row, event.target.value as ImportRow['action'])}><option value="skip">Skip</option><option value="overwrite">Overwrite</option></select> : row.action === 'skip' ? 'Skip repeated row' : 'Create'}</td></tr>)}</tbody></table></div>
          <div className="import-pagination"><button disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void loadRows(batch.id, next); }}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => { const next = page + 1; setPage(next); void loadRows(batch.id, next); }}>Next</button></div>
          <div className="import-final-actions"><div><strong>{batch.status === 'importing' ? 'Copying images and preparing drafts…' : importFinished ? 'Import completed' : 'Ready to import into staging'}</strong><span>Products remain hidden until you publish them.</span></div>{importFinished ? <Link className="btn btn-primary" href="/products/imported">Review imported products</Link> : <button className="btn btn-primary" type="button" disabled={busy || batch.status === 'importing'} onClick={importBatch}>{batch.status === 'importing' ? `${batch.importedRows}/${batch.selectedRows} processed` : 'Import Batch'}</button>}</div>
        </section>
      ) : null}
    </div>
  );
}
