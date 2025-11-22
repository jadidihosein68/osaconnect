import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Campaign, CampaignRecipient, fetchCampaign } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    queued: 'bg-yellow-100 text-yellow-700',
    sending: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-700',
  };
  return map[s] || 'bg-gray-100 text-gray-700';
};

export function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await fetchCampaign(Number(id));
        setCampaign(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const channelLabel = (ch: string) => {
    if (ch === 'email') return 'Email (SendGrid)';
    if (ch === 'whatsapp') return 'WhatsApp';
    if (ch === 'telegram') return 'Telegram';
    if (ch === 'instagram') return 'Instagram';
    return ch;
  };

  if (loading) return <div className="p-6">Loading campaign...</div>;
  if (error) return <div className="p-6 text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>;
  if (!campaign) return null;

  const recipients: CampaignRecipient[] = campaign.recipients || [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate('/messaging/campaign')} className="px-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-xl text-gray-900">Campaign Details</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <div className="text-sm text-gray-600">{channelLabel(campaign.channel)}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusClass(campaign.status)}`}>{campaign.status}</span>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between"><span>Template</span><span className="text-gray-900">{campaign.template_name || '—'}</span></div>
            <div className="flex justify-between"><span>Created by</span><span className="text-gray-900">{campaign.created_by_name || '—'}</span></div>
            <div className="flex justify-between"><span>Created at</span><span className="text-gray-900">{new Date(campaign.created_at).toLocaleString()}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Targets</span><span className="text-gray-900">{campaign.target_count}</span></div>
            <div className="flex justify-between"><span>Sent</span><span className="text-gray-900">{campaign.sent_count}</span></div>
            <div className="flex justify-between"><span>Delivered</span><span className="text-gray-900">{campaign.delivered_count}</span></div>
            <div className="flex justify-between"><span>Failed</span><span className="text-gray-900">{campaign.failed_count}</span></div>
            <div className="flex justify-between"><span>Estimated Cost</span><span className="text-gray-900">${Number(campaign.estimated_cost || 0).toFixed(3)}</span></div>
            {campaign.throttle_per_minute && (
              <div className="flex justify-between"><span>Throttle</span><span className="text-gray-900">{campaign.throttle_per_minute} msgs/min</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recipients.length === 0 ? (
            <div className="text-sm text-gray-600">No recipients recorded.</div>
          ) : (
            <table className="min-w-full text-sm border border-gray-200 rounded">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Contact</th>
                  <th className="text-left px-3 py-2 border-b">Channel ID</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Error</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="text-gray-900">{r.contact_name || `Contact #${r.contact_id}`}</div>
                      <div className="text-gray-600 text-xs">{r.contact_email || r.contact_phone || r.contact_instagram_user_id || '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{r.contact_email || r.contact_phone || r.contact_instagram_user_id || '—'}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full ${statusClass(r.status)}`}>{r.status}</span></td>
                    <td className="px-3 py-2 text-xs text-red-700">{r.error_reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
