import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export class CoreOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map();
    this.moduleRegistry = new Map();
    this.communicationBus = new EventTarget();
    this.spriteEngine = null;
    this.isInitialized = false;
    this.messageHandlers = new Map();
  }

  async initialize(spriteEngine) {
    try {
      console.log('Initializing Core Orchestrator...');
      this.spriteEngine = spriteEngine;
      
      // Set up communication handlers
      this.setupCommunicationHandlers();
      
      // Initialize module system
      this.initializeModuleSystem();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('Core Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Core Orchestrator:', error);
      throw error;
    }
  }

  setupCommunicationHandlers() {
    // Handle inter-module communication
    this.communicationBus.addEventListener('module-message', (event) => {
      this.handleModuleMessage(event.detail);
    });
    
    // Handle system events
    this.communicationBus.addEventListener('system-event', (event) => {
      this.handleSystemEvent(event.detail);
    });
  }

  initializeModuleSystem() {
    // Register default module types
    this.registerModuleType('sprite-demo', {
      name: 'Sprite Demo Module',
      description: 'Demonstrates basic sprite rendering capabilities',
      dependencies: ['sprite-engine'],
      factory: this.createSpriteDemo.bind(this)
    });
    
    this.registerModuleType('particle-system', {
      name: 'Particle System Module',
      description: 'Advanced particle effects and animations',
      dependencies: ['sprite-engine'],
      factory: this.createParticleSystem.bind(this)
    });
    
    this.registerModuleType('ui-overlay', {
      name: 'UI Overlay Module',
      description: 'Interactive UI elements over canvas',
      dependencies: [],
      factory: this.createUIOverlay.bind(this)
    });
  }

  registerModuleType(type, config) {
    this.moduleRegistry.set(type, config);
    console.log(`Registered module type: ${type}`);
  }

  async loadModule(moduleId, moduleType, config = {}) {
    try {
      console.log(`Loading module: ${moduleId} (${moduleType})`);
      
      const moduleConfig = this.moduleRegistry.get(moduleType);
      if (!moduleConfig) {
        throw new Error(`Unknown module type: ${moduleType}`);
      }
      
      // Check dependencies
      await this.checkDependencies(moduleConfig.dependencies);
      
      // Create module instance
      const module = await moduleConfig.factory(moduleId, config);
      
      // Register module
      this.modules.set(moduleId, {
        instance: module,
        type: moduleType,
        config: moduleConfig,
        status: 'loaded',
        id: moduleId
      });
      
      this.emit('module-loaded', { moduleId, moduleType });
      console.log(`Module loaded successfully: ${moduleId}`);
      
      return module;
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error);
      this.emit('module-error', { moduleId, error: error.message });
      throw error;
    }
  }

  async toggleModule(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      // Try to load the module if it doesn't exist
      await this.loadModule(moduleId, moduleId, {});
      return;
    }
    
    if (moduleData.status === 'active') {
      await this.deactivateModule(moduleId);
    } else {
      await this.activateModule(moduleId);
    }
  }

  async activateModule(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      throw new Error(`Module not found: ${moduleId}`);
    }
    
    try {
      if (moduleData.instance.activate) {
        await moduleData.instance.activate();
      }
      
      moduleData.status = 'active';
      this.emit('module-activated', { moduleId });
      console.log(`Module activated: ${moduleId}`);
    } catch (error) {
      console.error(`Failed to activate module ${moduleId}:`, error);
      throw error;
    }
  }

  async deactivateModule(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      throw new Error(`Module not found: ${moduleId}`);
    }
    
    try {
      if (moduleData.instance.deactivate) {
        await moduleData.instance.deactivate();
      }
      
      moduleData.status = 'loaded';
      this.emit('module-deactivated', { moduleId });
      console.log(`Module deactivated: ${moduleId}`);
    } catch (error) {
      console.error(`Failed to deactivate module ${moduleId}:`, error);
      throw error;
    }
  }

  async unloadModule(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      return;
    }
    
    try {
      // Deactivate if active
      if (moduleData.status === 'active') {
        await this.deactivateModule(moduleId);
      }
      
      // Cleanup module
      if (moduleData.instance.destroy) {
        await moduleData.instance.destroy();
      }
      
      this.modules.delete(moduleId);
      this.emit('module-unloaded', { moduleId });
      console.log(`Module unloaded: ${moduleId}`);
    } catch (error) {
      console.error(`Failed to unload module ${moduleId}:`, error);
      throw error;
    }
  }

  async checkDependencies(dependencies) {
    for (const dep of dependencies) {
      if (dep === 'sprite-engine' && !this.spriteEngine) {
        throw new Error('Sprite engine is required but not available');
      }
    }
  }

  sendMessage(fromModule, toModule, message) {
    const event = new CustomEvent('module-message', {
      detail: {
        from: fromModule,
        to: toModule,
        message,
        timestamp: Date.now(),
        id: uuidv4()
      }
    });
    
    this.communicationBus.dispatchEvent(event);
  }

  handleModuleMessage(eventDetail) {
    const { from, to, message, id } = eventDetail;
    
    if (to === 'orchestrator') {
      // Handle messages to orchestrator
      this.handleOrchestratorMessage(from, message, id);
    } else {
      // Forward to target module
      const targetModule = this.modules.get(to);
      if (targetModule && targetModule.instance.receiveMessage) {
        targetModule.instance.receiveMessage(from, message, id);
      }
    }
  }

  handleOrchestratorMessage(from, message, id) {
    switch (message.type) {
      case 'get-modules':
        this.sendResponse(from, id, Array.from(this.modules.keys()));
        break;
      case 'get-sprite-engine':
        this.sendResponse(from, id, this.spriteEngine);
        break;
      default:
        console.warn(`Unknown orchestrator message type: ${message.type}`);
    }
  }

  sendResponse(toModule, requestId, data) {
    const event = new CustomEvent('module-message', {
      detail: {
        from: 'orchestrator',
        to: toModule,
        message: {
          type: 'response',
          requestId,
          data
        },
        timestamp: Date.now(),
        id: uuidv4()
      }
    });
    
    this.communicationBus.dispatchEvent(event);
  }

  handleSystemEvent(eventDetail) {
    const { type, data } = eventDetail;
    
    switch (type) {
      case 'performance-update':
        this.emit('performance-update', data);
        break;
      default:
        console.log(`System event: ${type}`, data);
    }
  }

  // Module Factory Methods
  async createSpriteDemo(moduleId, config) {
    return new SpriteDemo(moduleId, this.spriteEngine, this);
  }

  async createParticleSystem(moduleId, config) {
    return new ParticleSystem(moduleId, this.spriteEngine, this);
  }

  async createUIOverlay(moduleId, config) {
    return new UIOverlay(moduleId, this);
  }

  getModule(moduleId) {
    const moduleData = this.modules.get(moduleId);
    return moduleData ? moduleData.instance : null;
  }

  getModules() {
    return Array.from(this.modules.values()).map(moduleData => ({
      id: moduleData.id,
      type: moduleData.type,
      status: moduleData.status,
      name: moduleData.config.name
    }));
  }

  destroy() {
    // Cleanup all modules
    for (const [moduleId] of this.modules) {
      this.unloadModule(moduleId);
    }
    
    this.modules.clear();
    this.moduleRegistry.clear();
    this.removeAllListeners();
    
    console.log('Core Orchestrator destroyed');
  }
}

// Basic Module Classes
class SpriteDemo {
  constructor(id, spriteEngine, orchestrator) {
    this.id = id;
    this.spriteEngine = spriteEngine;
    this.orchestrator = orchestrator;
    this.sprites = [];
    this.isActive = false;
  }

  async activate() {
    if (this.isActive) return;
    
    console.log(`Activating Sprite Demo module: ${this.id}`);
    
    // Create demo sprites
    await this.createDemoSprites();
    
    this.isActive = true;
  }

  async deactivate() {
    if (!this.isActive) return;
    
    console.log(`Deactivating Sprite Demo module: ${this.id}`);
    
    // Remove demo sprites
    this.sprites.forEach(sprite => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
    });
    this.sprites = [];
    
    this.isActive = false;
  }

  async createDemoSprites() {
    if (!this.spriteEngine || !this.spriteEngine.app) return;
    
    // Create colorful rectangles as demo sprites
    for (let i = 0; i < 5; i++) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(Math.random() * 0xFFFFFF);
      graphics.drawRect(0, 0, 50, 50);
      graphics.endFill();
      
      graphics.x = 100 + i * 80;
      graphics.y = 100 + Math.sin(i) * 50;
      
      // Add simple animation
      graphics._originalY = graphics.y;
      graphics._animationOffset = i * 0.5;
      
      this.spriteEngine.app.stage.addChild(graphics);
      this.sprites.push(graphics);
    }
    
    // Start animation
    this.animationTicker = this.spriteEngine.app.ticker.add(() => {
      this.sprites.forEach((sprite, index) => {
        sprite.y = sprite._originalY + Math.sin(Date.now() * 0.005 + sprite._animationOffset) * 30;
        sprite.rotation += 0.02;
      });
    });
  }

  destroy() {
    this.deactivate();
    if (this.animationTicker) {
      this.spriteEngine.app.ticker.remove(this.animationTicker);
    }
  }
}

class ParticleSystem {
  constructor(id, spriteEngine, orchestrator) {
    this.id = id;
    this.spriteEngine = spriteEngine;
    this.orchestrator = orchestrator;
    this.particles = [];
    this.isActive = false;
  }

  async activate() {
    if (this.isActive) return;
    
    console.log(`Activating Particle System module: ${this.id}`);
    
    this.createParticleEffect();
    this.isActive = true;
  }

  async deactivate() {
    if (!this.isActive) return;
    
    console.log(`Deactivating Particle System module: ${this.id}`);
    
    this.particles.forEach(particle => {
      if (particle.parent) {
        particle.parent.removeChild(particle);
      }
    });
    this.particles = [];
    
    if (this.particleTicker) {
      this.spriteEngine.app.ticker.remove(this.particleTicker);
    }
    
    this.isActive = false;
  }

  createParticleEffect() {
    if (!this.spriteEngine || !this.spriteEngine.app) return;
    
    const centerX = this.spriteEngine.app.screen.width / 2;
    const centerY = this.spriteEngine.app.screen.height / 2;
    
    // Create particles
    for (let i = 0; i < 20; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(0xFFFFFF * Math.random());
      particle.drawCircle(0, 0, 3);
      particle.endFill();
      
      particle.x = centerX;
      particle.y = centerY;
      particle.vx = (Math.random() - 0.5) * 5;
      particle.vy = (Math.random() - 0.5) * 5;
      particle.life = 1.0;
      particle.decay = 0.01;
      
      this.spriteEngine.app.stage.addChild(particle);
      this.particles.push(particle);
    }
    
    // Animation ticker
    this.particleTicker = this.spriteEngine.app.ticker.add(() => {
      this.particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.alpha = particle.life;
        
        if (particle.life <= 0) {
          // Reset particle
          particle.x = centerX;
          particle.y = centerY;
          particle.vx = (Math.random() - 0.5) * 5;
          particle.vy = (Math.random() - 0.5) * 5;
          particle.life = 1.0;
        }
      });
    });
  }

  destroy() {
    this.deactivate();
  }
}

class UIOverlay {
  constructor(id, orchestrator) {
    this.id = id;
    this.orchestrator = orchestrator;
    this.isActive = false;
  }

  async activate() {
    if (this.isActive) return;
    
    console.log(`Activating UI Overlay module: ${this.id}`);
    this.isActive = true;
  }

  async deactivate() {
    if (!this.isActive) return;
    
    console.log(`Deactivating UI Overlay module: ${this.id}`);
    this.isActive = false;
  }

  destroy() {
    this.deactivate();
  }
}