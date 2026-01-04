const ROUTES = {
    // speeds in km/h
    walk: 5, //https://en.wikipedia.org/wiki/Preferred_walking_speed
    run: 44.72, // https://en.wikipedia.org/wiki/Footspeed
    cheetah: 104, // https://en.wikipedia.org/wiki/Cheetah
    train: 300, // https://en.wikipedia.org/wiki/Shanghai_maglev_train#Speed_reductions
    airplane: 900, // typical cruising speed
    soundair: 1235, // 20 degrees celsius, https://en.wikipedia.org/wiki/Speed_of_sound
    soundwater: 5331, // fresh water, https://en.wikipedia.org/wiki/Speed_of_sound
    x43: 11760, // https://en.wikipedia.org/wiki/NASA_X-43
    optic: 200000 * 3600, // approximate speed in fiber 200,000 km/s
    light: 299792.458 * 3600, // https://en.wikipedia.org/wiki/Speed_of_light
};

function getSpeedKmPerHour(routeType) {
    if (!routeType) return null;
    const key = routeType.toString().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ROUTES, key)) {
        return ROUTES[key];
    }

    return null;
}

function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "—";

    // Convert hours to total milliseconds
    const totalMs = Math.round(hours * 3600 * 1000);

    const ms = totalMs % 1000;
    let totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    let totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);

    // Build a compact string showing non-zero components
    const parts = [];
    if (h > 0) parts.push(`${h} h`);
    if (m > 0) parts.push(`${m} m`);
    if (s > 0) parts.push(`${s} s`);
    if (ms > 0) parts.push(`${ms} ms`);

    return parts.length > 0 ? parts.join(" ") : "0 ms";
}

export { getSpeedKmPerHour, formatHours };
