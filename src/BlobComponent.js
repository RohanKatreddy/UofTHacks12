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
        this.edgeSoftness = options.edgeSoftness || 30;
        this.pulseSpeed = options.pulseSpeed || 0.02;
        this.pulseStrength = options.pulseStrength || 15;
        this.offset = options.offset || { x: 0, y: 0 };
        this.timeOffset = options.timeOffset || 0;
        this.shape = options.shape || 'round';
        this.movementRadius = options.movementRadius || 0;
        this.movementSpeed = options.movementSpeed || 0.01;
    }

    update() {
        this.time += this.pulseSpeed;
        // Update position in circular motion
        if (this.movementRadius > 0) {
            this.offset.x = Math.cos(this.time * this.movementSpeed) * this.movementRadius;
            this.offset.y = Math.sin(this.time * this.movementSpeed) * this.movementRadius;
        }
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.center.x + this.offset.x, 
            this.center.y + this.offset.y, 
            0,
            this.center.x + this.offset.x, 
            this.center.y + this.offset.y, 
            this.radius * 1.5
        );

        const rgbaColor = this.color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)[1];
        const r = parseInt(rgbaColor.substring(0, 2), 16);
        const g = parseInt(rgbaColor.substring(2, 4), 16);
        const b = parseInt(rgbaColor.substring(4, 6), 16);

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.2)`);
        gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.1)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();

        const breathingEffect = Math.sin(this.time + this.timeOffset) * this.pulseStrength;

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

            const x = this.center.x + this.offset.x + shape.x * (this.radius + totalVariation);
            const y = this.center.y + this.offset.y + shape.y * (this.radius + totalVariation);

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
    const blobsRef = useRef([]);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Create multiple overlapping blobs with different colors, shapes and slight offsets
        const subBlobs = [
            {
                color: blobConfig.color || '#FF0000',
                offset: { x: 0, y: 0 },
                timeOffset: 0,
                shape: 'round',
                movementRadius: 20,
                movementSpeed: 0.5
            },
            {
                color: '#4287f5',
                offset: { x: -20, y: 20 },
                timeOffset: Math.PI / 3,
                shape: 'oval',
                movementRadius: 30,
                movementSpeed: 0.7
            },
            {
                color: '#42f5a7',
                offset: { x: 20, y: -20 },
                timeOffset: Math.PI / 1.5,
                shape: 'wavy',
                movementRadius: 25,
                movementSpeed: 0.3
            }
        ];

        blobsRef.current = subBlobs.map(subBlob => new Blob({
            center: { x: width/2, y: height/2 },
            radius: 50,
            noiseScale: 0.005,
            noiseStrength: 10,
            edgeNoiseStrength: 5,
            edgeSoftness: 30,
            pulseSpeed: 0.02,
            pulseStrength: 15,
            ...blobConfig,
            color: subBlob.color,
            offset: subBlob.offset,
            timeOffset: subBlob.timeOffset,
            shape: subBlob.shape,
            movementRadius: subBlob.movementRadius,
            movementSpeed: subBlob.movementSpeed
        }));

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            blobsRef.current.forEach(blob => {
                blob.update();
                blob.draw(ctx);
            });
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

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
