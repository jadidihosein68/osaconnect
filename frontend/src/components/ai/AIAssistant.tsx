import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Bot, Send, Copy, Save, MessageSquare, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { askAssistant } from '../../lib/api';

export function AIAssistant() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant', content: string }>>([
    {
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with customer queries, draft messages, search the knowledge base, and more. How can I assist you today?'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setMessages([...messages, { type: 'user', content: query }]);
    setLoading(true);
    setError(null);
    try {
      const res = await askAssistant(query);
      setMessages((prev) => [...prev, { type: 'assistant', content: res.answer || 'No answer available' }]);
    } catch {
      setError('Failed to fetch answer');
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const kbDocuments = [
    { id: 1, title: 'Customer Service Guidelines', category: 'Support', lastUpdated: '2 days ago' },
    { id: 2, title: 'Booking Policies', category: 'Operations', lastUpdated: '1 week ago' },
    { id: 3, title: 'Payment Processing', category: 'Finance', lastUpdated: '2 weeks ago' },
    { id: 4, title: 'Refund Policy', category: 'Finance', lastUpdated: '1 month ago' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">AI Assistant</h1>
        <p className="text-gray-600">Get instant answers and automate tasks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                AI Chat Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.type === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.type === 'assistant' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          <Button size="sm" variant="ghost" className="h-8">
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8">
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Send
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                />
                <Button onClick={handleAsk}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Base & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setQuery('How do I handle booking rescheduling?')}
              >
                Booking Policies
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setQuery('What are our payment terms?')}
              >
                Payment Terms
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setQuery('Draft a welcome message')}
              >
                Draft Message
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setQuery('Customer refund policy')}
              >
                Refund Policy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kbDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="text-gray-900 mb-1">{doc.title}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{doc.category}</Badge>
                    <span className="text-gray-500">{doc.lastUpdated}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
