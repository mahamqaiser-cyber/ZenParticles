
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { Landmark } from '../types';

export const HandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setHandData, showDebug, isCameraActive } = useStore();
  
  // State to track if the AI model is ready
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  // Ref to hold the landmarker instance so it persists across renders without re-initialization
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  // 1. Initialize MediaPipe Model (Runs once)
  useEffect(() => {
    const setupModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        landmarkerRef.current = landmarker;
        setIsModelLoaded(true);
      } catch (e) {
        console.error("Error loading hand tracking model:", e);
      }
    };

    setupModel();

    return () => {
      landmarkerRef.current?.close();
    };
  }, []);

  // 2. Manage Camera Stream & Prediction Loop
  useEffect(() => {
    if (!isCameraActive || !isModelLoaded) {
      // If camera is stopped, ensure we clear the hand data so the app knows hands are gone
      setHandData({
        leftHandOpenness: 0,
        rightHandOpenness: 0,
        leftHandPinch: 0,
        rightHandPinch: 0,
        leftHandLandmarks: [],
        rightHandLandmarks: [],
        isPresent: false
      });
      return;
    }

    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              frameRate: { ideal: 30 }
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            predictWebcam();
          };
        }
      } catch (e) {
        console.error("Error starting camera:", e);
      }
    };

    const predictWebcam = () => {
      // Check if active, model exists, and video is playing
      if (!isCameraActive || !landmarkerRef.current || !videoRef.current || !canvasRef.current) return;
      
      // Ensure dimensions match
      if (videoRef.current.videoWidth > 0 && videoRef.current.videoWidth !== canvasRef.current.width) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
      }

      const startTimeMs = performance.now();
      if (videoRef.current.currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
          const result = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
             ctx.save();
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             
             if (result.landmarks) {
                for (const landmarks of result.landmarks) {
                  drawSimpleSkeleton(ctx, landmarks);
                }
             }
             ctx.restore();
          }

          let leftOpen = 0;
          let rightOpen = 0;
          let leftPinch = 0;
          let rightPinch = 0;
          let leftLms: Landmark[] = [];
          let rightLms: Landmark[] = [];
          let isPresent = false;

          if (result.landmarks && result.landmarks.length > 0) {
            isPresent = true;
            
            result.landmarks.forEach((landmarks, index) => {
               const handedness = result.handedness[index]?.[0]?.categoryName; 
               
               const wrist = landmarks[0];
               const thumbTip = landmarks[4];
               const indexTip = landmarks[8];
               const middleTip = landmarks[12];
               const middleMcp = landmarks[9]; 

               const distWristToKnuckle = distance(wrist, middleMcp);
               const distWristToTip = distance(wrist, middleTip);
               
               const ratio = distWristToTip / (distWristToKnuckle || 0.1); 
               const openVal = clamp((ratio - 1.0) / 0.8, 0, 1);

               const distPinch = distance(thumbTip, indexTip);
               const normPinch = distPinch / (distWristToKnuckle || 0.1);
               const pinchVal = clamp(1 - (normPinch * 3), 0, 1);
               
               if (handedness === 'Right') {
                 rightOpen = openVal;
                 rightPinch = pinchVal;
                 rightLms = landmarks;
               } else {
                 leftOpen = openVal;
                 leftPinch = pinchVal;
                 leftLms = landmarks;
               }
            });
          }

          setHandData({
            leftHandOpenness: leftOpen,
            rightHandOpenness: rightOpen,
            leftHandPinch: leftPinch,
            rightHandPinch: rightPinch,
            leftHandLandmarks: leftLms,
            rightHandLandmarks: rightLms,
            isPresent
          });
      }
      
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraActive, isModelLoaded, setHandData]);

  // Helper math functions
  const distance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const clamp = (val: number, min: number, max: number) => {
     return Math.max(min, Math.min(val, max));
  };

  const drawSimpleSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff9d';
      ctx.fillStyle = '#ff0066';

      const connections = [
          [0,1], [1,2], [2,3], [3,4], // Thumb
          [0,5], [5,6], [6,7], [7,8], // Index
          [0,9], [9,10], [10,11], [11,12], // Middle
          [0,13], [13,14], [14,15], [15,16], // Ring
          [0,17], [17,18], [18,19], [19,20] // Pinky
      ];

      for (const [start, end] of connections) {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          ctx.beginPath();
          ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
          ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
          ctx.stroke();
      }

      for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
          ctx.fill();
      }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-opacity duration-300 ${showDebug ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative rounded-lg overflow-hidden border-2 border-white/20 bg-black/50 shadow-2xl w-48 h-36 flex items-center justify-center">
          {isCameraActive ? (
            <>
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} 
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ transform: 'scaleX(-1)' }}
              />
            </>
          ) : (
            <div className="text-white/50 text-xs font-mono">CAMERA OFF</div>
          )}
          
          {!isModelLoaded && isCameraActive && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-white text-xs font-mono animate-pulse">Loading AI...</div>
             </div>
          )}
      </div>
      <div className="text-[10px] text-white/50 text-center mt-1 font-mono">DEBUG VIEW</div>
    </div>
  );
};
