import React from 'react';

export const Header = ({ title, subtitle, isInitialized }) => {
  return (
    <header className="app-header">
      <h1>{title}</h1>
      <p className="app-subtitle">
        {subtitle} {isInitialized && '• System Online'}
      </p>
    </header>
  );
};