import * as THREE from "three";

export default function initMarkerUI(globeGroup) {
    let LON_OFFSET = 0.0;
    let LAT_OFFSET = 180.0; // the uv of the map image is not aligned with (0,0) in lon-lat

    const markers = [];
    let arcLine = null;

    function latLonToVector3(lat, lon, radius = 1.0) {
        const adjLat = -(lat + LAT_OFFSET); // negate to get the correct math
        const adjLon = lon + LON_OFFSET;
        const phi = (90 - adjLat) * (Math.PI / 180);
        const theta = (adjLon + 180) * (Math.PI / 180);
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        return new THREE.Vector3(x, y, z);
    }

    function placeMarker(lat, lon, color = 0xff4444) {
        const pos = latLonToVector3(lat, lon, 1 + 0.02);
        const m = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 10, 8),
            new THREE.MeshStandardMaterial({ color }),
        );
        m.position.copy(pos);
        globeGroup.add(m);
        markers.push(m);
        return m;
    }

    function clearMarkers() {
        while (markers.length) {
            const m = markers.pop();
            globeGroup.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        }
    }

    function clearArc() {
        if (arcLine) {
            globeGroup.remove(arcLine);
            if (arcLine.geometry) arcLine.geometry.dispose();
            if (arcLine.material) arcLine.material.dispose();
            arcLine = null;
        }
    }

    function drawGreatCircleArc(
        lat1,
        lon1,
        lat2,
        lon2,
        segments = 128,
        color = 0xffff00,
    ) {
        clearArc();
        const v1 = latLonToVector3(lat1, lon1, 1.0).normalize();
        const v2 = latLonToVector3(lat2, lon2, 1.0).normalize();
        const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1);
        const omega = Math.acos(dot);
        const sinOmega = Math.sin(omega);

        const positions = new Float32Array((segments + 1) * 3);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let vec;
            if (sinOmega < 1e-6) {
                vec = new THREE.Vector3().copy(v1).lerp(v2, t).normalize();
            } else {
                const a = Math.sin((1 - t) * omega) / sinOmega;
                const b = Math.sin(t * omega) / sinOmega;
                vec = new THREE.Vector3(
                    a * v1.x + b * v2.x,
                    a * v1.y + b * v2.y,
                    a * v1.z + b * v2.z,
                ).normalize();
            }
            vec.multiplyScalar(1.02);
            positions[3 * i] = vec.x;
            positions[3 * i + 1] = vec.y;
            positions[3 * i + 2] = vec.z;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const matLine = new THREE.LineBasicMaterial({ color });
        arcLine = new THREE.Line(geom, matLine);
        globeGroup.add(arcLine);
        return arcLine;
    }

    return {
        placeMarker,
        clearMarkers,
        drawGreatCircleArc,
        setOffsets: (lonOff, latOff) => {
            LON_OFFSET = lonOff;
            LAT_OFFSET = latOff;
        },
    };
}
