import * as THREE from "three";

export default function getStars({ numStars = 500, sprite } = {}) {
    function randomSpherePoint() {
        const radius = Math.random() * 25 + 25;

        const u = Math.random();
        const v = Math.random();

        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        let x = radius * Math.sin(phi) * Math.cos(theta);
        let y = radius * Math.sin(phi) * Math.sin(theta);
        let z = radius * Math.cos(phi);

        return new THREE.Vector3(x, y, z);
    }
    const verts = [];
    const colors = [];
    let col;
    for (let i = 0; i < numStars; i += 1) {
        const p = randomSpherePoint();
        col = new THREE.Color().setHSL(Math.random(), 0.2, Math.random());
        verts.push(p.x, p.y, p.z);
        colors.push(col.r, col.g, col.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        map: sprite,
    });
    const points = new THREE.Points(geo, mat);
    return points;
}
