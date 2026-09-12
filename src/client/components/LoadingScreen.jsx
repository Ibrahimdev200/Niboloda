import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ShieldCheck, Gauge } from 'lucide-react';

const slogans = [
  "Drivers Set the Price. Passengers Choose the Ride.",
  "0% Platform Commission. Keep 100% of Every Fare.",
  "Nigeria's Direct Driver-Passenger Fare Marketplace."
];

export const LoadingScreen = ({ message = "Loading NIBOLODA...", fullScreen = true, onFinished }) => {
  const [progress, setProgress] = useState(10);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [speedKmh, setSpeedKmh] = useState(45);

  const canvasRef = useRef(null);

  // High-Speed Smoke & Wind Particle Video Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const maxParticles = 45;

    // Particle class for exhaust smoke and speed streaks
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        // Emitter origin is at rear bottom of the car (approx 25% from left, 68% from top)
        this.x = canvas.width * 0.32 + (Math.random() * 20 - 10);
        this.y = canvas.height * 0.62 + (Math.random() * 12 - 6);
        this.vx = -(Math.random() * 6 + 4); // Fast horizontal drift to the left
        this.vy = -(Math.random() * 1.5 - 0.5); // Slight upward turbulence
        this.radius = Math.random() * 6 + 4;
        this.maxRadius = this.radius * (Math.random() * 3 + 2.5);
        this.alpha = Math.random() * 0.45 + 0.35;
        this.decay = Math.random() * 0.015 + 0.01;
        this.isSpeedLine = Math.random() > 0.6;
        this.length = this.isSpeedLine ? Math.random() * 40 + 20 : 0;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.radius += 0.4;
        this.alpha -= this.decay;

        if (this.alpha <= 0 || this.x < -60) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);

        if (this.isSpeedLine) {
          // Neon green speed streak line
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x - this.length, this.y);
          ctx.stroke();
        } else {
          // Smoke puff circle gradient
          const grad = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
          );
          grad.addColorStop(0, 'rgba(240, 253, 244, 0.45)');
          grad.addColorStop(0.5, 'rgba(110, 231, 183, 0.2)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      const p = new Particle();
      p.x = Math.random() * canvas.width * 0.4; // scatter initially
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Progress Bar & Speedometer Animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 12) + 8;
        if (next >= 100) {
          clearInterval(timer);
          setSpeedKmh(120);
          if (onFinished) setTimeout(onFinished, 400);
          return 100;
        }
        setSpeedKmh(Math.min(120, Math.floor(45 + (next / 100) * 75)));
        return next;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [onFinished]);

  // Slogan Typing & Rotating Animation
  useEffect(() => {
    let timeout;
    const currentSlogan = slogans[sloganIndex];

    if (isTyping) {
      if (typedText.length < currentSlogan.length) {
        timeout = setTimeout(() => {
          setTypedText(currentSlogan.slice(0, typedText.length + 1));
        }, 35);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 2200);
      }
    } else {
      if (typedText.length > 0) {
        timeout = setTimeout(() => {
          setTypedText(currentSlogan.slice(0, typedText.length - 1));
        }, 18);
      } else {
        setSloganIndex((prev) => (prev + 1) % slogans.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [typedText, isTyping, sloganIndex]);

  // SVG Circular Dashoffset Calculation (Radius = 145)
  const radius = 145;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 selection:bg-emerald-500 overflow-hidden"
    : "w-full py-12 flex flex-col items-center justify-center p-6 text-slate-100";

  return (
    <div className={containerClasses}>
      {/* Dynamic Background Radial Lights */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[34rem] w-[34rem] rounded-full bg-amber-500/15 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full space-y-6">
        
        {/* VIDEO ANIMATION STAGE: Circular Track + Engine Vibration + Smoke Particle Canvas + Headlights */}
        <div className="relative flex items-center justify-center w-80 h-80 sm:w-96 sm:h-96">
          
          {/* Canvas for dynamic 60fps exhaust smoke & speed particle rendering */}
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* SVG Animated Circular Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 z-0 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]" viewBox="0 0 340 340">
            {/* Background Outer Ring Track */}
            <circle
              cx="170"
              cy="170"
              r={radius}
              className="stroke-emerald-950/60"
              strokeWidth="14"
              fill="transparent"
            />
            {/* Active Filling Progress Ring */}
            <circle
              cx="170"
              cy="170"
              r={radius}
              className="stroke-emerald-400 transition-all duration-300 ease-out"
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Rotating Glowing Beacon on the Ring Head */}
          <div 
            className="absolute inset-0 pointer-events-none z-10 transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${(progress / 100) * 360 - 90}deg)` }}
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_18px_#10b981] animate-ping" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-300 border-2 border-white shadow-[0_0_12px_#34d399]" />
          </div>

          {/* Forward Headlight Projection Beam */}
          <div className="absolute right-0 top-1/2 -translate-y-4 w-36 h-20 bg-gradient-to-r from-amber-300/35 via-emerald-300/15 to-transparent blur-md transform origin-left rotate-3 animate-headlight pointer-events-none z-0" />

          {/* Transparent Car Graphic with Engine Vibration Keyframe Physics */}
          <div className="relative w-72 sm:w-80 h-auto flex items-center justify-center p-2 z-20 animate-car-engine">
            <img
              src="/loading-car.png"
              alt="NIBOLODA Speeding Vehicle"
              className="w-full h-auto object-contain drop-shadow-[0_20px_35px_rgba(16,185,129,0.4)]"
            />
          </div>

          {/* Asphalt Road Lane with High-Speed Moving Dashes */}
          <div className="absolute bottom-12 inset-x-8 h-1 bg-gradient-to-r from-transparent via-emerald-800/80 to-transparent overflow-hidden pointer-events-none z-10">
            <div className="w-[200%] h-full flex items-center justify-around animate-road">
              <span className="w-8 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#10b981]" />
              <span className="w-8 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#10b981]" />
              <span className="w-8 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#10b981]" />
              <span className="w-8 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#10b981]" />
              <span className="w-8 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#10b981]" />
            </div>
          </div>

          {/* Live Telemetry Speedometer & Progress Badge */}
          <div className="absolute bottom-2 right-2 sm:right-6 bg-emerald-950/95 border border-emerald-500/60 text-amber-400 font-mono font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 z-30">
            <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px]">
              <Gauge className="w-3.5 h-3.5 text-amber-400 animate-spin" /> {speedKmh} KM/H
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-white">{progress}%</span>
          </div>
        </div>

        {/* Brand Title & 0% Commission Badge */}
        <div className="space-y-1.5">
          <h1 className="font-outfit text-3xl sm:text-4xl font-extrabold tracking-wider text-white">
            NIBO<span className="text-emerald-400">LODA</span>
          </h1>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>0% COMMISSION PLATFORM</span>
          </div>
        </div>

        {/* Typing Format Animated Slogan Box */}
        <div className="h-12 flex items-center justify-center px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 w-full max-w-md backdrop-blur-md shadow-xl">
          <p className="font-sans text-xs sm:text-sm font-semibold text-emerald-200 tracking-wide">
            {typedText}
            <span className="inline-block w-1.5 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
          </p>
        </div>

        {/* Loading Message Status */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{message}</span>
        </div>

      </div>
    </div>
  );
};
