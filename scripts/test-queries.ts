import { getDevicesRanked, getAllForks, getDeviceBySlug, getVerdictsByDevice } from "../src/lib/queries";

async function main() {
  console.log("=== Top Devices ===");
  const devices = await getDevicesRanked();
  devices.slice(0, 5).forEach(d => console.log(`${d.name}: score=${d.score.toFixed(2)}, verdict=${d.best_verdict}`));

  console.log("\n=== All Forks ===");
  const forks = await getAllForks();
  forks.forEach(f => console.log(`${f.name} (${f.language}) - ${f.min_ram_mb}MB min`));

  console.log("\n=== Pi 5 Verdicts ===");
  const pi5 = await getDeviceBySlug("raspberry-pi-5-8gb");
  if (pi5) {
    const verdicts = await getVerdictsByDevice(pi5.id);
    verdicts.forEach(v => console.log(`${v.fork_name}: ${v.verdict}`));
  }
}

main().catch(console.error);
