import React, { useEffect, useRef } from 'react';

class Blob {
    constructor(options = {}) {
        // Center point of the blob in canvas coordinates
        this.center = options.center || { x: 0, y: 0 };
        // Base radius of the blob in pixels before any effects are applied
        this.radius = options.radius || 100;
        // Array of colors used to create the gradient effect
        this.colors = options.colors || ['#000000'];
        // Internal time counter used for animation
        this.time = 0;
        // Controls the scale/frequency of the noise pattern
        this.noiseScale = options.noiseScale || 0.005;
        
        // Amount of distortion applied to the overall blob shape
        this.noiseStrength = options.noiseStrength || 20;
        
        // Additional noise applied specifically to edges
        this.edgeNoiseStrength = options.edgeNoiseStrength || 5;
        
        // Controls how smooth/blurry the blob edges appear
        // this.edgeSoftness = options.edgeSoftness || 30;
        this.edgeSoftness = 10;
        
        // Speed of the pulsing/breathing animation
        this.pulseSpeed = options.pulseSpeed || 0.02;
        
        // Intensity of the pulsing/breathing effect
        this.pulseStrength = options.pulseStrength || 15;
        
        // Base shape of the blob ('round', 'oval', 'wavy', etc)
        this.shape = options.shape || 'round';
        
        // Array of x,y offset pairs used to create organic movement
        this.noiseOffsets = options.noiseOffsets;
    }

    update() {
        this.time += this.pulseSpeed;
        // Update noise offsets
        this.noiseOffsets = this.noiseOffsets.map(offset => ({
            x: offset.x + 0.01,
            y: offset.y + 0.01
        }));
    }

    draw(ctx) {
        ctx.beginPath();

        // Create gradient with multiple color stops
        const gradient = ctx.createRadialGradient(
            this.center.x,
            this.center.y,
            0,
            this.center.x,
            this.center.y,
            this.radius * 1.5
        );

        // Add each color as a gradient stop
        this.colors.forEach((color, index) => {
            const rgbaColor = color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)[1];
            const r = parseInt(rgbaColor.substring(0, 2), 16);
            const g = parseInt(rgbaColor.substring(2, 4), 16);
            const b = parseInt(rgbaColor.substring(4, 6), 16);
            
            const position = index / (this.colors.length - 1);
            gradient.addColorStop(position, `rgba(${r}, ${g}, ${b}, 0.4)`);
        });

        // Add final transparent stop
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        const breathingEffect = Math.sin(this.time) * this.pulseStrength;

        // Simplified base shapes as starting points
        const shapes = {
            round: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
            oval: (angle) => ({ x: Math.cos(angle) * 1.2, y: Math.sin(angle) * 0.8 }),
            wavy: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
            squish: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
            // New shape variations
            star: (angle) => {
                const spikes = 1.5 + Math.cos(angle * 5) * 0.5;
                return { x: Math.cos(angle) * spikes, y: Math.sin(angle) * spikes };
            },
            flower: (angle) => {
                const petals = 1 + Math.sin(angle * 6) * 0.3;
                return { x: Math.cos(angle) * petals, y: Math.sin(angle) * petals };
            },
            bubble: (angle) => {
                const wobble = 1 + Math.sin(angle * 3) * 0.2;
                return { x: Math.cos(angle) * wobble, y: Math.sin(angle) * wobble };
            },
            cloud: (angle) => {
                const puff = 1 + Math.sin(angle * 4) * 0.15 + Math.cos(angle * 6) * 0.15;
                return { x: Math.cos(angle) * puff, y: Math.sin(angle) * puff };
            },
            droplet: (angle) => {
                const squeeze = 1 + Math.sin(angle) * 0.3;
                return { x: Math.cos(angle) * squeeze, y: Math.sin(angle) * (1 + Math.cos(angle) * 0.5) };
            }
        };

        const getShape = shapes[this.shape] || shapes.round;

        // Create organic movement using noise
        const points = [];
        const numPoints = 36;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const shape = getShape(angle);
            
            // Use noise offsets for organic movement
            const noiseX = Math.sin(this.noiseOffsets[i].x) * this.noiseStrength;
            const noiseY = Math.cos(this.noiseOffsets[i].y) * this.noiseStrength;
            
            // Add various organic distortions
            const timeOffset = Math.sin(this.time * 2 + angle * 3) * this.edgeNoiseStrength;
            const randomOffset = (Math.sin(angle * 4 + this.time) + Math.cos(angle * 7 + this.time)) * this.noiseStrength;
            const breathingOffset = breathingEffect * (1 + Math.sin(angle * 3) * 0.4);
            
            const totalOffsetX = noiseX + timeOffset + randomOffset + breathingOffset;
            const totalOffsetY = noiseY + timeOffset + randomOffset + breathingOffset;

            const x = this.center.x + shape.x * (this.radius + totalOffsetX);
            const y = this.center.y + shape.y * (this.radius + totalOffsetY);
            
            points.push({ x, y });
        }

        // Draw using curve interpolation for smoother edges
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length; i++) {
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            const nextnext = points[(i + 2) % points.length];
            
            // Calculate control points for curves
            const controlX = (next.x + curr.x) / 2;
            const controlY = (next.y + curr.y) / 2;
            
            ctx.quadraticCurveTo(curr.x, curr.y, controlX, controlY);
        }

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.filter = `blur(${this.edgeSoftness * 0.2}px)`;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fill();
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
    }
}

const colorPresets = {
    red: ['#FF0000', '#FF2222', '#FF8888'],     // Passion, excitement, energy
    orange: ['#FF6200', '#FF8C00', '#FFBB66'],  // Warmth, enthusiasm, creativity 
    yellow: ['#FFB300', '#FFD700', '#FFF176'],  // Joy, optimism, spontaneity
    green: ['#2E7D32', '#4CAF50', '#A5D6A7'],   // Balance, peace, harmony
    blue: ['#0D47A1', '#1E88E5', '#90CAF9'],    // Calm, melancholy, sadness
    purple: ['#4A148C', '#9C27B0', '#CE93D8'],  // Mystery, introspection, creativity
    white: ['#F5F5F5', '#FAFAFA', '#FFFFFF'],   // Clarity, simplicity, purity
    gray: ['#424242', '#9E9E9E', '#EEEEEE'],    // Ambiguity, neutrality, mystery
    black: ['#000000', '#212121', '#757575'],    // Elegance, seriousness, intensity
    pink: ['#C2185B', '#FF4081', '#FF80AB'],    // Playfulness, love, gentleness
    turquoise: ['#006064', '#00BCD4', '#80DEEA'], // Freshness, curiosity, vibrance
    gold: ['#B8860B', '#DAA520', '#FFD700'],    // Luxury, sophistication, triumph
    rainbow: ['#D50000', '#FF1744', '#FF616F']   // Ecstasy, joy, overwhelming beauty
};

const BlobComponent = ({ 
    width = 400, 
    height = 400, 
    blobConfig = {},
    colorPreset = 'spotify',
    shape = 'round'
}) => {
    const canvasRef = useRef(null);
    const blobRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const colors = blobConfig.colors || colorPresets[colorPreset] || colorPresets.spotify;

        blobRef.current = new Blob({
            center: { x: width/2, y: height/2 },
            radius: 50,
            colors,
            noiseScale: 0.005,
            noiseStrength: 10,
            edgeNoiseStrength: 5,
            edgeSoftness: 30,
            pulseSpeed: 0.02,
            pulseStrength: 15,
            shape,
            ...blobConfig
        });

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            blobRef.current.update();
            blobRef.current.draw(ctx);
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [width, height, blobConfig, colorPreset, shape]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ display: 'block' }}
        />
    );
};

export default BlobComponent;
