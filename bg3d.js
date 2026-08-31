/**
 * bg3d.js — Ceylon Chai 3D Scroll-Reactive Background
 * Uses Three.js to render a parallax 3D scene behind the page content.
 * Scroll moves the camera forward through a field of tea-themed geometry.
 */
(function () {
    'use strict';

    // ── Wait for Three.js to load ──────────────────────────────────────────
    function init() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas || typeof THREE === 'undefined') return;

        // ── Renderer ──────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x1a0f0a, 1);

        // ── Scene ─────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x1a0f0a, 0.018);

        // ── Camera ────────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
        camera.position.set(0, 0, 5);

        // ── Color Palette (Ceylon Chai) ───────────────────────────────────
        const palette = [
            0xd4a574, // tea-gold
            0xe88742, // tea-orange
            0xff6b35, // neon-orange
            0x4a2c1c, // tea-brown
            0xf5e6d3, // tea-cream
            0x8b4513, // saddle-brown warm
            0xc68642, // amber
        ];

        function randomColor() {
            return palette[Math.floor(Math.random() * palette.length)];
        }

        // ── Helper: create glowing material ──────────────────────────────
        function makeGlowMaterial(color) {
            return new THREE.MeshStandardMaterial({
                color,
                metalness: 0.6,
                roughness: 0.3,
                emissive: color,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.55 + Math.random() * 0.35,
                wireframe: Math.random() > 0.55,
            });
        }

        // ── Floating Objects ──────────────────────────────────────────────
        const objects = [];
        const COUNT = 180;

        const geometries = [
            () => new THREE.TorusGeometry(0.4 + Math.random() * 0.5, 0.08 + Math.random() * 0.1, 12, 48),
            () => new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.45, 0),
            () => new THREE.TetrahedronGeometry(0.3 + Math.random() * 0.5, 0),
            () => new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4, 0),
            () => new THREE.TorusKnotGeometry(0.25 + Math.random() * 0.2, 0.06, 80, 12),
            () => new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 10, 10),
            () => new THREE.BoxGeometry(0.35, 0.35, 0.35),
        ];

        for (let i = 0; i < COUNT; i++) {
            const geoFn = geometries[Math.floor(Math.random() * geometries.length)];
            const geo = geoFn();
            const mat = makeGlowMaterial(randomColor());
            const mesh = new THREE.Mesh(geo, mat);

            // Spread objects in a long tunnel (z: 0 to -120)
            mesh.position.set(
                (Math.random() - 0.5) * 22,
                (Math.random() - 0.5) * 18,
                -(Math.random() * 120)
            );
            mesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            // Random spin speeds
            mesh.userData.spinX = (Math.random() - 0.5) * 0.008;
            mesh.userData.spinY = (Math.random() - 0.5) * 0.012;
            mesh.userData.spinZ = (Math.random() - 0.5) * 0.006;
            mesh.userData.floatAmp = 0.04 + Math.random() * 0.1;
            mesh.userData.floatFreq = 0.4 + Math.random() * 0.8;
            mesh.userData.floatOffset = Math.random() * Math.PI * 2;
            mesh.userData.baseY = mesh.position.y;

            scene.add(mesh);
            objects.push(mesh);
        }

        // ── Star-field particles ──────────────────────────────────────────
        const starGeo = new THREE.BufferGeometry();
        const STARS = 2000;
        const starPos = new Float32Array(STARS * 3);
        for (let i = 0; i < STARS; i++) {
            starPos[i * 3]     = (Math.random() - 0.5) * 200;
            starPos[i * 3 + 1] = (Math.random() - 0.5) * 150;
            starPos[i * 3 + 2] = -(Math.random() * 140);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xd4a574,
            size: 0.08,
            transparent: true,
            opacity: 0.55,
            sizeAttenuation: true,
        });
        scene.add(new THREE.Points(starGeo, starMat));

        // ── Ambient + directional lights ──────────────────────────────────
        const ambientLight = new THREE.AmbientLight(0xd4a574, 0.4);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xff6b35, 1.2);
        dirLight1.position.set(5, 10, 5);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xd4a574, 0.7);
        dirLight2.position.set(-5, -5, -10);
        scene.add(dirLight2);

        const pointLight = new THREE.PointLight(0xe88742, 2, 30);
        pointLight.position.set(0, 0, 4);
        scene.add(pointLight);

        // ── Scroll tracking ───────────────────────────────────────────────
        let scrollY = 0;
        let targetCameraZ = 5;
        let currentCameraZ = 5;

        const TOTAL_DEPTH = 100; // total camera travel distance (z-axis)

        function onScroll() {
            const docH = document.documentElement.scrollHeight - window.innerHeight;
            const pct  = docH > 0 ? window.scrollY / docH : 0;
            scrollY     = window.scrollY;
            // Camera moves from z=5 down to z= 5 - TOTAL_DEPTH
            targetCameraZ = 5 - pct * TOTAL_DEPTH;
        }
        window.addEventListener('scroll', onScroll, { passive: true });

        // ── Resize handling ───────────────────────────────────────────────
        function onResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        window.addEventListener('resize', onResize);

        // ── Mouse-tilt for subtle parallax ────────────────────────────────
        let mouseX = 0, mouseY = 0;
        function onMouseMove(e) {
            mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        }
        window.addEventListener('mousemove', onMouseMove, { passive: true });

        // ── Animation loop ────────────────────────────────────────────────
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);

            const t = clock.getElapsedTime();

            // Smooth camera Z (eased scroll)
            currentCameraZ += (targetCameraZ - currentCameraZ) * 0.06;
            camera.position.z = currentCameraZ;

            // Subtle mouse tilt
            camera.position.x += (mouseX * 1.8 - camera.position.x) * 0.04;
            camera.position.y += (-mouseY * 1.2 - camera.position.y) * 0.04;
            camera.lookAt(camera.position.x * 0.1, camera.position.y * 0.1, currentCameraZ - 10);

            // Animate each object
            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                obj.rotation.x += obj.userData.spinX;
                obj.rotation.y += obj.userData.spinY;
                obj.rotation.z += obj.userData.spinZ;

                // Gentle float
                obj.position.y =
                    obj.userData.baseY +
                    Math.sin(t * obj.userData.floatFreq + obj.userData.floatOffset) *
                    obj.userData.floatAmp;
            }

            // Pulse point light
            pointLight.intensity = 1.5 + Math.sin(t * 1.8) * 0.8;
            pointLight.position.z = currentCameraZ + 4;

            renderer.render(scene, camera);
        }

        animate();
    }

    // ── Bootstrap after Three.js is ready ────────────────────────────────
    if (typeof THREE !== 'undefined') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
