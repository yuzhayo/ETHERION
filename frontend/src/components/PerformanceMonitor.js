import React, { useEffect, useState } from 'react';

export const PerformanceMonitor = ({ performance, isInitialized }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    sprites: 0,
    memory: 0,
    loadTime: 0
  });

  useEffect(() => {
    setMetrics(performance);
  }, [performance]);

  useEffect(() => {
    // Listen for sprite engine performance updates
    const handlePerformanceUpdate = (event) => {
      setMetrics(prev => ({
        ...prev,
        ...event.detail
      }));
    };

    window.addEventListener('sprite-engine-performance', handlePerformanceUpdate);
    
    return () => {
      window.removeEventListener('sprite-engine-performance', handlePerformanceUpdate);
    };
  }, []);

  const getPerformanceColor = (metric, value) => {
    switch (metric) {
      case 'fps':
        if (value >= 50) return '#4ade80';
        if (value >= 30) return '#fbbf24';
        return '#ef4444';
      case 'memory':
        if (value <= 100) return '#4ade80';
        if (value <= 200) return '#fbbf24';
        return '#ef4444';
      default:
        return '#4ade80';
    }
  };

  const formatValue = (metric, value) => {
    switch (metric) {
      case 'fps':
        return `${Math.round(value)} FPS`;
      case 'sprites':
        return `${value} sprites`;
      case 'memory':
        return `${value} MB`;
      case 'loadTime':
        return `${Math.round(value)} ms`;
      default:
        return value;
    }
  };

  const performanceItems = [
    { key: 'fps', label: 'Frame Rate', value: metrics.fps },
    { key: 'sprites', label: 'Active Sprites', value: metrics.sprites },
    { key: 'memory', label: 'Memory Usage', value: metrics.memory },
    { key: 'loadTime', label: 'Load Time', value: metrics.loadTime }
  ];

  return (
    <div className="performance-metrics">
      <h3>Performance Monitor</h3>
      
      {!isInitialized ? (
        <div className="metric-item">
          <span className="metric-label">Status</span>
          <span className="metric-value" style={{ color: '#fbbf24' }}>
            Initializing...
          </span>
        </div>
      ) : (
        performanceItems.map(({ key, label, value }) => (
          <div key={key} className="metric-item">
            <span className="metric-label">{label}</span>
            <span 
              className="metric-value" 
              style={{ color: getPerformanceColor(key, value) }}
            >
              {formatValue(key, value)}
            </span>
          </div>
        ))
      )}
      
      {isInitialized && (
        <div style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.7 }}>
          Engine Status: <span style={{ color: '#4ade80' }}>Active</span>
        </div>
      )}
    </div>
  );
};