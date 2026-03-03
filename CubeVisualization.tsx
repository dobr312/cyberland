import { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import LandModel from './LandModel';

interface CubeVisualizationProps {
  biome?: string;
}

const BIOME_MODEL_MAP: Record<string, string> = {
  FOREST_VALLEY: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/FOREST_VALLEY_KTX2.glb',
  ISLAND_ARCHIPELAGO: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/ISLAND_ARCHIPELAGO.glb',
  SNOW_PEAK: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/SNOW_PEAK.glb',
  DESERT_DUNE: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/DESERT_DUNE.glb',
  VOLCANIC_CRAG: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/VOLCANIC_CRAG.glb',
  MYTHIC_VOID: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/MYTHIC_VOID.glb',
  MYTHIC_AETHER: 'https://raw.githubusercontent.com/dobr312/cyberland/main/public/models/MYTHIC_AETHER.glb',
};

// ── Integrated Composite Shader: ACES + Sharpening + Glints ──
const COMPOSITE_SHADER_FRAGMENT = `
  uniform sampler2D baseTexture;
  uniform sampler2D bloomTexture;
  uniform vec2 resolution;
  varying vec2 vUv;

  float luminance(vec3 v) { return dot(v, vec3(0.2126, 0.7152, 0.0722)); }

  vec3 toneMapACES(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    float sharpness = 0.15;
    // CRITICAL: NaN protection against (0,0) resolution
    vec2 texel = 1.0 / max(resolution, vec2(1.0));

    vec3 center = texture2D(baseTexture, vUv).rgb;
    vec3 left   = texture2D(baseTexture, vUv - vec2(texel.x, 0.0)).rgb;
    vec3 right  = texture2D(baseTexture, vUv + vec2(texel.x, 0.0)).rgb;
    vec3 up     = texture2D(baseTexture, vUv - vec2(0.0, texel.y)).rgb;
    vec3 down   = texture2D(baseTexture, vUv + vec2(0.0, texel.y)).rgb;

    vec3 baseRGB = center + sharpness * (4.0 * center - left - right - up - down);
    vec3 bloomRGB = texture2D(bloomTexture, vUv).rgb;

    float glintThreshold = 2.5;
    float glintStrength = 3.0;
    float highlight = max(0.0, luminance(baseRGB) - glintThreshold) * glintStrength;
    vec3 finalBloom = bloomRGB + (baseRGB * highlight);

    vec3 color = baseRGB + finalBloom;
    vec3 mapped = toneMapACES(color);
    gl_FragColor = vec4(mapped, 1.0);
  }
`;

const COMPOSITE_SHADER_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Camera-linked directional key light
function KeyLightSync() {
  const keyLight = useRef<THREE.DirectionalLight>(null);

  useFrame(({ camera }) => {
    if (keyLight.current) {
      keyLight.current.position.set(
        camera.position.x + 10,
        camera.position.y + 15,
        camera.position.z + 10
      );
    }
  });

  return (
    <directionalLight
      ref={keyLight}
      name="KeyLight"
      intensity={Math.PI * 0.8}
      color="#ffffff"
    />
  );
}

// Full FBM Shader background — Layer 0, renderOrder -1000
const BackgroundSphere = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform vec2 resolution;

    #define NUM_OCTAVES 6

    float random(vec2 pos) {
        return fract(sin(dot(pos.xy, vec2(13.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 pos) {
        vec2 i = floor(pos);
        vec2 f = fract(pos);
        float a = random(i + vec2(0.0, 0.0));
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 pos) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < NUM_OCTAVES; i++) {
            float dir = mod(float(i), 2.0) > 0.5 ? 1.0 : -1.0;
            v += a * noise(pos - 0.05 * dir * time * 0.2);
            pos = rot * pos * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // CRITICAL: NaN-safe resolution normalization
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(max(resolution.x, 1.0), max(resolution.y, 1.0));

        vec3 c1 = vec3(0.2, 0.4, 0.9);
        vec3 c2 = vec3(1.0, 0.1, 0.6);
        vec3 c3 = vec3(0.3, 0.0, 0.5);
        vec3 c4 = vec3(0.0, 0.0, 0.02);

        float time2 = time * 0.2;
        vec2 q = vec2(fbm(p + 0.0 * time2), fbm(p + vec2(1.0)));
        vec2 r = vec2(fbm(p + q + vec2(1.7, 1.2) + 0.15 * time2), fbm(p + q + vec2(8.3, 2.8) + 0.126 * time2));
        float f = fbm(p + r);

        vec3 color = mix(c1, c2, clamp(f * 1.2, 0.0, 1.0));
        color = mix(color, c3, clamp(length(q) * 1.1, 0.0, 1.0));

        float blackMask = smoothstep(0.2, 0.8, length(r.x) * 0.7);
        color = mix(color, c4, blackMask);

        color = (f * f * f * 1.5 + 0.5 * f) * color;

        gl_FragColor = vec4(pow(color, vec3(2.0)) * 5.0, 1.0);
    }
  `;

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) }
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
      const canvas = state.gl.domElement;
      materialRef.current.uniforms.resolution.value.set(canvas.width, canvas.height);
    }
  });

  return (
    <mesh
      frustumCulled={false}
      renderOrder={-1000}
      layers={new THREE.Layers()}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
};

// Assign BackgroundSphere mesh to layer 0 explicitly via ref
const BackgroundSphereWithLayer = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform vec2 resolution;

    #define NUM_OCTAVES 6

    float random(vec2 pos) {
        return fract(sin(dot(pos.xy, vec2(13.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 pos) {
        vec2 i = floor(pos);
        vec2 f = fract(pos);
        float a = random(i + vec2(0.0, 0.0));
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 pos) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < NUM_OCTAVES; i++) {
            float dir = mod(float(i), 2.0) > 0.5 ? 1.0 : -1.0;
            v += a * noise(pos - 0.05 * dir * time * 0.2);
            pos = rot * pos * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // CRITICAL: NaN-safe resolution normalization
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(max(resolution.x, 1.0), max(resolution.y, 1.0));

        vec3 c1 = vec3(0.2, 0.4, 0.9);
        vec3 c2 = vec3(1.0, 0.1, 0.6);
        vec3 c3 = vec3(0.3, 0.0, 0.5);
        vec3 c4 = vec3(0.0, 0.0, 0.02);

        float time2 = time * 0.2;
        vec2 q = vec2(fbm(p + 0.0 * time2), fbm(p + vec2(1.0)));
        vec2 r = vec2(fbm(p + q + vec2(1.7, 1.2) + 0.15 * time2), fbm(p + q + vec2(8.3, 2.8) + 0.126 * time2));
        float f = fbm(p + r);

        vec3 color = mix(c1, c2, clamp(f * 1.2, 0.0, 1.0));
        color = mix(color, c3, clamp(length(q) * 1.1, 0.0, 1.0));

        float blackMask = smoothstep(0.2, 0.8, length(r.x) * 0.7);
        color = mix(color, c4, blackMask);

        color = (f * f * f * 1.5 + 0.5 * f) * color;

        gl_FragColor = vec4(pow(color, vec3(2.0)) * 5.0, 1.0);
    }
  `;

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) }
  }), []);

  useEffect(() => {
    if (meshRef.current) {
      // Assign strictly to layer 0 only — not visible during bloom (layer 1) pass
      meshRef.current.layers.set(0);
    }
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
      const canvas = state.gl.domElement;
      materialRef.current.uniforms.resolution.value.set(canvas.width, canvas.height);
    }
  });

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={-1000}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
};

function SceneSetup() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x05010a, 0.0015);
  }, [scene]);

  return null;
}

/**
 * Integrated Render Pipeline:
 * 1. bloomComposer renders ONLY Layer 1 (emissive meshes) → off-screen target
 * 2. finalComposer renders full scene (Layer 0 + 1) + ACES + Sharpening + Glints composite
 *
 * NO HueSaturationPass. CompositePass is the final pass.
 */
function SelectiveBloomEffect() {
  const { gl, scene, camera, size, viewport } = useThree();

  const bloomComposerRef = useRef<EffectComposer | null>(null);
  const finalComposerRef = useRef<EffectComposer | null>(null);
  const compositePassRef = useRef<ShaderPass | null>(null);
  // Initialize bloomTexture to prevent startup crashes
  const bloomTextureRef = useRef<THREE.Texture>(new THREE.Texture());

  useEffect(() => {
    // ── Global renderer config ──
    gl.toneMapping = THREE.NoToneMapping;
    gl.autoClear = false;
    gl.setClearColor(0x000000, 1.0);
    gl.setClearAlpha(1.0);
    // DO NOT change gl.outputColorSpace — leave at default SRGBColorSpace

    // ── Bloom Composer (Layer 1 only, renders to off-screen target) ──
    const bloomComposer = new EffectComposer(gl);
    bloomComposer.renderToScreen = false; // REQUIRED: must NOT render to screen
    bloomComposerRef.current = bloomComposer;

    const bloomRenderPass = new RenderPass(scene, camera);
    bloomComposer.addPass(bloomRenderPass);

    // Bloom settings: intensity=0.8, radius=0.65, threshold=0.1
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.8,   // intensity
      0.65,  // radius
      0.1    // luminanceThreshold
    );
    if ('luminanceSmoothing' in bloomPass) {
      (bloomPass as any).luminanceSmoothing = 0.1;
    }
    bloomComposer.addPass(bloomPass);

    // Initialize bloomTexture ref from the composer's render target
    bloomTextureRef.current = bloomComposer.readBuffer.texture;

    // ── Final Composer (full scene + ACES + Sharpening + Glints) ──
    const finalComposer = new EffectComposer(gl);
    finalComposer.renderToScreen = true; // REQUIRED: renders to screen
    finalComposerRef.current = finalComposer;

    const finalRenderPass = new RenderPass(scene, camera);
    finalComposer.addPass(finalRenderPass);

    // Composite pass: ACES + Sharpening + Glints + Bloom merge
    const compositePass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomTextureRef.current },
          resolution: { value: new THREE.Vector2(size.width, size.height) },
        },
        vertexShader: COMPOSITE_SHADER_VERTEX,
        fragmentShader: COMPOSITE_SHADER_FRAGMENT,
        defines: {},
      }),
      'baseTexture'
    );
    compositePass.needsSwap = true;
    compositePassRef.current = compositePass;

    // CompositePass MUST be the final pass in finalComposer — NO HueSaturationPass after this
    finalComposer.addPass(compositePass);

    return () => {
      bloomComposerRef.current?.dispose();
      bloomComposerRef.current = null;
      finalComposerRef.current?.dispose();
      finalComposerRef.current = null;
      compositePassRef.current = null;
    };
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle resize
  useEffect(() => {
    if (bloomComposerRef.current) {
      bloomComposerRef.current.setSize(size.width, size.height);
    }
    if (finalComposerRef.current) {
      finalComposerRef.current.setSize(size.width, size.height);
    }
  }, [size]);

  useFrame(({ gl: renderer }) => {
    if (!bloomComposerRef.current || !finalComposerRef.current) return;

    const sz = size;

    // Guard: do not render when canvas has zero dimensions
    if (sz.width <= 0 || sz.height <= 0) return;

    // Manual clear of all buffers
    renderer.clear(true, true, true);

    // STEP 1: Bloom pass — render only Layer 1 (emissive meshes)
    camera.layers.set(1);
    bloomComposerRef.current.render();

    // STEP 2: Final pass — render Layer 0 + Layer 1 (full scene)
    camera.layers.set(0);
    camera.layers.enable(1);

    // Update composite pass uniforms
    if (compositePassRef.current) {
      const mat = compositePassRef.current.material as THREE.ShaderMaterial;
      // Update resolution in pixel units accounting for DPR
      mat.uniforms.resolution.value.set(
        sz.width * viewport.dpr,
        sz.height * viewport.dpr
      );
      // Use readBuffer.texture for stability
      mat.uniforms.bloomTexture.value = bloomComposerRef.current.readBuffer.texture;
    }

    finalComposerRef.current.render();
  }, 1);

  return null;
}

export default function CubeVisualization({ biome }: CubeVisualizationProps) {
  const modelUrl = useMemo(() => {
    if (!biome) return null;
    const url = BIOME_MODEL_MAP[biome];
    return url || null;
  }, [biome]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!modelUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-cyan-400">
        3D model unavailable
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full group">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          ...(({ dithering: true } as any))
        }}
        onCreated={({ gl }) => {
          // REQ-1: NoToneMapping, autoClear=false, black clear color
          gl.toneMapping = THREE.NoToneMapping;
          gl.autoClear = false;
          gl.setClearColor(0x000000, 1.0);
          gl.setClearAlpha(1.0);
          // DO NOT change gl.outputColorSpace — leave at default SRGBColorSpace
          // NO toneMappingExposure assignment
        }}
      >
        {/* REQ-7: Opaque black background during Suspense loading — no transparent flash */}
        <Suspense fallback={<color attach="background" args={["#000000"]} />}>
          {/* Scene background and fog */}
          <SceneSetup />

          {/* REQ-6: BackgroundSphere on layer 0, renderOrder -1000, NaN-safe shader */}
          <BackgroundSphereWithLayer />

          <LandModel modelUrl={modelUrl} biome={biome} />

          {/* Artist Workshop HDRI */}
          <Environment
            files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/artist_workshop_1k.hdr"
            environmentIntensity={1.0}
            blur={0}
          />

          {/* Hemisphere Light */}
          <hemisphereLight
            intensity={0.3}
            color="#f7f7f7"
            groundColor="#3a3a3a"
          />

          {/* Camera-linked Directional Key Light */}
          <KeyLightSync />

          {/* Sunlight Directional Light */}
          <directionalLight
            name="SunLight"
            position={[-10, 20, -15]}
            intensity={Math.PI * 0.4}
            color="#ffe4b5"
          />

          <OrbitControls makeDefault />

          {/* REQ-2..5: Integrated Bloom + ACES + Sharpening + Glints pipeline */}
          <SelectiveBloomEffect />
        </Suspense>
      </Canvas>

      {/* Glassmorphism fullscreen toggle button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-50 opacity-0 group-hover:opacity-100 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl text-white transition-all hover:bg-black/60 active:scale-95"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        )}
      </button>
    </div>
  );
}
