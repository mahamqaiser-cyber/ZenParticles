
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { Landmark } from '../types';

export const HandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setHandData, showDebug } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let drawingUtils: DrawingUtils | null = null;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
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

        // Start Camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              frameRate: { ideal: 30 }
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
          videoRef.current.addEventListener('loadeddata', () => {
             setLoading(false);
             predictWebcam();
          });
        }
        
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           if (ctx) drawingUtils = new DrawingUtils(ctx);
        }

      } catch (e) {
        console.error("Error starting hand tracking:", e);
        setLoading(false);
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current || !canvasRef.current) return;
      
      // Ensure dimensions match
      if (videoRef.current.videoWidth !== canvasRef.current.width) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
      }

      const startTimeMs = performance.now();
      if (videoRef.current.currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
          const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
             ctx.save();
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             
             // Draw user feedback
             if (result.landmarks) {
                for (const landmarks of result.landmarks) {
                  // Manually draw connections if DrawingUtils fails or for custom style
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
               // Determine handedness if available, otherwise guess by index
               // Note: MediaPipe "Left" means the hand on the left in the image (which is user's right hand if not mirrored)
               // But since we mirror the video visually, we want to align logic.
               const handedness = result.handedness[index]?.[0]?.categoryName; // "Left" or "Right"
               
               const wrist = landmarks[0];
               const thumbTip = landmarks[4];
               const indexTip = landmarks[8];
               const middleTip = landmarks[12];
               const middleMcp = landmarks[9]; // Middle finger knuckle

               // 1. ROBUST OPENNESS CALCULATION
               const distWristToKnuckle = distance(wrist, middleMcp);
               const distWristToTip = distance(wrist, middleTip);
               
               const ratio = distWristToTip / (distWristToKnuckle || 0.1); // avoid div 0
               const openVal = clamp((ratio - 1.0) / 0.8, 0, 1);

               // 2. PINCH CALCULATION
               const distPinch = distance(thumbTip, indexTip);
               const normPinch = distPinch / (distWristToKnuckle || 0.1);
               // If normPinch is small (< 0.2), it's a pinch (1.0). If large (> 0.5), it's open (0.0)
               // Invert logic: Small distance = High Pinch
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

    setup();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(t => t.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [setHandData]);

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

      // Connect points (simplified hand skeleton indices)
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
      <div className="relative rounded-lg overflow-hidden border-2 border-white/20 bg-black/50 shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-48 h-36 object-cover"
            style={{ transform: 'scaleX(-1)' }} 
          />
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scaleX(-1)' }}
          />
          {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-white text-xs font-mono animate-pulse">Init Vision...</div>
             </div>
          )}
      </div>
      <div className="text-[10px] text-white/50 text-center mt-1 font-mono">DEBUG VIEW</div>
    </div>
  );
};
