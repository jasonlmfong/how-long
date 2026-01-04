import * as THREE from "three";

export default function createGlobe({ colorMap, bumpMap }) {
    const globeGroup = new THREE.Group();

    const detail = 150;
    const pointsGeo = new THREE.IcosahedronGeometry(1, detail);

    const vertexShader = `
      uniform float size;
      uniform sampler2D elevTexture;

      varying vec2 vUv;
      varying float vVisible;

      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        float elv = texture2D(elevTexture, vUv).r;
        vec3 vNormal = normalMatrix * normal;
        vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
        mvPosition.z += 0.05 * elv;
        gl_PointSize = size;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = `
      uniform sampler2D colorTexture;

      varying vec2 vUv;
      varying float vVisible;

      void main() {
        if (floor(vVisible + 0.1) == 0.0) discard;
        vec3 color = texture2D(colorTexture, vUv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const uniforms = {
        size: { type: "f", value: 4.0 },
        colorTexture: { type: "t", value: colorMap },
        elevTexture: { type: "t", value: bumpMap },
    };
    const pointsMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
    });

    const earth = new THREE.Mesh(pointsGeo, pointsMat);
    globeGroup.add(earth);

    globeGroup.rotation.y += 3; // arbitrary, just instantiate the globe to look at the americas

    return globeGroup;
}
