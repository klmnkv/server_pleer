import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import UploadPage from './components/UploadPage';
import PlayerPage from './components/PlayerPage';
import RandomFactPlayer from './components/RandomFactPlayer';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [auth, setAuth] = useState(false);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage setAuth={setAuth} />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute auth={auth}>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route path="/play/:filename" element={<PlayerPage />} />
          <Route path="/play" element={<PlayerPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/orel_facts" element={<RandomFactPlayer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;