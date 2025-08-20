import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModularApp } from './components/ModularApp';
import { Header } from './components/Header';
import { ModuleManager } from './components/ModuleManager';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ModularApp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;