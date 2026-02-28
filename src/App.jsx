import { useState } from 'react';
import { isConfigured } from './api/karakeep';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import './App.css';

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());

  if (!configured) {
    return <Settings onConfigured={() => setConfigured(true)} />;
  }

  return <Dashboard />;
}
