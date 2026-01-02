/**
 * RGB Split Effect Generator
 * Chromatic Aberration Effect Engine
 */

// ========================================
// State Management
// ========================================

const state = {
    inputMode: 'svg', // 'svg' or 'text'
    settings: {
        algorithm: 'classic',
        intensity: 100,
        angle: 0,
        frequency: 5,
        amplitude: 10,
        noiseScale: 50,
        noiseSeed: 42,
        distortion: 30,

        red: { x: 5, y: -3, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        green: { x: 0, y: 0, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        blue: { x: -5, y: 3, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },

        // Color profile
        colorProfile: 'rgb',
        channel1Color: '#ff0000',
        channel2Color: '#00ff00',
        channel3Color: '#0000ff',
        allChannelsBlend: '', // empty means per-channel

        bgColor: '#0a0a0f',
        bgTransparent: false,
        globalBlend: 'normal',
        layerOrder: 'rgb',
        showBase: true,
        baseOpacity: 50,

        fontSize: 72,
        fontWeight: 700,
        textColor: '#ffffff'
    }
};

// Presets
const presets = {
    subtle: {
        algorithm: 'classic',
        intensity: 100,
        red: { x: 2, y: -1, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        green: { x: 0, y: 0, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        blue: { x: -2, y: 1, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        showBase: true,
        baseOpacity: 70
    },
    glitch: {
        algorithm: 'classic',
        intensity: 150,
        red: { x: 12, y: -4, opacity: 90, blend: 'screen', scale: 102, rotation: 1 },
        green: { x: -3, y: 2, opacity: 85, blend: 'lighten', scale: 100, rotation: 0 },
        blue: { x: -10, y: 5, opacity: 95, blend: 'screen', scale: 98, rotation: -1 },
        showBase: false,
        baseOpacity: 50
    },
    vhs: {
        algorithm: 'wave',
        intensity: 120,
        frequency: 8,
        amplitude: 6,
        red: { x: 8, y: 0, opacity: 80, blend: 'lighten', scale: 100, rotation: 0 },
        green: { x: 0, y: 2, opacity: 90, blend: 'screen', scale: 100, rotation: 0 },
        blue: { x: -6, y: 0, opacity: 85, blend: 'lighten', scale: 100, rotation: 0 },
        showBase: true,
        baseOpacity: 40
    },
    '3d': {
        algorithm: 'classic',
        intensity: 100,
        red: { x: -6, y: 0, opacity: 100, blend: 'multiply', scale: 100, rotation: 0 },
        green: { x: 0, y: 0, opacity: 0, blend: 'normal', scale: 100, rotation: 0 },
        blue: { x: 6, y: 0, opacity: 100, blend: 'multiply', scale: 100, rotation: 0 },
        showBase: true,
        baseOpacity: 100,
        bgColor: '#ffffff'
    },
    neon: {
        algorithm: 'radial',
        intensity: 130,
        angle: 45,
        red: { x: 6, y: -6, opacity: 100, blend: 'screen', scale: 105, rotation: 2 },
        green: { x: 0, y: 0, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        blue: { x: -6, y: 6, opacity: 100, blend: 'screen', scale: 95, rotation: -2 },
        showBase: false,
        baseOpacity: 50
    },
    retro: {
        algorithm: 'angular',
        intensity: 110,
        angle: 120,
        red: { x: 4, y: 2, opacity: 95, blend: 'overlay', scale: 100, rotation: 0 },
        green: { x: -2, y: -1, opacity: 90, blend: 'overlay', scale: 100, rotation: 0 },
        blue: { x: 3, y: -3, opacity: 100, blend: 'overlay', scale: 100, rotation: 0 },
        showBase: true,
        baseOpacity: 60
    }
};

// ========================================
// Noise Generator (Simplex-like)
// ========================================

class SimplexNoise {
    constructor(seed = 42) {
        this.seed = seed;
        this.p = this.buildPermutationTable();
    }

    buildPermutationTable() {
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;

        // Seed-based shuffle
        let n = this.seed;
        for (let i = 255; i > 0; i--) {
            n = (n * 16807) % 2147483647;
            const j = n % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }

        return [...p, ...p];
    }

    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        const grad = (hash, x, y) => {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
        };

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * grad(this.p[ii + this.p[jj]], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * grad(this.p[ii + i1 + this.p[jj + j1]], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * grad(this.p[ii + 1 + this.p[jj + 1]], x2, y2);
        }

        return 70 * (n0 + n1 + n2);
    }
}

let noiseGenerator = new SimplexNoise(state.settings.noiseSeed);

// ========================================
// RGB Split Algorithms
// ========================================

const algorithms = {
    /**
     * Classic Offset - Simple X/Y displacement per channel
     */
    classic: (channel, x, y, settings) => {
        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        return {
            x: channelSettings.x * intensity,
            y: channelSettings.y * intensity
        };
    },

    /**
     * Radial Split - Channels split outward from center
     */
    radial: (channel, x, y, settings, bounds) => {
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + (settings.angle * Math.PI / 180);

        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        const channelMultiplier = channel === 'red' ? 1 : (channel === 'blue' ? -1 : 0);

        const offset = distance * 0.02 * channelMultiplier * intensity;

        return {
            x: channelSettings.x * intensity + Math.cos(angle) * offset,
            y: channelSettings.y * intensity + Math.sin(angle) * offset
        };
    },

    /**
     * Angular Split - Channels offset along specified angles
     */
    angular: (channel, x, y, settings) => {
        const angleRad = settings.angle * Math.PI / 180;
        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;

        const channelOffset = channel === 'red' ? 1 : (channel === 'blue' ? -1 : 0);
        const baseOffset = 10 * channelOffset;

        return {
            x: channelSettings.x * intensity + Math.cos(angleRad) * baseOffset * intensity,
            y: channelSettings.y * intensity + Math.sin(angleRad) * baseOffset * intensity
        };
    },

    /**
     * Wave/Sinusoidal - Oscillating displacement
     */
    wave: (channel, x, y, settings, bounds) => {
        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        const freq = settings.frequency;
        const amp = settings.amplitude;

        const channelPhase = channel === 'red' ? 0 : (channel === 'green' ? 2.094 : 4.189);
        const waveX = Math.sin((y / bounds.height) * freq * Math.PI + channelPhase) * amp;
        const waveY = Math.cos((x / bounds.width) * freq * Math.PI + channelPhase) * amp * 0.5;

        return {
            x: channelSettings.x * intensity + waveX * intensity,
            y: channelSettings.y * intensity + waveY * intensity
        };
    },

    /**
     * Noise-based - Organic displacement using simplex noise
     */
    noise: (channel, x, y, settings, bounds) => {
        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        const scale = settings.noiseScale / 100;

        const channelOffset = channel === 'red' ? 0 : (channel === 'green' ? 100 : 200);
        const noiseX = noiseGenerator.noise2D(
            (x / bounds.width) * scale * 5 + channelOffset,
            (y / bounds.height) * scale * 5
        );
        const noiseY = noiseGenerator.noise2D(
            (x / bounds.width) * scale * 5 + channelOffset + 50,
            (y / bounds.height) * scale * 5 + 50
        );

        return {
            x: channelSettings.x * intensity + noiseX * 20 * intensity,
            y: channelSettings.y * intensity + noiseY * 20 * intensity
        };
    },

    /**
     * Barrel Distortion - Lens distortion simulation (outward)
     */
    barrel: (channel, x, y, settings, bounds) => {
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const dx = (x - centerX) / centerX;
        const dy = (y - centerY) / centerY;
        const r = Math.sqrt(dx * dx + dy * dy);

        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        const distortion = settings.distortion / 100;

        const channelMultiplier = channel === 'red' ? 1.02 : (channel === 'blue' ? 0.98 : 1);
        const factor = 1 + distortion * r * r * (channelMultiplier - 1) * 5;

        return {
            x: channelSettings.x * intensity + (dx * factor - dx) * centerX * distortion,
            y: channelSettings.y * intensity + (dy * factor - dy) * centerY * distortion
        };
    },

    /**
     * Pincushion Distortion - Lens distortion simulation (inward)
     */
    pincushion: (channel, x, y, settings, bounds) => {
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const dx = (x - centerX) / centerX;
        const dy = (y - centerY) / centerY;
        const r = Math.sqrt(dx * dx + dy * dy);

        const channelSettings = settings[channel];
        const intensity = settings.intensity / 100;
        const distortion = settings.distortion / 100;

        const channelMultiplier = channel === 'red' ? 0.98 : (channel === 'blue' ? 1.02 : 1);
        const factor = 1 - distortion * r * r * (1 - channelMultiplier) * 5;

        return {
            x: channelSettings.x * intensity + (dx * factor - dx) * centerX * distortion,
            y: channelSettings.y * intensity + (dy * factor - dy) * centerY * distortion
        };
    }
};

// ========================================
// DOM Elements
// ========================================

const elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    svgTab: document.getElementById('svg-tab'),
    textTab: document.getElementById('text-tab'),

    // Inputs
    svgInput: document.getElementById('svg-input'),
    textInput: document.getElementById('text-input'),
    fontSize: document.getElementById('font-size'),
    fontWeight: document.getElementById('font-weight'),
    textColor: document.getElementById('text-color'),

    // Preview
    previewContainer: document.getElementById('preview-container'),
    previewCanvas: document.getElementById('preview-canvas'),

    // Export
    exportPng: document.getElementById('export-png'),
    exportSvg: document.getElementById('export-svg'),

    // Algorithm
    algorithm: document.getElementById('algorithm'),
    intensity: document.getElementById('intensity'),
    angle: document.getElementById('angle'),
    frequency: document.getElementById('frequency'),
    amplitude: document.getElementById('amplitude'),
    noiseScale: document.getElementById('noise-scale'),
    noiseSeed: document.getElementById('noise-seed'),
    distortion: document.getElementById('distortion'),

    // Channels
    redX: document.getElementById('red-x'),
    redY: document.getElementById('red-y'),
    redOpacity: document.getElementById('red-opacity'),
    redBlend: document.getElementById('red-blend'),
    redScale: document.getElementById('red-scale'),
    redRotation: document.getElementById('red-rotation'),

    greenX: document.getElementById('green-x'),
    greenY: document.getElementById('green-y'),
    greenOpacity: document.getElementById('green-opacity'),
    greenBlend: document.getElementById('green-blend'),
    greenScale: document.getElementById('green-scale'),
    greenRotation: document.getElementById('green-rotation'),

    blueX: document.getElementById('blue-x'),
    blueY: document.getElementById('blue-y'),
    blueOpacity: document.getElementById('blue-opacity'),
    blueBlend: document.getElementById('blue-blend'),
    blueScale: document.getElementById('blue-scale'),
    blueRotation: document.getElementById('blue-rotation'),

    // Background
    bgColor: document.getElementById('bg-color'),
    bgTransparent: document.getElementById('bg-transparent'),

    // Color Profile
    colorProfilePreset: document.getElementById('color-profile-preset'),
    channel1Color: document.getElementById('channel1-color'),
    channel2Color: document.getElementById('channel2-color'),
    channel3Color: document.getElementById('channel3-color'),
    allChannelsBlend: document.getElementById('all-channels-blend'),

    // Advanced
    globalBlend: document.getElementById('global-blend'),
    layerOrder: document.getElementById('layer-order'),
    showBase: document.getElementById('show-base'),
    baseOpacity: document.getElementById('base-opacity'),

    // Presets
    presetBtns: document.querySelectorAll('.preset-btn'),
    resetBtn: document.getElementById('reset-btn'),

    // Section headers
    sectionHeaders: document.querySelectorAll('.section-header')
};

// ========================================
// Rendering Engine
// ========================================

function render() {
    const canvas = elements.previewCanvas;
    canvas.innerHTML = '';

    // Set background
    if (state.settings.bgTransparent) {
        elements.previewContainer.style.backgroundColor = 'transparent';
        // Show checkerboard pattern for transparency
        elements.previewContainer.style.backgroundImage = `
            linear-gradient(45deg, var(--bg-tertiary) 25%, transparent 25%),
            linear-gradient(-45deg, var(--bg-tertiary) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, var(--bg-tertiary) 75%),
            linear-gradient(-45deg, transparent 75%, var(--bg-tertiary) 75%)`;
    } else {
        elements.previewContainer.style.backgroundColor = state.settings.bgColor;
        // Hide checkerboard pattern
        elements.previewContainer.style.backgroundImage = 'none';
    }

    // Create SVG filter definitions
    const svgNS = 'http://www.w3.org/2000/svg';
    const filterSvg = document.createElementNS(svgNS, 'svg');
    filterSvg.setAttribute('width', '0');
    filterSvg.setAttribute('height', '0');
    filterSvg.style.position = 'absolute';

    const defs = document.createElementNS(svgNS, 'defs');

    // Create channel filters based on custom colors
    const ch1 = hexToRgbNormalized(state.settings.channel1Color);
    const ch2 = hexToRgbNormalized(state.settings.channel2Color);
    const ch3 = hexToRgbNormalized(state.settings.channel3Color);

    const redFilter = createTintFilter('redChannel', ch1.r, ch1.g, ch1.b);
    const greenFilter = createTintFilter('greenChannel', ch2.r, ch2.g, ch2.b);
    const blueFilter = createTintFilter('blueChannel', ch3.r, ch3.g, ch3.b);

    defs.appendChild(redFilter);
    defs.appendChild(greenFilter);
    defs.appendChild(blueFilter);
    filterSvg.appendChild(defs);
    canvas.appendChild(filterSvg);

    // Get content based on input mode
    let content;
    if (state.inputMode === 'svg') {
        content = createSvgContent();
    } else {
        content = createTextContent();
    }

    if (!content) return;

    // Get bounds
    const bounds = {
        width: canvas.offsetWidth || 400,
        height: canvas.offsetHeight || 300
    };

    // Determine layer order
    const order = state.settings.layerOrder.split('');
    const channelMap = { r: 'red', g: 'green', b: 'blue' };

    // Create base layer if enabled
    if (state.settings.showBase) {
        const baseLayer = createLayer(content, 'base', bounds);
        baseLayer.style.opacity = state.settings.baseOpacity / 100;
        baseLayer.style.filter = 'none';
        canvas.appendChild(baseLayer);
    }

    // Create RGB layers in specified order
    order.forEach(char => {
        const channel = channelMap[char];
        const layer = createLayer(content, channel, bounds);
        canvas.appendChild(layer);
    });
}

function createColorFilter(id, r, g, b) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    const matrix = document.createElementNS(svgNS, 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    matrix.setAttribute('values', `
        ${r} 0 0 0 0
        0 ${g} 0 0 0
        0 0 ${b} 0 0
        0 0 0 1 0
    `);

    filter.appendChild(matrix);
    return filter;
}

/**
 * Convert hex color to normalized RGB values (0-1)
 */
function hexToRgbNormalized(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 0, b: 0 };
}

/**
 * Create a tint filter that colorizes content with a specific color
 * This works better for dark text on light backgrounds
 */
function createTintFilter(id, r, g, b) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    // Use luminance to alpha, then colorize
    // This extracts the brightness and applies the color tint
    const matrix = document.createElementNS(svgNS, 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    // Colorize based on luminance: multiply RGB by the target color
    matrix.setAttribute('values', `
        ${r} 0 0 0 0
        0 ${g} 0 0 0
        0 0 ${b} 0 0
        0 0 0 1 0
    `);

    filter.appendChild(matrix);
    return filter;
}

function createSvgContent() {
    const svgCode = elements.svgInput.value.trim();
    if (!svgCode) return null;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgCode, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg || doc.querySelector('parsererror')) {
            return null;
        }

        return svg.cloneNode(true);
    } catch (e) {
        return null;
    }
}

function createTextContent() {
    const text = elements.textInput.value.trim();
    if (!text) return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    // Create text element
    const textEl = document.createElementNS(svgNS, 'text');
    textEl.setAttribute('x', '50%');
    textEl.setAttribute('y', '50%');
    textEl.setAttribute('dominant-baseline', 'middle');
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('fill', state.settings.textColor);
    textEl.setAttribute('font-family', 'Inter, sans-serif');
    textEl.setAttribute('font-size', state.settings.fontSize);
    textEl.setAttribute('font-weight', state.settings.fontWeight);
    textEl.textContent = text;

    svg.appendChild(textEl);

    // Set viewBox based on approximate text size
    const charWidth = state.settings.fontSize * 0.6;
    const width = text.length * charWidth + 40;
    const height = state.settings.fontSize * 1.5;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Let SVG scale to fill container - CSS handles the sizing
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.overflow = 'visible';

    return svg;
}

function createLayer(content, channel, bounds) {
    const layer = document.createElement('div');
    layer.className = `rgb-layer ${channel}-layer`;

    const channelSettings = state.settings[channel];

    if (channel !== 'base') {
        // Get offset from algorithm
        const algorithm = algorithms[state.settings.algorithm];
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const offset = algorithm(channel, centerX, centerY, state.settings, bounds);

        // Apply transforms
        const scale = channelSettings.scale / 100;
        const rotation = channelSettings.rotation;

        layer.style.transform = `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale}) rotate(${rotation}deg)`;
        layer.style.opacity = channelSettings.opacity / 100;
        layer.style.mixBlendMode = channelSettings.blend;

        // Apply color channel filter
        layer.style.filter = `url(#${channel}Channel)`;
    }

    // Clone and append content
    const clone = content.cloneNode(true);
    clone.classList.add('preview-svg');
    layer.appendChild(clone);

    return layer;
}

// ========================================
// UI Helpers
// ========================================

function updateValueDisplay(inputId, suffix = '') {
    const input = document.getElementById(inputId);
    const display = document.getElementById(`${inputId}-value`);
    if (input && display) {
        display.textContent = input.value + suffix;
    }
}

function updateAlgorithmControls() {
    const algorithm = state.settings.algorithm;
    document.querySelectorAll('.algorithm-specific').forEach(el => {
        const algorithms = el.dataset.algorithms.split(',');
        el.classList.toggle('visible', algorithms.includes(algorithm));
    });
}

function syncUIWithState() {
    // Algorithm
    elements.algorithm.value = state.settings.algorithm;
    elements.intensity.value = state.settings.intensity;
    elements.angle.value = state.settings.angle;
    elements.frequency.value = state.settings.frequency;
    elements.amplitude.value = state.settings.amplitude;
    elements.noiseScale.value = state.settings.noiseScale;
    elements.noiseSeed.value = state.settings.noiseSeed;
    elements.distortion.value = state.settings.distortion;

    // Red channel
    elements.redX.value = state.settings.red.x;
    elements.redY.value = state.settings.red.y;
    elements.redOpacity.value = state.settings.red.opacity;
    elements.redBlend.value = state.settings.red.blend;
    elements.redScale.value = state.settings.red.scale;
    elements.redRotation.value = state.settings.red.rotation;

    // Green channel
    elements.greenX.value = state.settings.green.x;
    elements.greenY.value = state.settings.green.y;
    elements.greenOpacity.value = state.settings.green.opacity;
    elements.greenBlend.value = state.settings.green.blend;
    elements.greenScale.value = state.settings.green.scale;
    elements.greenRotation.value = state.settings.green.rotation;

    // Blue channel
    elements.blueX.value = state.settings.blue.x;
    elements.blueY.value = state.settings.blue.y;
    elements.blueOpacity.value = state.settings.blue.opacity;
    elements.blueBlend.value = state.settings.blue.blend;
    elements.blueScale.value = state.settings.blue.scale;
    elements.blueRotation.value = state.settings.blue.rotation;

    // Background
    elements.bgColor.value = state.settings.bgColor;
    elements.bgTransparent.checked = state.settings.bgTransparent;

    // Advanced
    elements.globalBlend.value = state.settings.globalBlend;
    elements.layerOrder.value = state.settings.layerOrder;
    elements.showBase.checked = state.settings.showBase;
    elements.baseOpacity.value = state.settings.baseOpacity;

    // Font
    elements.fontSize.value = state.settings.fontSize;
    elements.fontWeight.value = state.settings.fontWeight;
    elements.textColor.value = state.settings.textColor;
    document.getElementById('text-color-value').textContent = state.settings.textColor;

    // Color Profile
    elements.colorProfilePreset.value = state.settings.colorProfile;
    elements.channel1Color.value = state.settings.channel1Color;
    elements.channel2Color.value = state.settings.channel2Color;
    elements.channel3Color.value = state.settings.channel3Color;
    elements.allChannelsBlend.value = state.settings.allChannelsBlend;
    document.getElementById('channel1-color-value').textContent = state.settings.channel1Color;
    document.getElementById('channel2-color-value').textContent = state.settings.channel2Color;
    document.getElementById('channel3-color-value').textContent = state.settings.channel3Color;

    // Update all value displays
    updateValueDisplay('intensity', '%');
    updateValueDisplay('angle', '°');
    updateValueDisplay('frequency', '');
    updateValueDisplay('amplitude', 'px');
    updateValueDisplay('noise-scale', '');
    updateValueDisplay('distortion', '%');

    updateValueDisplay('red-x', 'px');
    updateValueDisplay('red-y', 'px');
    updateValueDisplay('red-opacity', '%');
    updateValueDisplay('red-scale', '%');
    updateValueDisplay('red-rotation', '°');

    updateValueDisplay('green-x', 'px');
    updateValueDisplay('green-y', 'px');
    updateValueDisplay('green-opacity', '%');
    updateValueDisplay('green-scale', '%');
    updateValueDisplay('green-rotation', '°');

    updateValueDisplay('blue-x', 'px');
    updateValueDisplay('blue-y', 'px');
    updateValueDisplay('blue-opacity', '%');
    updateValueDisplay('blue-scale', '%');
    updateValueDisplay('blue-rotation', '°');

    updateValueDisplay('base-opacity', '%');
    updateValueDisplay('font-size', 'px');

    document.getElementById('bg-color-value').textContent = state.settings.bgColor;

    updateAlgorithmControls();
}

function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;

    // Apply preset values
    Object.keys(preset).forEach(key => {
        if (typeof preset[key] === 'object') {
            Object.assign(state.settings[key], preset[key]);
        } else {
            state.settings[key] = preset[key];
        }
    });

    // Update noise generator if seed changed
    if (preset.noiseSeed !== undefined) {
        noiseGenerator = new SimplexNoise(preset.noiseSeed);
    }

    syncUIWithState();
    render();

    // Update active preset button
    elements.presetBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetName);
    });
}

function resetToDefault() {
    state.settings = {
        algorithm: 'classic',
        intensity: 100,
        angle: 0,
        frequency: 5,
        amplitude: 10,
        noiseScale: 50,
        noiseSeed: 42,
        distortion: 30,

        red: { x: 5, y: -3, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        green: { x: 0, y: 0, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },
        blue: { x: -5, y: 3, opacity: 100, blend: 'screen', scale: 100, rotation: 0 },

        // Color profile
        colorProfile: 'rgb',
        channel1Color: '#ff0000',
        channel2Color: '#00ff00',
        channel3Color: '#0000ff',
        allChannelsBlend: '',

        bgColor: '#0a0a0f',
        bgTransparent: false,
        globalBlend: 'normal',
        layerOrder: 'rgb',
        showBase: true,
        baseOpacity: 50,

        fontSize: 72,
        fontWeight: 700,
        textColor: '#ffffff'
    };

    noiseGenerator = new SimplexNoise(42);
    syncUIWithState();
    render();

    elements.presetBtns.forEach(btn => btn.classList.remove('active'));
}

// ========================================
// Export Functions
// ========================================

async function exportAsPng() {
    const canvas = elements.previewCanvas;
    const bounds = canvas.getBoundingClientRect();

    // Create a canvas element
    const exportCanvas = document.createElement('canvas');
    const scale = 2; // For better quality
    exportCanvas.width = bounds.width * scale;
    exportCanvas.height = bounds.height * scale;

    const ctx = exportCanvas.getContext('2d');
    ctx.scale(scale, scale);

    // Draw background
    if (!state.settings.bgTransparent) {
        ctx.fillStyle = state.settings.bgColor;
        ctx.fillRect(0, 0, bounds.width, bounds.height);
    }

    // Use html2canvas-like approach with SVG foreignObject
    const data = new XMLSerializer().serializeToString(createExportSvg(bounds));
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, bounds.width, bounds.height);
        URL.revokeObjectURL(url);

        // Download
        const link = document.createElement('a');
        link.download = 'rgb-split-effect.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    };
    img.src = url;
}

function exportAsSvg() {
    const canvas = elements.previewCanvas;
    const bounds = canvas.getBoundingClientRect();

    const svg = createExportSvg(bounds);
    const data = new XMLSerializer().serializeToString(svg);

    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'rgb-split-effect.svg';
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
}

function createExportSvg(bounds) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', bounds.width);
    svg.setAttribute('height', bounds.height);
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);

    // Add filter definitions
    const defs = document.createElementNS(svgNS, 'defs');
    defs.appendChild(createColorFilter('redChannel', 1, 0, 0));
    defs.appendChild(createColorFilter('greenChannel', 0, 1, 0));
    defs.appendChild(createColorFilter('blueChannel', 0, 0, 1));
    svg.appendChild(defs);

    // Add background
    if (!state.settings.bgTransparent) {
        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', state.settings.bgColor);
        svg.appendChild(bg);
    }

    // Get content
    let content;
    if (state.inputMode === 'svg') {
        content = createSvgContent();
    } else {
        content = createTextContent();
    }

    if (!content) return svg;

    // Create layers
    const order = state.settings.layerOrder.split('');
    const channelMap = { r: 'red', g: 'green', b: 'blue' };

    // Base layer
    if (state.settings.showBase) {
        const baseGroup = document.createElementNS(svgNS, 'g');
        baseGroup.setAttribute('opacity', state.settings.baseOpacity / 100);
        baseGroup.setAttribute('transform', `translate(${bounds.width / 2}, ${bounds.height / 2})`);

        const clone = content.cloneNode(true);
        const contentBounds = getContentBounds(content);
        clone.setAttribute('x', -contentBounds.width / 2);
        clone.setAttribute('y', -contentBounds.height / 2);
        baseGroup.appendChild(clone);
        svg.appendChild(baseGroup);
    }

    // RGB layers
    order.forEach(char => {
        const channel = channelMap[char];
        const channelSettings = state.settings[channel];
        const algorithm = algorithms[state.settings.algorithm];
        const offset = algorithm(channel, bounds.width / 2, bounds.height / 2, state.settings, bounds);

        const group = document.createElementNS(svgNS, 'g');
        group.setAttribute('filter', `url(#${channel}Channel)`);
        group.setAttribute('opacity', channelSettings.opacity / 100);
        group.style.mixBlendMode = channelSettings.blend;

        const scale = channelSettings.scale / 100;
        const rotation = channelSettings.rotation;
        group.setAttribute('transform',
            `translate(${bounds.width / 2 + offset.x}, ${bounds.height / 2 + offset.y}) scale(${scale}) rotate(${rotation})`
        );

        const clone = content.cloneNode(true);
        const contentBounds = getContentBounds(content);
        clone.setAttribute('x', -contentBounds.width / 2);
        clone.setAttribute('y', -contentBounds.height / 2);
        group.appendChild(clone);
        svg.appendChild(group);
    });

    return svg;
}

function getContentBounds(svg) {
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
        const parts = viewBox.split(' ').map(Number);
        return { width: parts[2], height: parts[3] };
    }
    return {
        width: parseFloat(svg.getAttribute('width')) || 100,
        height: parseFloat(svg.getAttribute('height')) || 100
    };
}

// ========================================
// Event Listeners
// ========================================

function initEventListeners() {
    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            state.inputMode = tab;

            elements.svgTab.classList.toggle('hidden', tab !== 'svg');
            elements.textTab.classList.toggle('hidden', tab !== 'text');

            render();
        });
    });

    // Input changes
    elements.svgInput.addEventListener('input', render);
    elements.textInput.addEventListener('input', render);

    elements.fontSize.addEventListener('input', (e) => {
        state.settings.fontSize = parseInt(e.target.value);
        updateValueDisplay('font-size', 'px');
        render();
    });

    elements.fontWeight.addEventListener('change', (e) => {
        state.settings.fontWeight = parseInt(e.target.value);
        render();
    });

    elements.textColor.addEventListener('input', (e) => {
        state.settings.textColor = e.target.value;
        document.getElementById('text-color-value').textContent = e.target.value;
        render();
    });

    // Algorithm controls
    elements.algorithm.addEventListener('change', (e) => {
        state.settings.algorithm = e.target.value;
        updateAlgorithmControls();
        render();
    });

    elements.intensity.addEventListener('input', (e) => {
        state.settings.intensity = parseInt(e.target.value);
        updateValueDisplay('intensity', '%');
        render();
    });

    elements.angle.addEventListener('input', (e) => {
        state.settings.angle = parseInt(e.target.value);
        updateValueDisplay('angle', '°');
        render();
    });

    elements.frequency.addEventListener('input', (e) => {
        state.settings.frequency = parseInt(e.target.value);
        updateValueDisplay('frequency', '');
        render();
    });

    elements.amplitude.addEventListener('input', (e) => {
        state.settings.amplitude = parseInt(e.target.value);
        updateValueDisplay('amplitude', 'px');
        render();
    });

    elements.noiseScale.addEventListener('input', (e) => {
        state.settings.noiseScale = parseInt(e.target.value);
        updateValueDisplay('noise-scale', '');
        render();
    });

    elements.noiseSeed.addEventListener('input', (e) => {
        state.settings.noiseSeed = parseInt(e.target.value);
        noiseGenerator = new SimplexNoise(state.settings.noiseSeed);
        render();
    });

    elements.distortion.addEventListener('input', (e) => {
        state.settings.distortion = parseInt(e.target.value);
        updateValueDisplay('distortion', '%');
        render();
    });

    // Color Profile
    elements.colorProfilePreset.addEventListener('change', (e) => {
        state.settings.colorProfile = e.target.value;
        const profiles = {
            rgb: { ch1: '#ff0000', ch2: '#00ff00', ch3: '#0000ff' },
            cmy: { ch1: '#00ffff', ch2: '#ff00ff', ch3: '#ffff00' },
            custom: null // Don't change colors for custom
        };
        const profile = profiles[e.target.value];
        if (profile) {
            state.settings.channel1Color = profile.ch1;
            state.settings.channel2Color = profile.ch2;
            state.settings.channel3Color = profile.ch3;
            elements.channel1Color.value = profile.ch1;
            elements.channel2Color.value = profile.ch2;
            elements.channel3Color.value = profile.ch3;
            document.getElementById('channel1-color-value').textContent = profile.ch1;
            document.getElementById('channel2-color-value').textContent = profile.ch2;
            document.getElementById('channel3-color-value').textContent = profile.ch3;
        }
        render();
    });

    elements.channel1Color.addEventListener('input', (e) => {
        state.settings.channel1Color = e.target.value;
        state.settings.colorProfile = 'custom';
        elements.colorProfilePreset.value = 'custom';
        document.getElementById('channel1-color-value').textContent = e.target.value;
        render();
    });

    elements.channel2Color.addEventListener('input', (e) => {
        state.settings.channel2Color = e.target.value;
        state.settings.colorProfile = 'custom';
        elements.colorProfilePreset.value = 'custom';
        document.getElementById('channel2-color-value').textContent = e.target.value;
        render();
    });

    elements.channel3Color.addEventListener('input', (e) => {
        state.settings.channel3Color = e.target.value;
        state.settings.colorProfile = 'custom';
        elements.colorProfilePreset.value = 'custom';
        document.getElementById('channel3-color-value').textContent = e.target.value;
        render();
    });

    elements.allChannelsBlend.addEventListener('change', (e) => {
        state.settings.allChannelsBlend = e.target.value;
        // If value is not empty, update all channel blend modes
        if (e.target.value) {
            state.settings.red.blend = e.target.value;
            state.settings.green.blend = e.target.value;
            state.settings.blue.blend = e.target.value;
            elements.redBlend.value = e.target.value;
            elements.greenBlend.value = e.target.value;
            elements.blueBlend.value = e.target.value;
        }
        render();
    });

    // Red channel
    elements.redX.addEventListener('input', (e) => {
        state.settings.red.x = parseInt(e.target.value);
        updateValueDisplay('red-x', 'px');
        render();
    });

    elements.redY.addEventListener('input', (e) => {
        state.settings.red.y = parseInt(e.target.value);
        updateValueDisplay('red-y', 'px');
        render();
    });

    elements.redOpacity.addEventListener('input', (e) => {
        state.settings.red.opacity = parseInt(e.target.value);
        updateValueDisplay('red-opacity', '%');
        render();
    });

    elements.redBlend.addEventListener('change', (e) => {
        state.settings.red.blend = e.target.value;
        render();
    });

    elements.redScale.addEventListener('input', (e) => {
        state.settings.red.scale = parseInt(e.target.value);
        updateValueDisplay('red-scale', '%');
        render();
    });

    elements.redRotation.addEventListener('input', (e) => {
        state.settings.red.rotation = parseInt(e.target.value);
        updateValueDisplay('red-rotation', '°');
        render();
    });

    // Green channel
    elements.greenX.addEventListener('input', (e) => {
        state.settings.green.x = parseInt(e.target.value);
        updateValueDisplay('green-x', 'px');
        render();
    });

    elements.greenY.addEventListener('input', (e) => {
        state.settings.green.y = parseInt(e.target.value);
        updateValueDisplay('green-y', 'px');
        render();
    });

    elements.greenOpacity.addEventListener('input', (e) => {
        state.settings.green.opacity = parseInt(e.target.value);
        updateValueDisplay('green-opacity', '%');
        render();
    });

    elements.greenBlend.addEventListener('change', (e) => {
        state.settings.green.blend = e.target.value;
        render();
    });

    elements.greenScale.addEventListener('input', (e) => {
        state.settings.green.scale = parseInt(e.target.value);
        updateValueDisplay('green-scale', '%');
        render();
    });

    elements.greenRotation.addEventListener('input', (e) => {
        state.settings.green.rotation = parseInt(e.target.value);
        updateValueDisplay('green-rotation', '°');
        render();
    });

    // Blue channel
    elements.blueX.addEventListener('input', (e) => {
        state.settings.blue.x = parseInt(e.target.value);
        updateValueDisplay('blue-x', 'px');
        render();
    });

    elements.blueY.addEventListener('input', (e) => {
        state.settings.blue.y = parseInt(e.target.value);
        updateValueDisplay('blue-y', 'px');
        render();
    });

    elements.blueOpacity.addEventListener('input', (e) => {
        state.settings.blue.opacity = parseInt(e.target.value);
        updateValueDisplay('blue-opacity', '%');
        render();
    });

    elements.blueBlend.addEventListener('change', (e) => {
        state.settings.blue.blend = e.target.value;
        render();
    });

    elements.blueScale.addEventListener('input', (e) => {
        state.settings.blue.scale = parseInt(e.target.value);
        updateValueDisplay('blue-scale', '%');
        render();
    });

    elements.blueRotation.addEventListener('input', (e) => {
        state.settings.blue.rotation = parseInt(e.target.value);
        updateValueDisplay('blue-rotation', '°');
        render();
    });

    // Background
    elements.bgColor.addEventListener('input', (e) => {
        state.settings.bgColor = e.target.value;
        document.getElementById('bg-color-value').textContent = e.target.value;
        render();
    });

    elements.bgTransparent.addEventListener('change', (e) => {
        state.settings.bgTransparent = e.target.checked;
        render();
    });

    // Advanced
    elements.globalBlend.addEventListener('change', (e) => {
        state.settings.globalBlend = e.target.value;
        elements.previewCanvas.style.mixBlendMode = e.target.value;
    });

    elements.layerOrder.addEventListener('change', (e) => {
        state.settings.layerOrder = e.target.value;
        render();
    });

    elements.showBase.addEventListener('change', (e) => {
        state.settings.showBase = e.target.checked;
        render();
    });

    elements.baseOpacity.addEventListener('input', (e) => {
        state.settings.baseOpacity = parseInt(e.target.value);
        updateValueDisplay('base-opacity', '%');
        render();
    });

    // Presets
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
        });
    });

    elements.resetBtn.addEventListener('click', resetToDefault);

    // Section collapsing
    elements.sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('collapsed');
        });
    });

    // Export
    elements.exportPng.addEventListener('click', exportAsPng);
    elements.exportSvg.addEventListener('click', exportAsSvg);

    // Mouse wheel support for all range inputs
    initWheelControls();
}

/**
 * Initialize mouse wheel controls for all range inputs
 * Scrolling while hovering over a slider adjusts its value
 */
function initWheelControls() {
    const rangeInputs = document.querySelectorAll('input[type="range"]');

    rangeInputs.forEach(input => {
        input.addEventListener('wheel', (e) => {
            e.preventDefault();

            const min = parseFloat(input.min) || 0;
            const max = parseFloat(input.max) || 100;
            const step = parseFloat(input.step) || 1;
            const currentValue = parseFloat(input.value);

            // Determine scroll direction and calculate step size
            // Use larger steps for bigger ranges
            const range = max - min;
            const scrollStep = e.shiftKey ? step * 10 : (range > 100 ? step * 2 : step);

            // Scroll up = increase, scroll down = decrease
            const delta = e.deltaY < 0 ? scrollStep : -scrollStep;
            const newValue = Math.max(min, Math.min(max, currentValue + delta));

            if (newValue !== currentValue) {
                input.value = newValue;
                // Trigger input event to update state and render
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, { passive: false });
    });
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    syncUIWithState();
    render();
});
