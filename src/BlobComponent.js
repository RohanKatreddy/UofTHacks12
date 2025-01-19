import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

class Blob {
    constructor(options = {}) {
        // Center point of the blob in canvas coordinates
        this.center = options.center || { x: 0, y: 0 };
        // Base radius of the blob in pixels before any effects are applied
        this.radius = options.radius || 100;
        // Array of colors used to create the gradient effect
        this.colors = options.colors || ['#000000', '#000000', '#000000'];
        // Internal time counter used for animation
        this.time = 0;
        // Controls the scale/frequency of the noise pattern
        this.noiseScale = options.noiseScale || 0.005;
        
        // Amount of distortion applied to the overall blob shape
        this.noiseStrength = options.noiseStrength || 20;
        
        // Additional noise applied specifically to edges
        this.edgeNoiseStrength = options.edgeNoiseStrength || 5;
        
        // Controls how smooth/blurry the blob edges appear
        this.edgeSoftness = 20;
        
        // Speed of the pulsing/breathing animation
        this.pulseSpeed = options.pulseSpeed || 0.02;
        
        // Intensity of the pulsing/breathing effect
        this.pulseStrength = options.pulseStrength || 15;
        
        // Base shape of the blob ('round', 'oval', 'wavy', etc)
        this.shape = options.shape || 'round';
        
        // Array of x,y offset pairs used to create organic movement
        this.noiseOffsets = options.noiseOffsets;

        // Color movement offsets
        this.colorOffsets = [0, Math.PI * 2/3, Math.PI * 4/3];

        // Controls the overall fluidity of the blob's movement and distortion
        // determined by danceability
        this.fluidity = options.fluidity || 1.0;
    }

    update() {
        // Time increment scaled by fluidity
        this.time += this.pulseSpeed * this.fluidity;
        
        // Update noise offsets - movement speed affected by fluidity
        this.noiseOffsets = this.noiseOffsets.map(offset => ({
            x: offset.x + (0.01 * this.fluidity),
            y: offset.y + (0.01 * this.fluidity)
        }));

        // Update color movement - also affected by fluidity
        this.colorOffsets = this.colorOffsets.map(offset => 
            (offset + (0.02 * this.fluidity)) % (Math.PI * 2)
        );

        // Define maximum and minimum radius with greater contrast
        const maxRadius = 150; // Increased maximum size
        const minRadius = 10; // Decreased minimum size

        // Add rhythmic pulsing effect to the radius
        const baseRadius = (maxRadius + minRadius) / 2;
        const amplitude = (maxRadius - minRadius) / 2;
        const frequency = 0.5; // Adjust frequency for rhythm variation
        const pulseEffect = Math.sin(this.time * frequency) * amplitude;
        this.radius = baseRadius + pulseEffect;

        // Map radius to a value between 0 and 100
        const mappedSize = Math.min(Math.max((this.radius - minRadius) / (maxRadius - minRadius) * 100, 0), 100);

        // Send mapped size to Python script
        socket.emit('sizeData', mappedSize);

        console.log('Sending size data:', mappedSize);
    }

    draw(ctx) {
        ctx.beginPath();

        // Create three separate gradients that will move independently
        const gradients = this.colorOffsets.map((offset, i) => {
            const xOffset = Math.cos(offset) * this.radius * 0.5;
            const yOffset = Math.sin(offset) * this.radius * 0.5;
            
            const gradient = ctx.createRadialGradient(
                this.center.x + xOffset,
                this.center.y + yOffset,
                0,
                this.center.x + xOffset,
                this.center.y + yOffset,
                this.radius * 1.5
            );

            const color = this.colors[i];
            const rgbaColor = color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)[1];
            const r = parseInt(rgbaColor.substring(0, 2), 16);
            const g = parseInt(rgbaColor.substring(2, 4), 16);
            const b = parseInt(rgbaColor.substring(4, 6), 16);

            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            return gradient;
        });

        const breathingEffect = Math.sin(this.time) * this.pulseStrength;

        // Simplified base shapes as starting points
        const shapes = {
            round: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
            oval: (angle) => ({ x: Math.cos(angle) * 1.2, y: Math.sin(angle) * 0.8 }),
            wavy: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
            squish: (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) }),
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

        // Create organic movement using noise - noise effects scaled by fluidity
        const points = [];
        const numPoints = 36;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const shape = getShape(angle);
            
            const noiseX = Math.sin(this.noiseOffsets[i].x) * this.noiseStrength * this.fluidity;
            const noiseY = Math.cos(this.noiseOffsets[i].y) * this.noiseStrength * this.fluidity;
            
            const timeOffset = Math.sin(this.time * 2 + angle * 3) * this.edgeNoiseStrength * this.fluidity;
            const randomOffset = (Math.sin(angle * 4 + this.time) + Math.cos(angle * 7 + this.time)) * this.noiseStrength * this.fluidity;
            const breathingOffset = breathingEffect * (1 + Math.sin(angle * 3) * 0.4);
            
            const totalOffsetX = noiseX + timeOffset + randomOffset + breathingOffset;
            const totalOffsetY = noiseY + timeOffset + randomOffset + breathingOffset;

            const x = this.center.x + shape.x * (this.radius + totalOffsetX);
            const y = this.center.y + shape.y * (this.radius + totalOffsetY);
            
            points.push({ x, y });
        }

        // Draw base shape multiple times with different gradients
        gradients.forEach(gradient => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 0; i < points.length; i++) {
                const curr = points[i];
                const next = points[(i + 1) % points.length];
                
                const controlX = (next.x + curr.x) / 2;
                const controlY = (next.y + curr.y) / 2;
                
                ctx.quadraticCurveTo(curr.x, curr.y, controlX, controlY);
            }

            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.filter = `blur(${this.edgeSoftness * 0.2}px)`;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fill();
        });

        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
    }
}

export const colorPresets = {
    red: '#FF1744',     // Passion, excitement, energy
    orange: '#FF9100',  // Warmth, enthusiasm, creativity 
    yellow: '#FFD600',  // Joy, optimism, spontaneity
    green: '#00E676',   // Balance, peace, harmony
    blue: '#2979FF',    // Calm, melancholy, sadness
    purple: '#AA00FF',  // Mystery, introspection, creativity
    white: '#FFFFFF',   // Clarity, simplicity, purity
    gray: '#757575',    // Ambiguity, neutrality, mystery
    black: '#000000',   // Elegance, seriousness, intensity
    pink: '#F50057',    // Playfulness, love, gentleness
    turquoise: '#00E5FF', // Freshness, curiosity, vibrance
    gold: '#FFD700',    // Luxury, sophistication, triumph
    rainbow: '#FF1744'   // Ecstasy, joy, overwhelming beauty
};

// Initialize WebSocket connection
const socket = io('http://localhost:5000');

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
    const [pulseValue, setPulseValue] = useState(0);

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

            // Map pulse strength to 0-100
            const mappedPulse = Math.min(Math.max((blobRef.current.pulseStrength / 20) * 100, 0), 100);
            setPulseValue(mappedPulse);

            // Send pulse value to Python script
            socket.emit('pulseData', mappedPulse);

            console.log('Sending pulse data:', mappedPulse);

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
