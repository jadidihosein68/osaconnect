import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { fetchEmailJobs, EmailJob } from '../../lib/api';

export function EmailLogs() {
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEmailJobs();
        setJobs(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load email jobs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-gray-900 mb-2">Email Logs</h1>
        <p className="text-gray-600">Recent bulk email jobs</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                <TableRow key={job.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/outbound-logs/email/${job.id}`)}>
                    <TableCell>{job.subject}</TableCell>
                    <TableCell className="capitalize">{job.status}</TableCell>
                    <TableCell>{job.total_recipients}</TableCell>
                    <TableCell>{job.sent_count}</TableCell>
                    <TableCell>{job.failed_count}</TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                      No email jobs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
