import React from 'react';

export const ModuleManager = ({ modules, onModuleToggle, isInitialized }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'loaded': return 'status-loaded';
      case 'active': return 'status-loaded';
      case 'loading': return 'status-loading';
      case 'error': return 'status-error';
      default: return 'status-loading';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'loaded': return 'Ready';
      case 'active': return 'Active';
      case 'loading': return 'Loading...';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div>
      <h2>Module Manager</h2>
      
      {modules.map((module) => (
        <div 
          key={module.id}
          className={`module-card ${module.status === 'active' ? 'active' : ''}`}
          onClick={() => isInitialized && onModuleToggle(module.id)}
        >
          <h3>{module.name}</h3>
          <p>{module.description}</p>
          
          <div className="module-status">
            <div className={`status-indicator ${getStatusColor(module.status)}`}></div>
            <span>{getStatusText(module.status)}</span>
          </div>
          
          {isInitialized && module.status !== 'loading' && (
            <div className="module-controls">
              <button className="control-btn">
                {module.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button className="control-btn">Settings</button>
            </div>
          )}
        </div>
      ))}
      
      {modules.length === 0 && (
        <div className="module-card">
          <h3>No Modules Loaded</h3>
          <p>Modules will appear here when the system is initialized.</p>
        </div>
      )}
    </div>
  );
};