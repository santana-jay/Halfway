import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import MidpointFinder from './MidpointFinder';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MidpointFinder />} />
          <Route path="/midpoint" element={<MidpointFinder />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
