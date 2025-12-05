import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import GUI from 'lil-gui';
// @ts-ignore
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

const Scene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Configuration Object for GUI ---
    const params = {
        particleCount: 3500,
        rotationSpeed: 0.1,
        twinkleSpeed: 3.0,
        globalSize: 1.0,
        
        treeColor: '#00ff41',
        ornamentColor: '#ff0033',
        lightColor: '#ffd700',
        
        bloomStrength: 2.0,
        bloomRadius: 0.5,
        bloomThreshold: 0.7,
        
        snowSpeed: 1.0,
        snowDensity: 1000,

        // Interaction
        enableGestureControl: false,
        gestureStatus: 'OFFLINE' // For display only
    };

    // --- 1. Setup Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020502, 0.025); 

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: "high-performance",
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);

    // --- 2. Tree Particle System (Max Buffer Strategy) ---
    const MAX_PARTICLES = 15000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const particleTypes = new Uint8Array(MAX_PARTICLES); // 0: Tree, 1: Ornament, 2: Light

    // Helper to generate particle data
    const generateParticles = () => {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const h = Math.random() * 5; 
            const maxRadius = 2.5 * (1 - h / 5.5);
            const spinAngle = h * 4.0 + (i * 0.05); 
            const r = maxRadius * Math.sqrt(Math.random()); 

            const x = r * Math.cos(spinAngle);
            const z = r * Math.sin(spinAngle);
            const y = h - 2.5;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Determine Type
            const typeRand = Math.random();
            let type = 0; // Tree
            let sizeBase = 0.04;

            if (typeRand > 0.92) {
                type = 2; // Gold/Light
                sizeBase = 0.12;
            } else if (typeRand > 0.84) {
                type = 1; // Red/Ornament
                sizeBase = 0.08;
            }
            particleTypes[i] = type;

            // Size variation
            sizes[i] = sizeBase * (0.5 + Math.random());
        }
    };

    // Helper to color particles based on types and current params
    const updateParticleColors = () => {
        const colorTree = new THREE.Color(params.treeColor);
        const colorOrn = new THREE.Color(params.ornamentColor);
        const colorLight = new THREE.Color(params.lightColor);

        for(let i=0; i < MAX_PARTICLES; i++) {
            let c = colorTree;
            if (particleTypes[i] === 1) c = colorOrn;
            if (particleTypes[i] === 2) c = colorLight;

            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        geometry.attributes.color.needsUpdate = true;
    };

    generateParticles();
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Initial color set
    updateParticleColors();
    // Initial draw range
    geometry.setDrawRange(0, params.particleCount);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            uTwinkleSpeed: { value: params.twinkleSpeed },
            uSizeScale: { value: params.globalSize },
            pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png') }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float time;
            uniform float uTwinkleSpeed;
            uniform float uSizeScale;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // Twinkle effect
                float twinkle = 1.0 + sin(time * uTwinkleSpeed + position.y * 10.0 + position.x * 10.0) * 0.3;
                
                gl_PointSize = size * uSizeScale * (300.0 / -mvPosition.z) * twinkle;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
                gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
                if (gl_FragColor.a < 0.5) discard;
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    const treeSystem = new THREE.Points(geometry, material);
    scene.add(treeSystem);

    // --- 3. The Star (Top - 3D 5-Pointed Star) ---
    const createStarShape = (innerRadius: number, outerRadius: number, points: number) => {
        const shape = new THREE.Shape();
        for (let i = 0; i < points * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const a = (i / points) * Math.PI;
            // sin/cos swapped here to ensure point is upright at index 0
            const x = Math.sin(a) * r;
            const y = Math.cos(a) * r;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();
        return shape;
    };

    const starShape = createStarShape(0.12, 0.25, 5);
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 1
    });
    starGeo.center();

    const starMat = new THREE.MeshBasicMaterial({ color: params.lightColor });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.y = 2.6; 
    scene.add(starMesh);
    
    // Add Edges for Retro Look
    const edges = new THREE.EdgesGeometry(starGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const starEdges = new THREE.LineSegments(edges, lineMat);
    starMesh.add(starEdges);

    // Star Glow Halo
    const starGlowGeo = new THREE.OctahedronGeometry(0.5, 0);
    const starGlowMat = new THREE.MeshBasicMaterial({ 
        color: params.lightColor, 
        transparent: true, 
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const starGlow = new THREE.Mesh(starGlowGeo, starGlowMat);
    starMesh.add(starGlow);

    // --- 4. Snow System (Max Buffer) ---
    const MAX_SNOW = 3000;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(MAX_SNOW * 3);
    const snowVelocities: {x:number, y:number, z:number}[] = [];

    for(let i=0; i<MAX_SNOW; i++) {
        snowPos[i*3] = (Math.random() - 0.5) * 20;
        snowPos[i*3+1] = (Math.random() - 0.5) * 20;
        snowPos[i*3+2] = (Math.random() - 0.5) * 20;
        
        snowVelocities.push({
            y: -0.01 - Math.random() * 0.03, 
            x: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
        });
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const snowSystem = new THREE.Points(snowGeo, snowMat);
    snowSystem.geometry.setDrawRange(0, params.snowDensity);
    scene.add(snowSystem);


    // --- 5. Post-Processing ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloomStrength,
      params.bloomRadius,
      params.bloomThreshold
    );
    composer.addPass(bloomPass);
    
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // --- 6. GESTURE RECOGNITION SETUP ---
    let gestureRecognizer: any = null;
    let runningMode = "VIDEO";
    let lastVideoTime = -1;
    let gestureTargetSize = params.globalSize;
    let isGestureLoading = false;

    // Grab video element from DOM
    const videoElement = document.getElementById('webcam-preview') as HTMLVideoElement;
    videoRef.current = videoElement;

    const enableCam = async () => {
        if (!videoElement) return;
        
        if (!gestureRecognizer) {
            isGestureLoading = true;
            params.gestureStatus = "LOADING MODEL...";
            
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
                );
                gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
                params.gestureStatus = "MODEL READY";
                isGestureLoading = false;
            } catch (e) {
                console.error("MediaPipe Load Error:", e);
                params.gestureStatus = "ERROR LOADING";
                isGestureLoading = false;
                return;
            }
        }

        if (videoElement.srcObject) {
            // Already on
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            videoElement.style.display = 'block';
            videoElement.addEventListener("loadeddata", predictWebcam);
            params.gestureStatus = "ACTIVE: SHOW HAND";
        } catch (err) {
            console.error(err);
            params.gestureStatus = "CAMERA DENIED";
        }
    };

    const disableCam = () => {
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
        }
        params.gestureStatus = "OFFLINE";
    };

    const predictWebcam = async () => {
        if (!params.enableGestureControl || !videoElement || !gestureRecognizer) return;

        if (videoElement.currentTime !== lastVideoTime) {
            lastVideoTime = videoElement.currentTime;
            const results = gestureRecognizer.recognizeForVideo(videoElement, Date.now());

            if (results.gestures.length > 0) {
                const name = results.gestures[0][0].categoryName;
                const score = results.gestures[0][0].score;
                
                if (score > 0.5) {
                    params.gestureStatus = `DETECTED: ${name}`;
                    if (name === "Closed_Fist") {
                        gestureTargetSize = 0.0; // Shrink to nothing
                    } else if (name === "Open_Palm") {
                        gestureTargetSize = 5.0; // Explode
                    } else {
                        // Return to normal-ish if hand detected but neutral
                        gestureTargetSize = 1.0; 
                    }
                }
            } else {
                params.gestureStatus = "SCANNING...";
                gestureTargetSize = 1.0; // Default when no hand
            }
        }
        if (params.enableGestureControl) {
            requestAnimationFrame(predictWebcam);
        }
    };


    // --- 7. GUI SETUP ---
    const gui = new GUI({ title: 'RETRO CONTROLS' });
    
    // Position GUI
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    
    // Interaction Folder
    const folderInteraction = gui.addFolder('Interactive (Webcam)');
    folderInteraction.add(params, 'enableGestureControl')
        .name('Enable Hand Control')
        .onChange((v: boolean) => {
            if (v) enableCam();
            else disableCam();
        });
    folderInteraction.add(params, 'gestureStatus').name('Status').listen().disable();
    folderInteraction.open(); // Open by default to show the feature

    const folderVisuals = gui.addFolder('Visuals');
    folderVisuals.add(params, 'particleCount', 100, MAX_PARTICLES).name('Tree Density').onChange((v: number) => {
        geometry.setDrawRange(0, v);
    });
    folderVisuals.add(params, 'globalSize', 0.1, 5.0).name('Particle Size').listen().onChange((v: number) => {
        material.uniforms.uSizeScale.value = v;
        gestureTargetSize = v; // Sync manual override
    });
    folderVisuals.addColor(params, 'treeColor').name('Tree Color').onChange(updateParticleColors);
    folderVisuals.addColor(params, 'ornamentColor').name('Ornaments').onChange(updateParticleColors);
    folderVisuals.addColor(params, 'lightColor').name('Lights / Star').onChange((v: string) => {
        updateParticleColors();
        starMat.color.set(v);
        starGlowMat.color.set(v);
    });

    const folderMotion = gui.addFolder('Motion');
    folderMotion.add(params, 'rotationSpeed', 0.0, 1.0).name('Spin Speed');
    folderMotion.add(params, 'twinkleSpeed', 0.0, 10.0).name('Twinkle Hz').onChange((v: number) => {
        material.uniforms.uTwinkleSpeed.value = v;
    });
    folderMotion.add(params, 'snowSpeed', 0.0, 5.0).name('Snow Storm');
    folderMotion.add(params, 'snowDensity', 0, MAX_SNOW).name('Snow Amount').onChange((v:number) => {
        snowSystem.geometry.setDrawRange(0, v);
    });

    const folderBloom = gui.addFolder('Post-Process');
    folderBloom.add(params, 'bloomStrength', 0.0, 5.0).onChange((v: number) => bloomPass.strength = v);
    folderBloom.add(params, 'bloomRadius', 0.0, 1.5).onChange((v: number) => bloomPass.radius = v);
    folderBloom.add(params, 'bloomThreshold', 0.0, 1.0).onChange((v: number) => bloomPass.threshold = v);

    if (window.innerWidth < 768) {
        gui.close();
    }


    // --- 8. Interaction ---
    const mouse = new THREE.Vector2();
    const handleMouseMove = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 9. Animation Loop ---
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Handle Gesture Size Lerping
      if (params.enableGestureControl) {
          // Smooth interpolation
          material.uniforms.uSizeScale.value = THREE.MathUtils.lerp(
              material.uniforms.uSizeScale.value, 
              gestureTargetSize, 
              0.1
          );
          // Update GUI slider to reflect reality
          params.globalSize = material.uniforms.uSizeScale.value;
      }

      // Rotate Tree
      treeSystem.rotation.y += params.rotationSpeed * 0.05;
      
      // Update Uniforms
      material.uniforms.time.value = time;

      // Rotate Star
      starMesh.rotation.y = time * 1.5;
      // starMesh.rotation.z = Math.sin(time) * 0.2; // Keep it more upright for the star shape
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      starMesh.scale.set(pulse, pulse, pulse);

      // Animate Snow
      const snowPositions = snowSystem.geometry.attributes.position.array as Float32Array;
      const speedMult = params.snowSpeed;
      
      // We loop only up to MAX_SNOW to keep logic simple, though drawing is limited by DrawRange
      for(let i=0; i<MAX_SNOW; i++) {
          const ix = i * 3;
          snowPositions[ix] += snowVelocities[i].x * speedMult;
          snowPositions[ix+1] += snowVelocities[i].y * speedMult;
          snowPositions[ix+2] += snowVelocities[i].z * speedMult;

          // Reset if too low
          if(snowPositions[ix+1] < -10) {
              snowPositions[ix+1] = 10;
              snowPositions[ix] = (Math.random() - 0.5) * 20;
              snowPositions[ix+2] = (Math.random() - 0.5) * 20;
          }
      }
      snowSystem.geometry.attributes.position.needsUpdate = true;
      
      // Camera Drift based on mouse
      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 1 + 2 - camera.position.y) * 0.02;
      camera.lookAt(0, 0.5, 0);

      composer.render();
      requestAnimationFrame(animate);
    };

    animate();

    // --- 10. Resize ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      // Cleanup Webcam
      disableCam();

      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // Dispose Three.js
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Dispose GUI
      gui.destroy();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default Scene;