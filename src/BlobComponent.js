import React, { useEffect, useRef } from 'react';

class Blob {
    constructor(options = {}) {
        this.center = options.center || { x: 0, y: 0 };
        this.radius = options.radius || 100;
        this.colors = options.colors || ['#000000'];
        this.time = 0;
        this.noiseScale = options.noiseScale || 0.005;
        this.noiseStrength = options.noiseStrength || 20;
        this.edgeNoiseStrength = options.edgeNoiseStrength || 5;
        this.edgeSoftness = options.edgeSoftness || 30;
        this.pulseSpeed = options.pulseSpeed || 0.02;
        this.pulseStrength = options.pulseStrength || 15;
        this.shape = options.shape || 'round';
    }

    update() {
        this.time += this.pulseSpeed;
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

        const shapes = {
            round: (angle) => ({ 
                x: Math.cos(angle) * (1 + Math.sin(angle * 2) * 0.2),
                y: Math.sin(angle) * (1 + Math.cos(angle * 2) * 0.2)
            }),
            oval: (angle) => ({
                x: Math.cos(angle) * (1.2 + Math.sin(angle * 3) * 0.15),
                y: Math.sin(angle) * (0.8 + Math.cos(angle * 3) * 0.15)
            }),
            wavy: (angle) => {
                const wave = Math.sin(angle * 4) * 0.3;
                return {
                    x: Math.cos(angle) * (1 + wave),
                    y: Math.sin(angle) * (1 + wave)
                };
            },
            squish: (angle) => {
                const squeeze = Math.sin(angle * 2.5) * 0.4;
                return {
                    x: Math.cos(angle) * (1.2 - squeeze),
                    y: Math.sin(angle) * (1 + squeeze)
                };
            }
        };

        const getShape = shapes[this.shape] || shapes.round;

        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const edgeVariation = Math.sin(angle * 3) * this.noiseStrength;
            const breathingVariation = breathingEffect * (1 + Math.sin(angle * 2) * 0.3);
            const organicNoise = Math.sin(angle * 5 + this.time * 0.5) * this.edgeNoiseStrength;
            
            const totalVariation = edgeVariation + breathingVariation + organicNoise;
            const shape = getShape(angle);

            const x = this.center.x + shape.x * (this.radius + totalVariation);
            const y = this.center.y + shape.y * (this.radius + totalVariation);

            if (angle === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
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
    spotify: ['#1DB954', '#4287f5', '#42f5a7'],
    sunset: ['#FF4B1F', '#FF9068', '#FFC371'],
    ocean: ['#2E3192', '#1BFFFF', '#4287f5'],
    purple: ['#8E2DE2', '#4A00E0', '#6A35D4'],
    fire: ['#FF0000', '#FFA500', '#FFD700']
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
