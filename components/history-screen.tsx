import { useState, useEffect } from 'react';

export function HistoryScreen({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/sessions?userId=${userId}`);
        const data = await response.json();
        
        if (data.sessions) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  if (loading) return <div>Loading past interviews...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Past Interview History</h2>
      {sessions.length === 0 ? (
        <p>No previous interviews found.</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="p-4 border rounded-lg shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{session.target_role}</h3>
              <span className="text-sm text-gray-500">
                {new Date(session.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-600">Type: {session.interview_type}</p>
            {session.evaluation?.overallScore && (
              <p className="text-sm font-medium mt-2">
                Overall Score: {session.evaluation.overallScore}/100
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}