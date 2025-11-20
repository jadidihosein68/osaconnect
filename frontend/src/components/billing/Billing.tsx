import { useEffect, useState } from 'react';
import { fetchBillingLogs, BillingLog } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';

export function Billing() {
  const [logs, setLogs] = useState<BillingLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBillingLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to load billing logs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-gray-600">Loading...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Raw Cost</TableHead>
                  <TableHead className="text-right">Billable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{log.feature_tag}</div>
                      <div className="text-xs text-gray-500">{log.mode}</div>
                    </TableCell>
                    <TableCell>{log.model}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">
                      {log.tokens_total ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{log.raw_cost ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{log.billable_cost ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
