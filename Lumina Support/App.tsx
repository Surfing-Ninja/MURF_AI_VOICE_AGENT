import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './src/pages/LandingPage';
import AgentInterface from './src/pages/AgentInterface';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AgentInterface />} />
      </Routes>
    </Router>
  );
};

export default App;
