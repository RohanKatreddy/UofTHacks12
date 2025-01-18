import React, { useEffect, useRef } from 'react';

class Blob {
    constructor(options = {}) {
        this.center = options.center || { x: 0, y: 0 };
        this.radius = options.radius || 100;
        this.color = options.color || '#000000';
        this.time = 0;
        this.noiseScale = options.noiseScale || 0.005;
        this.noiseStrength = options.noiseStrength || 20;
        this.edgeNoiseStrength = options.edgeNoiseStrength || 5;
        this.edgeSoftness = options.edgeSoftness || 30; // Controls blur/softness of edges
    }

    update() {
        // Removed time increment to stop spinning
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.center.x, this.center.y, 0,
            this.center.x, this.center.y, this.radius * 1.5
        );

        // Create gradient from center color to transparent
        const rgbaColor = this.color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)[1];
        const r = parseInt(rgbaColor.substring(0, 2), 16);
        const g = parseInt(rgbaColor.substring(2, 4), 16);
        const b = parseInt(rgbaColor.substring(4, 6), 16);

        // Static gradient stops without time-based animation
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.1)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();

        // Draw static blob shape without time-based noise
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const noise1 = Math.sin(angle * 4) * this.noiseStrength;
            const noise2 = Math.cos(angle * 6) * this.noiseStrength;
            const edgeNoise = Math.sin(angle * 8) * this.edgeNoiseStrength;
            const softNoise = Math.sin(angle * 3) * this.edgeSoftness;
            const totalNoise = noise1 + noise2 + edgeNoise + softNoise;

            const x = this.center.x + Math.cos(angle) * (this.radius + totalNoise);
            const y = this.center.y + Math.sin(angle) * (this.radius + totalNoise);

            if (angle === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.filter = `blur(${this.edgeSoftness * 0.2}px)`;
        ctx.fill();
        ctx.filter = 'none';
    }
}

const BlobComponent = ({ width = 400, height = 400, blobConfig = {} }) => {
    const canvasRef = useRef(null);
    const blobRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Create blob instance with merged default and custom config
        blobRef.current = new Blob({
            center: { x: width/2, y: height/2 },
            radius: 50,
            color: '#FF0000',
            noiseScale: 0.005,
            noiseStrength: 15,
            edgeNoiseStrength: 8,
            edgeSoftness: 30,
            ...blobConfig
        });

        // Draw once without animation
        ctx.clearRect(0, 0, width, height);
        blobRef.current.draw(ctx);

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [width, height, blobConfig]);

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
