import * as THREE from "three";
import { getSpeedKmPerHour, formatHours } from "./routes.js";
import cities from "./cities.js";

export default function initUI(markerUI, orbitCtrl, camera) {
    function getInputNumber(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const v = parseFloat(el.value);
        return Number.isFinite(v) ? v : null;
    }

    function validateLat(lat) {
        return lat !== null && lat >= -90 && lat <= 90;
    }
    function validateLon(lon) {
        return lon !== null && lon >= -180 && lon <= 180;
    }

    const msg = document.getElementById("msg");
    const distanceEl = document.getElementById("distance");
    const routeTypeEl = document.getElementById("routeType");
    const timeEl = document.getElementById("travel");
    let lastDistance = null;

    function updateTravelTime(routeType, distance) {
        if (!timeEl) return;
        const rt = routeType || (routeTypeEl ? routeTypeEl.value : null);
        const speed = getSpeedKmPerHour(rt);
        if (
            Number.isFinite(speed) &&
            speed > 0 &&
            Number.isFinite(distance) &&
            distance >= 0
        ) {
            const hours = distance / speed;
            timeEl.textContent = `Estimated travel time (${rt}): ${formatHours(
                hours,
            )}`;
        } else {
            timeEl.textContent = "Estimated travel time: —";
        }
    }

    function greatCircleDistanceKm(lat1_deg, lon1_deg, lat2_deg, lon2_deg) {
        function toRad(deg) {
            return (deg * Math.PI) / 180.0;
        }

        const lat1 = toRad(lat1_deg);
        const lon1 = toRad(lon1_deg);
        const lat2 = toRad(lat2_deg);
        const lon2 = toRad(lon2_deg);

        const dlat = lat2 - lat1;
        const dlon = lon2 - lon1;

        const a =
            Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin(dlon / 2) *
                Math.sin(dlon / 2);

        const c = 2 * Math.asin(Math.sqrt(a));
        const R = 6371.0;
        return R * c;
    }

    // animation helper for orbit azimuth
    function animateOrbitYTo(orbitCtrl, camera, targetAzimuth, duration = 800) {
        const startPos = camera.position.clone();
        const target = orbitCtrl.target.clone();
        const radius = startPos.clone().sub(target).length();

        const relStart = startPos.clone().sub(target).normalize();
        const startAz = Math.atan2(relStart.x, relStart.z);
        let delta = targetAzimuth - startAz;
        delta = (delta % (Math.PI * 2)) - Math.PI;
        const startTime = performance.now();

        function step(now) {
            const t = Math.min(1, (now - startTime) / duration);
            const tt =
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const az = startAz + delta * tt;
            const rel = startPos.clone().sub(target).normalize();
            const y = rel.y;
            const horiz = Math.sqrt(Math.max(0, 1 - y * y));
            const x = Math.sin(az) * horiz;
            const z = Math.cos(az) * horiz;
            const newPos = new THREE.Vector3(x, y, z)
                .multiplyScalar(radius)
                .add(target);
            camera.position.copy(newPos);
            orbitCtrl.update();
            if (t < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // populate city select elements
    const cityASelect = document.getElementById("cityA");
    const cityBSelect = document.getElementById("cityB");

    function makeOption(key, label) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        return opt;
    }

    function populateCitySelect(selectEl) {
        if (!selectEl) return;
        // clear
        selectEl.innerHTML = "";
        // add Custom/default
        selectEl.appendChild(makeOption("Custom", "Custom (editable)"));
        // add other cities
        Object.keys(cities)
            .filter((k) => k && k !== "Custom")
            .sort()
            .forEach((k) => selectEl.appendChild(makeOption(k, k)));
    }

    populateCitySelect(cityASelect);
    populateCitySelect(cityBSelect);

    // helpers to set lat/lon inputs from city
    function setLatLonFromCity(selectEl, latElId, lonElId) {
        const key = selectEl ? selectEl.value : "";
        const latEl = document.getElementById(latElId);
        const lonEl = document.getElementById(lonElId);
        if (!latEl || !lonEl) return;
        if (key && cities[key]) {
            latEl.value = cities[key].lat;
            lonEl.value = cities[key].lon;
        } else if (key === "Custom") {
            // keep existing lat/lon (user can edit)
        } else {
            latEl.value = "";
            lonEl.value = "";
        }
    }

    // when user picks a city, update lat/lon
    if (cityASelect) {
        cityASelect.addEventListener("change", () => {
            setLatLonFromCity(cityASelect, "latA", "lonA");
        });
    }
    if (cityBSelect) {
        cityBSelect.addEventListener("change", () => {
            setLatLonFromCity(cityBSelect, "latB", "lonB");
        });
    }

    // when user edits lat/lon, mark city as Custom
    function markCityCustomForInputs(latId, lonId, citySelect) {
        const latEl = document.getElementById(latId);
        const lonEl = document.getElementById(lonId);
        if (!latEl || !lonEl || !citySelect) return;
        function setCustom() {
            // if the current lat/lon matches a known city, select it
            const vlat = parseFloat(latEl.value);
            const vlon = parseFloat(lonEl.value);
            if (Number.isFinite(vlat) && Number.isFinite(vlon)) {
                const match = Object.keys(cities).find((k) => {
                    if (!k || k === "Custom") return false;
                    const c = cities[k];
                    return (
                        Math.abs(c.lat - vlat) < 1e-6 &&
                        Math.abs(c.lon - vlon) < 1e-6
                    );
                });
                if (match) {
                    citySelect.value = match;
                    return;
                }
            }
            citySelect.value = "Custom";
        }
        latEl.addEventListener("input", setCustom);
        lonEl.addEventListener("input", setCustom);
    }

    markCityCustomForInputs("latA", "lonA", cityASelect);
    markCityCustomForInputs("latB", "lonB", cityBSelect);

    // shared logic: read inputs, place markers, draw arc, update distance/time
    function updateFromInputs() {
        if (msg) msg.textContent = "";
        const latA = getInputNumber("latA");
        const lonA = getInputNumber("lonA");
        const latB = getInputNumber("latB");
        const lonB = getInputNumber("lonB");

        let placed = false;
        markerUI.clearMarkers();

        let meshA = null;
        let meshB = null;
        if (validateLat(latA) && validateLon(lonA)) {
            meshA = markerUI.placeMarker(latA, lonA, 0x44ff88);
            placed = true;
        }
        if (validateLat(latB) && validateLon(lonB)) {
            meshB = markerUI.placeMarker(latB, lonB, 0xff4444);
            placed = true;
        }

        if (
            validateLat(latA) &&
            validateLon(lonA) &&
            validateLat(latB) &&
            validateLon(lonB)
        ) {
            markerUI.drawGreatCircleArc(latA, lonA, latB, lonB, 160, 0xffff00);

            let mid = null;
            if (meshA && meshB) {
                const v1 = meshA.position.clone().normalize();
                const v2 = meshB.position.clone().normalize();
                const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1);
                const omega = Math.acos(dot);
                if (Math.abs(omega) < 1e-6) {
                    mid = v1.clone();
                } else {
                    const a = Math.sin((1 - 0.5) * omega) / Math.sin(omega);
                    const b = Math.sin(0.5 * omega) / Math.sin(omega);
                    mid = new THREE.Vector3(
                        a * v1.x + b * v2.x,
                        a * v1.y + b * v2.y,
                        a * v1.z + b * v2.z,
                    ).normalize();
                }
            } else if (meshA) {
                mid = meshA.position.clone().normalize();
            } else if (meshB) {
                mid = meshB.position.clone().normalize();
            }

            if (mid) {
                const desiredDir = mid
                    .clone()
                    .sub(orbitCtrl.target)
                    .normalize();
                const desiredAngle = Math.atan2(desiredDir.x, desiredDir.z);
                animateOrbitYTo(orbitCtrl, camera, desiredAngle, 900);
            }

            // compute and display distance when both points valid
            if (distanceEl) {
                const d = greatCircleDistanceKm(latA, lonA, latB, lonB);
                lastDistance = d;
                distanceEl.textContent = `Distance: ${d.toFixed(2)} km`;

                // compute travel time using selected route type
                updateTravelTime(null, d);
            }
        }

        if (!placed && msg) {
            msg.textContent = "Enter at least one valid lat/lon pair";
        }
    }

    // debounce helper
    function debounce(fn, wait = 200) {
        let t = null;
        return function (...args) {
            if (t) clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    const debouncedUpdate = debounce(updateFromInputs, 150);

    // call automatically when lat/lon inputs change
    ["latA", "lonA", "latB", "lonB"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", debouncedUpdate);
    });

    // also trigger when city selects change (they already set lat/lon)
    if (cityASelect) cityASelect.addEventListener("change", debouncedUpdate);
    if (cityBSelect) cityBSelect.addEventListener("change", debouncedUpdate);

    // when route selection changes, recompute time using lastDistance
    if (routeTypeEl) {
        routeTypeEl.addEventListener("change", () => {
            updateTravelTime(routeTypeEl.value, lastDistance);
        });
    }
}
