import * as PIXI from 'pixi.js';

export class SpriteEngine {
  constructor() {
    this.app = null;
    this.spriteSheets = new Map();
    this.activeSprites = new Set();
    this.animationController = null;
    this.assetManager = null;
    this.isInitialized = false;
    this.performanceMetrics = {
      fps: 0,
      sprites: 0,
      drawCalls: 0,
      memory: 0
    };
  }

  async initialize(canvas) {
    try {
      console.log('Initializing Sprite Engine...');
      
      // Create PIXI Application using modern API
      this.app = new PIXI.Application();
      await this.app.init({
        canvas: canvas,
        width: canvas.clientWidth || 800,
        height: canvas.clientHeight || 600,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: 'high-performance'
      });

      // Make sure the canvas fills its container
      this.setupCanvas(canvas);
      
      // Initialize subsystems
      this.initializeAssetManager();
      this.initializeAnimationController();
      this.initializePerformanceMonitoring();
      
      // Set up resize handling
      this.setupResizeHandler();
      
      // Create default background
      this.createBackground();
      
      this.isInitialized = true;
      console.log('Sprite Engine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Sprite Engine:', error);
      throw error;
    }
  }

  setupCanvas(canvas) {
    // Make canvas responsive
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    
    // Initial resize
    this.resizeCanvas();
  }

  setupResizeHandler() {
    // Use a more robust resize handling approach
    const handleResize = () => {
      requestAnimationFrame(() => {
        this.resizeCanvas();
      });
    };

    // Use both ResizeObserver and window resize as fallback
    if (window.ResizeObserver) {
      try {
        this.resizeObserver = new ResizeObserver((entries) => {
          // Debounce resize calls
          if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
          }
          this.resizeTimeout = setTimeout(handleResize, 16); // ~60fps
        });
        
        if (this.app.canvas && this.app.canvas.parentElement) {
          this.resizeObserver.observe(this.app.canvas.parentElement);
        }
      } catch (error) {
        console.warn('ResizeObserver failed, falling back to window resize:', error);
        window.addEventListener('resize', handleResize);
      }
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
    }
  }

  resizeCanvas() {
    try {
      if (!this.app || !this.app.canvas || !this.app.canvas.parentElement) return;
      
      const parent = this.app.canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      
      // Only resize if dimensions have actually changed
      if (rect.width > 0 && rect.height > 0) {
        const currentWidth = this.app.screen.width;
        const currentHeight = this.app.screen.height;
        
        if (Math.abs(currentWidth - rect.width) > 1 || Math.abs(currentHeight - rect.height) > 1) {
          this.app.renderer.resize(rect.width, rect.height);
          
          // Update any background elements
          if (this.backgroundGraphics) {
            this.updateBackground();
          }
        }
      }
    } catch (error) {
      console.warn('Resize canvas error:', error);
    }
  }

  initializeAssetManager() {
    this.assetManager = new AssetManager();
    console.log('Asset Manager initialized');
  }

  initializeAnimationController() {
    this.animationController = new AnimationController(this.app);
    console.log('Animation Controller initialized');
  }

  initializePerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    this.app.ticker.add(() => {
      frameCount++;
      const currentTime = performance.now();
      
      // Update FPS every second
      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.performanceMetrics.sprites = this.activeSprites.size;
        this.performanceMetrics.memory = this.getMemoryUsage();
        
        // Emit performance update
        this.emitPerformanceUpdate();
        
        frameCount = 0;
        lastTime = currentTime;
      }
    });
  }

  createBackground() {
    this.backgroundGraphics = new PIXI.Graphics();
    this.updateBackground();
    this.app.stage.addChildAt(this.backgroundGraphics, 0);
  }

  updateBackground() {
    if (!this.backgroundGraphics) return;
    
    this.backgroundGraphics.clear();
    
    // Create animated gradient background
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    
    // Draw gradient rectangles
    const colors = [0x1a1a2e, 0x16213e, 0x0f3460];
    const segmentHeight = height / colors.length;
    
    for (let i = 0; i < colors.length; i++) {
      this.backgroundGraphics.beginFill(colors[i]);
      this.backgroundGraphics.drawRect(0, i * segmentHeight, width, segmentHeight);
      this.backgroundGraphics.endFill();
    }
    
    // Add some animated particles in background
    this.createBackgroundParticles();
  }

  createBackgroundParticles() {
    if (this.backgroundParticles) {
      this.backgroundParticles.forEach(particle => {
        this.backgroundGraphics.removeChild(particle);
      });
    }
    
    this.backgroundParticles = [];
    
    for (let i = 0; i < 20; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(0xffffff, 0.1);
      particle.drawCircle(0, 0, Math.random() * 3 + 1);
      particle.endFill();
      
      particle.x = Math.random() * this.app.screen.width;
      particle.y = Math.random() * this.app.screen.height;
      particle._vx = (Math.random() - 0.5) * 0.5;
      particle._vy = (Math.random() - 0.5) * 0.5;
      
      this.backgroundGraphics.addChild(particle);
      this.backgroundParticles.push(particle);
    }
    
    // Animate background particles
    if (!this.backgroundTicker) {
      this.backgroundTicker = this.app.ticker.add(() => {
        this.backgroundParticles.forEach(particle => {
          particle.x += particle._vx;
          particle.y += particle._vy;
          
          // Wrap around screen
          if (particle.x < 0) particle.x = this.app.screen.width;
          if (particle.x > this.app.screen.width) particle.x = 0;
          if (particle.y < 0) particle.y = this.app.screen.height;
          if (particle.y > this.app.screen.height) particle.y = 0;
        });
      });
    }
  }

  async loadSpriteSheet(url, data) {
    try {
      const texture = await PIXI.Assets.load(url);
      const spritesheet = new PIXI.Spritesheet(texture, data);
      await spritesheet.parse();
      
      this.spriteSheets.set(url, spritesheet);
      console.log(`Loaded sprite sheet: ${url}`);
      
      return spritesheet;
    } catch (error) {
      console.error(`Failed to load sprite sheet ${url}:`, error);
      throw error;
    }
  }

  createSprite(textureOrColor) {
    let sprite;
    
    if (typeof textureOrColor === 'number') {
      // Create colored rectangle sprite
      const graphics = new PIXI.Graphics();
      graphics.beginFill(textureOrColor);
      graphics.drawRect(0, 0, 32, 32);
      graphics.endFill();
      sprite = graphics;
    } else if (textureOrColor instanceof PIXI.Texture) {
      sprite = new PIXI.Sprite(textureOrColor);
    } else {
      // Default sprite
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0xffffff);
      graphics.drawRect(0, 0, 32, 32);
      graphics.endFill();
      sprite = graphics;
    }
    
    this.activeSprites.add(sprite);
    return sprite;
  }

  removeSprite(sprite) {
    if (sprite.parent) {
      sprite.parent.removeChild(sprite);
    }
    this.activeSprites.delete(sprite);
  }

  playAnimation(sprite, animationName, config = {}) {
    if (this.animationController) {
      return this.animationController.playAnimation(sprite, animationName, config);
    }
  }

  stopAnimation(sprite) {
    if (this.animationController) {
      this.animationController.stopAnimation(sprite);
    }
  }

  emitPerformanceUpdate() {
    // Emit performance update event
    const event = new CustomEvent('sprite-engine-performance', {
      detail: { ...this.performanceMetrics }
    });
    window.dispatchEvent(event);
  }

  getMemoryUsage() {
    // Estimate memory usage (simplified)
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  destroy() {
    console.log('Destroying Sprite Engine...');
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.backgroundTicker) {
      this.app.ticker.remove(this.backgroundTicker);
    }
    
    this.activeSprites.clear();
    this.spriteSheets.clear();
    
    if (this.app) {
      this.app.destroy(true, true);
    }
    
    this.isInitialized = false;
    console.log('Sprite Engine destroyed');
  }
}

// Asset Manager Class
class AssetManager {
  constructor() {
    this.assetCache = new Map();
    this.loadingPromises = new Map();
  }

  async loadAsset(url) {
    // Check cache first
    if (this.assetCache.has(url)) {
      return this.assetCache.get(url);
    }
    
    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }
    
    // Start loading
    const loadPromise = PIXI.Assets.load(url);
    this.loadingPromises.set(url, loadPromise);
    
    try {
      const asset = await loadPromise;
      this.assetCache.set(url, asset);
      this.loadingPromises.delete(url);
      return asset;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  getAsset(url) {
    return this.assetCache.get(url);
  }

  preloadAssets(urls) {
    return Promise.all(urls.map(url => this.loadAsset(url)));
  }

  clearCache() {
    this.assetCache.clear();
    this.loadingPromises.clear();
  }
}

// Animation Controller Class
class AnimationController {
  constructor(app) {
    this.app = app;
    this.animations = new Map();
    this.activeAnimations = new Set();
  }

  playAnimation(sprite, animationName, config = {}) {
    const animation = new SpriteAnimation(sprite, animationName, config);
    this.activeAnimations.add(animation);
    
    const ticker = () => {
      if (!animation.update()) {
        this.app.ticker.remove(ticker);
        this.activeAnimations.delete(animation);
      }
    };
    
    this.app.ticker.add(ticker);
    return animation;
  }

  stopAnimation(sprite) {
    for (const animation of this.activeAnimations) {
      if (animation.sprite === sprite) {
        animation.stop();
        this.activeAnimations.delete(animation);
      }
    }
  }

  stopAllAnimations() {
    for (const animation of this.activeAnimations) {
      animation.stop();
    }
    this.activeAnimations.clear();
  }
}

// Sprite Animation Class
class SpriteAnimation {
  constructor(sprite, animationName, config = {}) {
    this.sprite = sprite;
    this.animationName = animationName;
    this.config = {
      duration: 1000,
      loop: false,
      easing: 'linear',
      ...config
    };
    
    this.startTime = performance.now();
    this.isActive = true;
    this.startValues = this.captureStartValues();
  }

  captureStartValues() {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      scaleX: this.sprite.scale.x,
      scaleY: this.sprite.scale.y,
      rotation: this.sprite.rotation,
      alpha: this.sprite.alpha
    };
  }

  update() {
    if (!this.isActive) return false;
    
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.config.duration, 1);
    
    // Apply animation based on name
    this.applyAnimation(progress);
    
    if (progress >= 1) {
      if (this.config.loop) {
        this.startTime = performance.now();
        return true;
      } else {
        this.isActive = false;
        return false;
      }
    }
    
    return true;
  }

  applyAnimation(progress) {
    const easedProgress = this.easeProgress(progress);
    
    switch (this.animationName) {
      case 'fadeIn':
        this.sprite.alpha = easedProgress;
        break;
      case 'fadeOut':
        this.sprite.alpha = 1 - easedProgress;
        break;
      case 'slideIn':
        this.sprite.x = this.startValues.x + (this.config.targetX - this.startValues.x) * easedProgress;
        this.sprite.y = this.startValues.y + (this.config.targetY - this.startValues.y) * easedProgress;
        break;
      case 'scale':
        const scale = 1 + (this.config.targetScale - 1) * easedProgress;
        this.sprite.scale.set(scale);
        break;
      case 'rotate':
        this.sprite.rotation = this.startValues.rotation + (this.config.targetRotation * easedProgress);
        break;
      default:
        // Custom animation with keyframes
        if (this.config.keyframes) {
          this.applyKeyframes(easedProgress);
        }
    }
  }

  easeProgress(progress) {
    switch (this.config.easing) {
      case 'easeIn':
        return progress * progress;
      case 'easeOut':
        return 1 - (1 - progress) * (1 - progress);
      case 'easeInOut':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - 2 * (1 - progress) * (1 - progress);
      default:
        return progress;
    }
  }

  applyKeyframes(progress) {
    // Apply keyframe-based animation
    if (!this.config.keyframes || this.config.keyframes.length === 0) return;
    
    const keyframes = this.config.keyframes;
    const keyframeIndex = Math.floor(progress * (keyframes.length - 1));
    const nextIndex = Math.min(keyframeIndex + 1, keyframes.length - 1);
    
    const currentFrame = keyframes[keyframeIndex];
    const nextFrame = keyframes[nextIndex];
    
    if (keyframeIndex === nextIndex) {
      // Last keyframe
      this.applyKeyframe(currentFrame);
    } else {
      // Interpolate between keyframes
      const localProgress = (progress * (keyframes.length - 1)) - keyframeIndex;
      this.interpolateKeyframes(currentFrame, nextFrame, localProgress);
    }
  }

  applyKeyframe(keyframe) {
    if (keyframe.x !== undefined) this.sprite.x = keyframe.x;
    if (keyframe.y !== undefined) this.sprite.y = keyframe.y;
    if (keyframe.scaleX !== undefined) this.sprite.scale.x = keyframe.scaleX;
    if (keyframe.scaleY !== undefined) this.sprite.scale.y = keyframe.scaleY;
    if (keyframe.rotation !== undefined) this.sprite.rotation = keyframe.rotation;
    if (keyframe.alpha !== undefined) this.sprite.alpha = keyframe.alpha;
  }

  interpolateKeyframes(frame1, frame2, progress) {
    const lerp = (a, b, t) => a + (b - a) * t;
    
    if (frame1.x !== undefined && frame2.x !== undefined) {
      this.sprite.x = lerp(frame1.x, frame2.x, progress);
    }
    if (frame1.y !== undefined && frame2.y !== undefined) {
      this.sprite.y = lerp(frame1.y, frame2.y, progress);
    }
    if (frame1.scaleX !== undefined && frame2.scaleX !== undefined) {
      this.sprite.scale.x = lerp(frame1.scaleX, frame2.scaleX, progress);
    }
    if (frame1.scaleY !== undefined && frame2.scaleY !== undefined) {
      this.sprite.scale.y = lerp(frame1.scaleY, frame2.scaleY, progress);
    }
    if (frame1.rotation !== undefined && frame2.rotation !== undefined) {
      this.sprite.rotation = lerp(frame1.rotation, frame2.rotation, progress);
    }
    if (frame1.alpha !== undefined && frame2.alpha !== undefined) {
      this.sprite.alpha = lerp(frame1.alpha, frame2.alpha, progress);
    }
  }

  stop() {
    this.isActive = false;
  }
}