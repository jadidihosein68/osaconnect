import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { fetchEmailJob, EmailJob, retryEmailJob } from '../../lib/api';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

export function EmailJobDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const jobId = Number(params.id);
  const [job, setJob] = useState<EmailJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEmailJob(jobId);
        setJob(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(jobId)) load();
  }, [jobId]);

  const handleRetry = async () => {
    if (!jobId) return;
    setRetrying(true);
    try {
      await retryEmailJob(jobId);
      // reload
      const data = await fetchEmailJob(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to retry');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-gray-900 mb-1">Email Job Details</h1>
          <p className="text-gray-600">Job #{jobId}</p>
        </div>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {job && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{job.subject}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-800">
              <div>Status: <span className="capitalize">{job.status}</span></div>
              <div>Created: {new Date(job.created_at).toLocaleString()}</div>
              <div>Sent: {job.sent_count} / {job.total_recipients}</div>
              <div>Failed: {job.failed_count} | Skipped: {job.skipped_count} | Excluded: {job.excluded_count}</div>
              {job.batch_config && (
                <div className="text-gray-700">
                  Batch: {job.batch_config.batch_size} per {job.batch_config.batch_delay_seconds}s, retries: {job.batch_config.max_retries} (delay {job.batch_config.retry_delay_seconds}s)
                </div>
              )}
              {job.error && <div className="text-red-600">Error: {job.error}</div>}
              {job.attachments && job.attachments.length > 0 && (
                <div className="text-gray-700">Attachments: {job.attachments.map((a: any) => a.filename || a.name).join(', ')}</div>
              )}
              {job.exclusions && job.exclusions.length > 0 && (
                <div className="text-sm text-gray-700">
                  Excluded recipients:
                  <ul className="list-disc list-inside">
                    {job.exclusions.slice(0, 10).map((ex, idx) => (
                      <li key={idx}>{ex.email || ex.contact_id} — {ex.reason}</li>
                    ))}
                    {job.exclusions.length > 10 && <li>+{job.exclusions.length - 10} more</li>}
                  </ul>
                </div>
              )}
              {job.failed_count > 0 && (
                <Button size="sm" onClick={handleRetry} disabled={retrying}>
                  {retrying ? 'Retrying...' : 'Retry failed recipients'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Attachments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(job.recipients || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.full_name || r.contact?.full_name || '—'}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                      <TableCell className="text-xs text-red-600">{r.error || '—'}</TableCell>
                      <TableCell>{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-xs text-gray-500 break-all">{r.provider_message_id || '—'}</TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {(job.attachments || []).length
                          ? (job.attachments as any[]).map((a) => a.filename || a.name).join(', ')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(job.recipients || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-gray-500">No recipients.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
