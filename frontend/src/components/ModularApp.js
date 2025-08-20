import React, { useEffect, useRef, useState } from 'react';
import { CoreOrchestrator } from '../core/orchestrator/CoreOrchestrator';
import { SpriteEngine } from '../core/sprite-engine/SpriteEngine';
import { Header } from './Header';
import { ModuleManager } from './ModuleManager';
import { PerformanceMonitor } from './PerformanceMonitor';

export const ModularApp = () => {
  const canvasRef = useRef(null);
  const orchestratorRef = useRef(null);
  const spriteEngineRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modules, setModules] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    sprites: 0,
    memory: 0,
    loadTime: 0
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const startTime = performance.now();
        
        if (canvasRef.current) {
          // Initialize sprite engine
          spriteEngineRef.current = new SpriteEngine();
          await spriteEngineRef.current.initialize(canvasRef.current);
          
          // Initialize orchestrator
          orchestratorRef.current = new CoreOrchestrator();
          await orchestratorRef.current.initialize(spriteEngineRef.current);
          
          // Set up performance monitoring
          const performanceMonitor = new PerformanceMonitor();
          performanceMonitor.onUpdate = (metrics) => {
            setPerformanceMetrics(metrics);
          };
          
          // Load initial modules
          await loadInitialModules();
          
          const endTime = performance.now();
          setPerformanceMetrics(prev => ({
            ...prev,
            loadTime: endTime - startTime
          }));
          
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize modular app:', error);
      }
    };

    initializeApp();
  }, []);

  const loadInitialModules = async () => {
    try {
      // Load demo modules
      const demoModules = [
        {
          id: 'sprite-demo',
          name: 'Sprite Demo',
          description: 'Demonstrates basic sprite rendering and animation',
          status: 'loading'
        },
        {
          id: 'particle-system',
          name: 'Particle System',
          description: 'Advanced particle effects and visual systems',
          status: 'loading'
        },
        {
          id: 'ui-overlay',
          name: 'UI Overlay',
          description: 'Interactive UI elements over sprite canvas',
          status: 'loading'
        }
      ];
      
      setModules(demoModules);
      
      // Simulate module loading
      for (let i = 0; i < demoModules.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setModules(prev => prev.map((module, index) => 
          index === i ? { ...module, status: 'loaded' } : module
        ));
      }
    } catch (error) {
      console.error('Failed to load initial modules:', error);
    }
  };

  const handleModuleToggle = async (moduleId) => {
    if (orchestratorRef.current) {
      try {
        await orchestratorRef.current.toggleModule(moduleId);
        setModules(prev => prev.map(module => 
          module.id === moduleId 
            ? { ...module, status: module.status === 'active' ? 'loaded' : 'active' }
            : module
        ));
      } catch (error) {
        console.error(`Failed to toggle module ${moduleId}:`, error);
      }
    }
  };

  return (
    <div className="modular-app">
      <Header 
        title="Modular Cross-Platform Application"
        subtitle="React + PixiJS + Modular Architecture"
        isInitialized={isInitialized}
      />
      
      <div className="main-content">
        <div className="sprite-container">
          <canvas ref={canvasRef} className="sprite-canvas" />
          {!isInitialized && (
            <div className="canvas-overlay">
              <div className="loading-spinner"></div>
              <div style={{ marginTop: '12px' }}>Initializing Sprite Engine...</div>
            </div>
          )}
          {isInitialized && (
            <div className="canvas-overlay">
              <div>Sprite Engine Active</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>
                {performance.sprites} sprites • {Math.round(performance.fps)} FPS
              </div>
            </div>
          )}
        </div>
        
        <div className="module-sidebar">
          <ModuleManager 
            modules={modules}
            onModuleToggle={handleModuleToggle}
            isInitialized={isInitialized}
          />
          
          <PerformanceMonitor 
            performance={performance}
            isInitialized={isInitialized}
          />
        </div>
      </div>
    </div>
  );
};