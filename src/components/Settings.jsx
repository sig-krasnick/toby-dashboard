import { useState } from 'react';
import { saveConfig, testConnection } from '../api/karakeep';

export default function Settings({ onConfigured, inline = false }) {
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('karakeep_server_url') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('karakeep_api_key') || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      setStatus({ ok: false, msg: 'Both fields are required' });
      return;
    }

    saveConfig(serverUrl.trim(), apiKey.trim());
    setTesting(true);
    setStatus(null);

    try {
      const user = await testConnection();
      setStatus({ ok: true, msg: `Connected as ${user.name || user.email || 'user'}` });
      if (onConfigured) setTimeout(onConfigured, 800);
    } catch (err) {
      setStatus({ ok: false, msg: `Connection failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`settings ${inline ? 'settings-inline' : 'settings-fullscreen'}`}>
      {!inline && (
        <div className="settings-header">
          <h1>Toby Dashboard</h1>
          <p>Connect to your Karakeep instance to get started.</p>
        </div>
      )}

      <div className="settings-form">
        <label>
          <span>Server URL</span>
          <input
            type="url"
            placeholder="http://100.x.x.x:3000"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
          />
        </label>

        <label>
          <span>API Key</span>
          <input
            type="password"
            placeholder="Your Karakeep API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>

        <button onClick={handleSave} disabled={testing} className="settings-save">
          {testing ? 'Testing...' : 'Save & Connect'}
        </button>

        {status && (
          <div className={`settings-status ${status.ok ? 'ok' : 'error'}`}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
