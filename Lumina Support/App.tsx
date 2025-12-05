import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './src/pages/LandingPage';
import AgentInterface from './src/pages/AgentInterface';
import AboutDevs from './src/pages/AboutDevs';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AgentInterface />} />
        <Route path="/about" element={<AboutDevs />} />
      </Routes>
    </Router>
  );
};

export default App;
