'use client';

import { useState, useEffect } from 'react';

interface Stream {
  id: string;
  name: string;
  inputUrl: string;
  outputUrl: string;
  status: 'streaming' | 'stopped' | 'error';
  pid?: number;
  startTime?: number;
  logs: string[];
}

export default function Home() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    inputUrl: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/streams');
      const data = await res.json();
      setStreams(data);
    } catch (err) {
      console.error('Failed to fetch streams');
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', inputUrl: '' });
        fetchStreams();
      }
    } catch (err) {
      alert('Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async (id: string) => {
    try {
      await fetch('/api/streams/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchStreams();
    } catch (err) {
      alert('Failed to stop stream');
    }
  };

  const handleRemoveStream = async (id: string) => {
    try {
      await fetch('/api/streams/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchStreams();
    } catch (err) {
      alert('Failed to remove stream');
    }
  };

  const getUptime = (startTime?: number) => {
    if (!startTime) return '--';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="fade-in">Nexus Stream</h1>
          <p style={{ color: '#888', marginTop: '-1.5rem' }}>Professional Relay Server Controller</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          + New Stream
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {streams.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: '#888', fontSize: '1.2rem' }}>No active streams. Start one to begin relaying.</p>
          </div>
        ) : (
          streams.map((stream) => (
            <div key={stream.id} className="glass-card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stream.name}</h2>
                <span className={`status-badge status-${stream.status}`}>
                  {stream.status}
                </span>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>SOURCE</p>
                <p style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.inputUrl}</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>DESTINATION</p>
                <p style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.outputUrl}</p>
              </div>

              {stream.status === 'streaming' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>UPTIME</p>
                  <p style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--success)' }}>{getUptime(stream.startTime)}</p>
                </div>
              )}

              {stream.status === 'error' && stream.logs.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255, 77, 77, 0.08)', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.15)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginBottom: '0.2rem' }}>ERROR LOG</p>
                  <p style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflow: 'auto' }}>
                    {stream.logs[stream.logs.length - 1]}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {stream.status === 'streaming' ? (
                  <button className="secondary" style={{ flex: 1, color: '#ff4d4d' }} onClick={() => handleStopStream(stream.id)}>
                    Stop Stream
                  </button>
                ) : (
                  <>
                    <button className="primary" style={{ flex: 1 }} onClick={() => {
                      setFormData({ name: stream.name, inputUrl: stream.inputUrl });
                      setIsModalOpen(true);
                    }}>
                      Restart
                    </button>
                    <button className="secondary" style={{ flex: 0, padding: '1rem', color: '#888' }} onClick={() => handleRemoveStream(stream.id)} title="Remove from list">
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', zIndex: 1000
        }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '2rem' }}>Initialize Stream</h2>
            <form onSubmit={handleStartStream}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>Stream Name</label>
              <input 
                placeholder="e.g. Main Event Feed" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />

              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>Source URL (Streaming Link)</label>
              <input 
                placeholder="rtsp://... or http://..." 
                value={formData.inputUrl}
                onChange={e => setFormData({...formData, inputUrl: e.target.value})}
                required
              />

              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>DESTINATION</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>rtmp://74.208.198.159/live/{formData.name || '[name]'}</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Initializing...' : 'Launch Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          padding-bottom: 4rem;
        }
      `}</style>
    </main>
  );
}
