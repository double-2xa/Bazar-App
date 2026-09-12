'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type Batch = { id: string; originalName: string; sheetName: string | null; selectedFromRow: number | null; selectedToRow: number | null; status: string; selectedRows: number; importedRows: number; publishedRows: number; invalidRows: number; failedRows: number; createdAt: string; createdBy: { fullName: string } };
type Response = { data: Batch[]; total: number; totalPages: number };

export default function ProductImportHistoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { setLoading(true); api.get<Response>('/product-imports', { params: { page, limit: 20 } }).then((response) => { setBatches(response.data.data); setTotalPages(response.data.totalPages || 1); }).catch((err) => setError(getApiErrorMessage(err, 'Could not load import history.'))).finally(() => setLoading(false)); }, [page]);
  return <div><div className="products-header"><div><Link className="catalog-back-link" href="/products">← Products</Link><h1>Import history</h1><p>Audit every workbook, selected row range and import result.</p></div><div className="products-header-actions"><Link className="btn btn-outline" href="/products/imported">Imported products</Link><Link className="btn btn-primary" href="/products/import">Import Excel</Link></div></div>
    {error ? <div className="alert alert-error">{error}</div> : null}<div className="card products-table-card"><table className="table"><thead><tr><th>Workbook</th><th>Excel rows</th><th>Status</th><th>Staged</th><th>Published</th><th>Problems</th><th>Uploaded</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}>Loading import history…</td></tr> : batches.length === 0 ? <tr><td colSpan={7}>No imports yet.</td></tr> : batches.map((batch) => <tr key={batch.id}><td><strong>{batch.originalName}</strong><span className="import-cell-secondary">{batch.sheetName} · {batch.createdBy.fullName}</span></td><td>{batch.selectedFromRow && batch.selectedToRow ? `${batch.selectedFromRow}–${batch.selectedToRow}` : 'Not analyzed'}</td><td><span className={`badge ${batch.status === 'completed' ? 'badge-success' : batch.status === 'failed' ? 'badge-danger' : 'badge-muted'}`}>{batch.status.replaceAll('_', ' ')}</span></td><td>{batch.importedRows}/{batch.selectedRows}</td><td>{batch.publishedRows}</td><td>{batch.invalidRows + batch.failedRows}</td><td>{new Date(batch.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    <div className="import-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>;
}

