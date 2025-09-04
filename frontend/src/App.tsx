import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import PropertyList from './components/PropertyList';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertyList apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000'} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
