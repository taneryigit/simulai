// components/AvatarViewer.jsx
'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';

function Avatar({ url, audioRef, isPlaying }) {
  const { scene } = useGLTF(url);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const animationRef = useRef();
  const headMeshRef = useRef();
  const teethMeshRef = useRef();
  const currentAudioElement = useRef(null);
  const isSetupComplete = useRef(false);
  const blinkTimeoutRef = useRef(null);
  const blinkAnimationRef = useRef(null);
  const [faceReady, setFaceReady] = useState(false);
  const defaultSmileIntensity = 0.35;

  const setMorphInfluence = (meshRef, target, value) => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetDictionary) {
      return;
    }
    const index = mesh.morphTargetDictionary[target];
    if (index !== undefined) {
      mesh.morphTargetInfluences[index] = value;
    }
  };

  const applyDefaultSmile = () => {
    setMorphInfluence(headMeshRef, 'mouthSmile', defaultSmileIntensity);
    setMorphInfluence(teethMeshRef, 'mouthSmile', defaultSmileIntensity);
  };

  useEffect(() => {
    // Find Wolf3D_Head and Wolf3D_Teeth meshes for morph target animation
    if (scene) {
      scene.traverse((child) => {
     
        
        if (child.name === 'Wolf3D_Head' && child.morphTargetDictionary) {
          headMeshRef.current = child;
   
        
        }
        
        if (child.name === 'Wolf3D_Teeth' && child.morphTargetDictionary) {
          teethMeshRef.current = child;
         
         
        }
      });
      if (headMeshRef.current) {
        applyDefaultSmile();
        setFaceReady(true);
      } else {
        setFaceReady(false);
      }
    
    }
  }, [scene]);

  useEffect(() => {
    if (!faceReady) {
      return undefined;
    }

    applyDefaultSmile();

    const performBlink = () => {
      const start = performance.now();
      const blinkDuration = 200;
      const closingDuration = blinkDuration * 0.45;

      const animateBlink = (now) => {
        const elapsed = now - start;
        let influence;

        if (elapsed < closingDuration) {
          influence = Math.min(elapsed / closingDuration, 1);
        } else if (elapsed < blinkDuration) {
          const openingElapsed = elapsed - closingDuration;
          const openingDuration = blinkDuration - closingDuration;
          influence = Math.max(1 - (openingElapsed / openingDuration), 0);
        } else {
          influence = 0;
        }

        setMorphInfluence(headMeshRef, 'eyeBlink_L', influence);
        setMorphInfluence(headMeshRef, 'eyeBlink_R', influence);

        if (elapsed < blinkDuration) {
          blinkAnimationRef.current = requestAnimationFrame(animateBlink);
        } else {
          setMorphInfluence(headMeshRef, 'eyeBlink_L', 0);
          setMorphInfluence(headMeshRef, 'eyeBlink_R', 0);
          const nextBlinkDelay = 2500 + Math.random() * 2500;
          blinkTimeoutRef.current = setTimeout(() => {
            blinkAnimationRef.current = requestAnimationFrame(performBlink);
          }, nextBlinkDelay);
        }
      };

      blinkAnimationRef.current = requestAnimationFrame(animateBlink);
    };

    const initialDelay = 1000 + Math.random() * 1500;
    blinkTimeoutRef.current = setTimeout(() => {
      blinkAnimationRef.current = requestAnimationFrame(performBlink);
    }, initialDelay);

    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
      if (blinkAnimationRef.current) {
        cancelAnimationFrame(blinkAnimationRef.current);
        blinkAnimationRef.current = null;
      }
      setMorphInfluence(headMeshRef, 'eyeBlink_L', 0);
      setMorphInfluence(headMeshRef, 'eyeBlink_R', 0);
    };
  }, [faceReady]);

  // Reset audio context when audio element changes
  useEffect(() => {
    if (audioRef?.current !== currentAudioElement.current) {
   
      
      // Clean up previous setup
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close();
        } catch (error) {
          console.error('Error closing previous audio context:', error);
        }
      }
      
      setAudioContext(null);
      setAnalyser(null);
      isSetupComplete.current = false;
      currentAudioElement.current = audioRef?.current;
    }
  }, [audioRef?.current]);

  // Setup audio analysis when playing starts
  useEffect(() => {
    if (!audioRef?.current || !isPlaying || isSetupComplete.current) {
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        const audio = audioRef.current;
       
        
        // Wait a bit for audio to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if audio is actually ready
        if (audio.readyState < 2) {
      
          audio.addEventListener('canplay', setupAudioAnalysis, { once: true });
          return;
        }

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if suspended
        if (ctx.state === 'suspended') {
          await ctx.resume();
         
        }
        
        let sourceNode;
        try {
          sourceNode = ctx.createMediaElementSource(audio);
        } catch (error) {
          if (error.name === 'InvalidStateError') {
          
            ctx.close();
            return;
          }
          throw error;
        }
        
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 512; // Higher resolution for better lip sync
        analyserNode.smoothingTimeConstant = 0.3; // More responsive
        
        sourceNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        
        setAudioContext(ctx);
        setAnalyser(analyserNode);
        isSetupComplete.current = true;
        
       
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        isSetupComplete.current = false;
      }
    };

    const timeoutId = setTimeout(setupAudioAnalysis, 200); // Small delay to ensure audio is ready

    return () => {
      clearTimeout(timeoutId);
    };
  }, [audioRef?.current, isPlaying]);

  // Animation loop for lip sync using morph targets
  useEffect(() => {
    if (!analyser || !isPlaying) {
      // Reset mouth when not playing
      if (headMeshRef.current && teethMeshRef.current) {
        // Reset mouth morph targets to neutral
        const headMesh = headMeshRef.current;
        const teethMesh = teethMeshRef.current;
        
        // Common mouth open morph targets
        const mouthTargets = ['mouthOpen', 'viseme_O', 'viseme_AA'];

        mouthTargets.forEach(target => {
          if (headMesh.morphTargetDictionary && headMesh.morphTargetDictionary[target] !== undefined) {
            headMesh.morphTargetInfluences[headMesh.morphTargetDictionary[target]] = 0;
          }
          if (teethMesh.morphTargetDictionary && teethMesh.morphTargetDictionary[target] !== undefined) {
            teethMesh.morphTargetInfluences[teethMesh.morphTargetDictionary[target]] = 0;
          }
        });

        applyDefaultSmile();
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
 

    const animate = () => {
      if (!isPlaying || !analyser) {
        return;
      }

      try {
        analyser.getByteFrequencyData(dataArray);
        
        // Focus on speech frequencies (roughly 300Hz - 3400Hz)
        const speechStart = Math.floor((300 / 22050) * dataArray.length);
        const speechEnd = Math.floor((3400 / 22050) * dataArray.length);
        const speechData = dataArray.slice(speechStart, speechEnd);
        
        // Calculate average volume from speech frequencies
        const avg = speechData.reduce((a, b) => a + b) / speechData.length;
        
        // Convert to morph target influence (0-1 range)
        const mouthInfluence = Math.min(avg / 80, 1); // More sensitive threshold
        
        // Apply animation to mouth using morph targets
        if (headMeshRef.current && teethMeshRef.current && avg > 5) {
          const headMesh = headMeshRef.current;
          const teethMesh = teethMeshRef.current;
          
          // Try different morph targets in order of preference
          const mouthTargets = ['mouthOpen', 'viseme_O', 'viseme_AA'];
          let applied = false;
          
          for (const target of mouthTargets) {
            if (headMesh.morphTargetDictionary && headMesh.morphTargetDictionary[target] !== undefined) {
              headMesh.morphTargetInfluences[headMesh.morphTargetDictionary[target]] = mouthInfluence;
              applied = true;
              
              // Also apply to teeth if available
              if (teethMesh.morphTargetDictionary && teethMesh.morphTargetDictionary[target] !== undefined) {
                teethMesh.morphTargetInfluences[teethMesh.morphTargetDictionary[target]] = mouthInfluence;
              }
              
              // Debug: Log when animation is happening
              if (avg > 10) {
              }
              break; // Use the first available target
            }
          }
          
          if (!applied) {
          }
          
        } else if (headMeshRef.current && teethMeshRef.current) {
          // Gradual return to neutral position
          const headMesh = headMeshRef.current;
          const teethMesh = teethMeshRef.current;
          const mouthTargets = ['mouthOpen', 'viseme_O', 'viseme_AA'];
          
          mouthTargets.forEach(target => {
            if (headMesh.morphTargetDictionary && headMesh.morphTargetDictionary[target] !== undefined) {
              const currentInfluence = headMesh.morphTargetInfluences[headMesh.morphTargetDictionary[target]];
              headMesh.morphTargetInfluences[headMesh.morphTargetDictionary[target]] = currentInfluence * 0.9; // Gradual decay
            }
            if (teethMesh.morphTargetDictionary && teethMesh.morphTargetDictionary[target] !== undefined) {
              const currentInfluence = teethMesh.morphTargetInfluences[teethMesh.morphTargetDictionary[target]];
              teethMesh.morphTargetInfluences[teethMesh.morphTargetDictionary[target]] = currentInfluence * 0.9;
            }
          });

          applyDefaultSmile();
        }
      } catch (error) {
        console.error('Error in lip sync animation loop:', error);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [analyser, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      isSetupComplete.current = false;
      
      // Reset morph targets
      if (headMeshRef.current) {
        const headMesh = headMeshRef.current;
        const mouthTargets = ['mouthOpen', 'viseme_O', 'viseme_AA'];
        mouthTargets.forEach(target => {
          if (headMesh.morphTargetDictionary && headMesh.morphTargetDictionary[target] !== undefined) {
            headMesh.morphTargetInfluences[headMesh.morphTargetDictionary[target]] = 0;
          }
        });
        applyDefaultSmile();
      }
      
      if (teethMeshRef.current) {
        const teethMesh = teethMeshRef.current;
        const mouthTargets = ['mouthOpen', 'viseme_O', 'viseme_AA'];
        mouthTargets.forEach(target => {
          if (teethMesh.morphTargetDictionary && teethMesh.morphTargetDictionary[target] !== undefined) {
            teethMesh.morphTargetInfluences[teethMesh.morphTargetDictionary[target]] = 0;
          }
        });
        applyDefaultSmile();
      }
    };
  }, []);

  // Fixed positioning - moved avatar down so head is visible, made much bigger
  return <primitive object={scene} scale={[7.15, 7.15, 7.15]} position={[0, -3.6, 0]} rotation={[0.1, 0, 0]} />;
}

export default function AvatarViewer({ modelUrl = "https://models.readyplayer.me/682ee654007f6100f05ccd93.glb", audioRef, isPlaying }) {
  return (
    <div className="w-full h-full">
      <Canvas
        style={{ height: '100%', width: '100%' }}
        camera={{ position: [0, 0.5, 3.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 2] } intensity={1.5} />
        <directionalLight position={[-2, 2, -1]} intensity={0.8} />
        <pointLight position={[0, 2, 2]} intensity={0.7} />
        
        <Avatar url={modelUrl} audioRef={audioRef} isPlaying={isPlaying} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          maxDistance={6}
          minDistance={2}
          target={[0, 0.5, 0]}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 8}
        />
      </Canvas>
    </div>
  );
}

// Preload the GLB model
useGLTF.preload("https://models.readyplayer.me/682ee654007f6100f05ccd93.glb");
