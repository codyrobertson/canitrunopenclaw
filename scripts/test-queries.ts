import { getDevicesRanked, getAllForks, getDeviceBySlug, getVerdictsByDevice } from "../src/lib/queries";

console.log("=== Top Devices ===");
const devices = getDevicesRanked();
devices.slice(0, 5).forEach(d => console.log(`${d.name}: score=${d.score.toFixed(2)}, verdict=${d.best_verdict}`));

console.log("\n=== All Forks ===");
getAllForks().forEach(f => console.log(`${f.name} (${f.language}) - ${f.min_ram_mb}MB min`));

console.log("\n=== Pi 5 Verdicts ===");
const pi5 = getDeviceBySlug("raspberry-pi-5-8gb");
if (pi5) getVerdictsByDevice(pi5.id).forEach(v => console.log(`${v.fork_name}: ${v.verdict}`));
