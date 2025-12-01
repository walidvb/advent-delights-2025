'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface SpinningDiskProps {
  src: string;
  alt: string;
  className?: string;
}

const BASE_ROTATION_SPEED = 0.9;
const ACCELERATION = 0.01;
const SCRATCH_SOUNDS = [
  '/scratches/high-pitch-looping-vinyl-scratches-442505.mp3',
  '/scratches/scratch-87658.mp3',
  '/scratches/vinyl-scratch-3-395154.mp3',
];

export function SpinningDisk({
  src,
  alt,
  className = '',
}: SpinningDiskProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(BASE_ROTATION_SPEED);

  const dragStartAngle = useRef(0);
  const rotationAtDragStart = useRef(0);
  const lastAngle = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const scratchAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMoving = useRef(false);

  useEffect(() => {
    const audio = new Audio(
      SCRATCH_SOUNDS[Math.floor(Math.random() * SCRATCH_SOUNDS.length)]
    );
    audio.loop = true;
    audio.preload = 'auto';
    scratchAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const getAngleFromCenter = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setCurrentSpeed(0);
      const angle = getAngleFromCenter(e.clientX, e.clientY);
      dragStartAngle.current = angle;
      lastAngle.current = angle;
      rotationAtDragStart.current = rotation;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getAngleFromCenter, rotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      const angleDelta = currentAngle - dragStartAngle.current;
      const newRotation = rotationAtDragStart.current + angleDelta;

      const isCurrentlyMoving = Math.abs(currentAngle - lastAngle.current) > 0.5;
      lastAngle.current = currentAngle;

      if (isCurrentlyMoving && !isMoving.current) {
        isMoving.current = true;
        scratchAudioRef.current?.play();
      } else if (!isCurrentlyMoving && isMoving.current) {
        isMoving.current = false;
        scratchAudioRef.current?.pause();
      }

      setRotation(newRotation);
    },
    [isDragging, getAngleFromCenter]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    isMoving.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (scratchAudioRef.current) {
      scratchAudioRef.current.pause();
      scratchAudioRef.current.currentTime = 0;
      scratchAudioRef.current.src =
        SCRATCH_SOUNDS[Math.floor(Math.random() * SCRATCH_SOUNDS.length)];
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const animate = () => {
      setCurrentSpeed((prev) => {
        const newSpeed = Math.min(prev + ACCELERATION, BASE_ROTATION_SPEED);
        return newSpeed;
      });
      setRotation((prev) => prev + currentSpeed);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isDragging, currentSpeed]);

  return (
    <div
      ref={containerRef}
      className={`select-none touch-none aspect-square w-full relative ${className}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="rounded-full pointer-events-none object-contain"
        style={{ transform: `rotate(${rotation}deg)` }}
        draggable={false}
      />
    </div>
  );
}
