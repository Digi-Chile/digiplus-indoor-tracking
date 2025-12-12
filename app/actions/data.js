"use server";
import { supabase } from "@/lib/supabase";
import { beacons } from "@/lib/beacons";

function getBeaconByMac(mac) {
  return beacons.find(b => b.mac.toUpperCase() === mac.toUpperCase());
}

const REAL_WIDTH  = 40; // largo en metros
const REAL_HEIGHT = 30; // ancho en metros

const MIN_RSSI_FOR_TRILAT = -90; // más débil que esto: no muy confiable para trilaterar
const MAX_DISTANCE = 40;         // no tiene sentido d > tamaño del piso aprox
const MAX_MEAN_ERROR = 5;        // metros de error promedio aceptable para trilateración

// Configuración para estabilización de posición
const MIN_RSSI_CHANGE_THRESHOLD = 5;   // cambio mínimo en dBm para considerar movimiento real
const MIN_DISTANCE_CHANGE = 1.5;       // metros mínimos de cambio para actualizar posición

function clampToFloor(pos) {
  let x = pos.x;
  let y = pos.y;

  x = Math.max(0, Math.min(REAL_WIDTH, x));
  y = Math.max(0, Math.min(REAL_HEIGHT, y));

  return { x, y };
}

function buildReadings(posData) {
  return posData
    .map(r => {
      const beacon = getBeaconByMac(r.mac);
      if (!beacon) return null;

      const rssi = parseInt(r.rssi.replace("dBm", ""), 10);
      const dRaw = rssiToDistance(rssi);
      const d = Math.min(dRaw, MAX_DISTANCE); // capear distancia

      return {
        x: beacon.x,
        y: beacon.y,
        rssi,
        d,
      };
    })
    .filter(Boolean);
}

function centroidPosition(readings) {
  if (readings.length === 0) return null;

  let sumW = 0;
  let sumX = 0;
  let sumY = 0;

  for (const r of readings) {
    const w = 1 / (r.d * r.d + 1e-6); // los cercanos pesan más
    sumW += w;
    sumX += w * r.x;
    sumY += w * r.y;
  }

  return clampToFloor({
    x: sumX / sumW,
    y: sumY / sumW,
  });
}

function trilaterateRaw(readings) {
  if (readings.length < 3) return null;

  // ordenar por menor distancia y usar hasta 5
  const used = [...readings].sort((a, b) => a.d - b.d).slice(0, 5);
  const ref = used[0];

  let A11 = 0, A12 = 0, A22 = 0;
  let B1 = 0, B2 = 0;

  for (let i = 1; i < used.length; i++) {
    const p = used[i];
    const dx = p.x - ref.x;
    const dy = p.y - ref.y;

    const rhs =
      0.5 * (
        (p.x * p.x - ref.x * ref.x) +
        (p.y * p.y - ref.y * ref.y) +
        (ref.d * ref.d - p.d * p.d)
      );

    A11 += dx * dx;
    A12 += dx * dy;
    A22 += dy * dy;

    B1 += dx * rhs;
    B2 += dy * rhs;
  }

  const det = A11 * A22 - A12 * A12;
  if (Math.abs(det) < 1e-6) return null;

  const invA11 =  A22 / det;
  const invA12 = -A12 / det;
  const invA22 =  A11 / det;

  const x = invA11 * B1 + invA12 * B2;
  const y = invA12 * B1 + invA22 * B2;

  return { x, y, used };
}

function trilatError(pos, readings) {
  if (!pos || !readings || readings.length === 0) return Infinity;

  let sumAbs = 0;

  for (const r of readings) {
    const distModel = Math.hypot(pos.x - r.x, pos.y - r.y);
    sumAbs += Math.abs(distModel - r.d);
  }

  return sumAbs / readings.length; // error promedio en metros
}

/**
 * Valida que TODOS los elementos de posData correspondan a beacons reales definidos
 * Si alguno no es válido, retorna false
 */
function validateAllBeaconsExist(posData) {
  for (const item of posData) {
    const beacon = getBeaconByMac(item.mac);
    if (!beacon) {
      console.log(`Beacon no reconocido: ${item.mac} - descartando dato completo`);
      return false;
    }
  }
  return true;
}

function estimatePosition(posData) {
  // Validar que TODOS los beacons existan antes de procesar
  if (!validateAllBeaconsExist(posData)) {
    console.log("Uno o más beacons no están definidos - usando posición anterior");
    return null;
  }

  const readingsAll = buildReadings(posData);
  if (readingsAll.length === 0) {
    console.log("Sin beacons válidos");
    return null;
  }

  // Centroide siempre disponible
  const centroid = centroidPosition(readingsAll);

  // Filtrar lecturas “fuertes” para trilateración
  const strong = readingsAll.filter(r => r.rssi >= MIN_RSSI_FOR_TRILAT);
  const trilatReadings = strong.length >= 3 ? strong : readingsAll;

  let trilat = null;
  let error = Infinity;

  if (trilatReadings.length >= 3) {
    const raw = trilaterateRaw(trilatReadings);
    if (raw) {
      const clamped = clampToFloor({ x: raw.x, y: raw.y });
      trilat = clamped;
      error = trilatError(clamped, trilatReadings);
    }
  }

  // Decisión: si la trilateración es razonable, úsala; si no, centroide
  if (trilat && error <= MAX_MEAN_ERROR) {
    return {
      ...trilat,
      method: "trilateration",
      error,
    };
  } else {
    return {
      ...centroid,
      method: trilat ? "centroid_fallback" : "centroid_only",
      error,
    };
  }
}


const convertBatteryLevel = (battery) => {
  return battery.split("%")[0];
}

function rssiToDistance(rssi, rssiAt1m = -59, n = 2.8) {
  const exponent = (rssiAt1m - rssi) / (10 * n);
  return Math.pow(10, exponent);  // metros
}

/**
 * Obtiene la última posición registrada del dispositivo
 */
async function getLastDevicePosition(deviceId) {
  const { data, error } = await supabase
    .from("data")
    .select("pos_data, values")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    position: data[0].pos_data,
    previousValues: data[0].values
  };
}

/**
 * Calcula el cambio promedio de RSSI entre dos conjuntos de lecturas
 * Retorna el cambio promedio absoluto en dBm
 */
function calculateRssiChange(currentPosData, previousValues) {
  if (!previousValues || !Array.isArray(previousValues) || previousValues.length === 0) {
    return Infinity; // Sin datos previos, considerar como movimiento
  }

  // Crear mapa de RSSI previos por MAC
  const previousRssiMap = new Map();
  for (const item of previousValues) {
    const rssi = parseInt(item.rssi.replace("dBm", ""), 10);
    previousRssiMap.set(item.mac.toUpperCase(), rssi);
  }

  // Calcular diferencia promedio de RSSI para beacons comunes
  let totalChange = 0;
  let matchedCount = 0;

  for (const item of currentPosData) {
    const mac = item.mac.toUpperCase();
    const currentRssi = parseInt(item.rssi.replace("dBm", ""), 10);
    
    if (previousRssiMap.has(mac)) {
      const previousRssi = previousRssiMap.get(mac);
      totalChange += Math.abs(currentRssi - previousRssi);
      matchedCount++;
    }
  }

  if (matchedCount === 0) {
    return Infinity; // Sin beacons comunes, considerar como movimiento
  }

  return totalChange / matchedCount;
}

/**
 * Calcula la distancia euclidiana entre dos posiciones
 */
function calculatePositionDistance(pos1, pos2) {
  if (!pos1 || !pos2) return Infinity;
  return Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
}

/**
 * Determina si hay un cambio significativo que justifique actualizar la posición
 */
function hasSignificantChange(currentPosData, newPosition, lastData) {
  if (!lastData || !lastData.position) {
    return true; // Sin datos previos, siempre es significativo
  }

  const { position: lastPosition, previousValues } = lastData;

  // 1. Verificar cambio de RSSI
  const rssiChange = calculateRssiChange(currentPosData, previousValues);
  const hasSignificantRssiChange = rssiChange >= MIN_RSSI_CHANGE_THRESHOLD;

  // 2. Verificar cambio de distancia en la posición calculada
  const positionDistance = calculatePositionDistance(newPosition, lastPosition);
  const hasSignificantPositionChange = positionDistance >= MIN_DISTANCE_CHANGE;

  console.log(`RSSI change: ${rssiChange.toFixed(2)} dBm (threshold: ${MIN_RSSI_CHANGE_THRESHOLD})`);
  console.log(`Position change: ${positionDistance.toFixed(2)} m (threshold: ${MIN_DISTANCE_CHANGE})`);

  // Solo actualizar si hay cambio significativo en RSSI Y la posición cambió notablemente
  // O si el cambio de RSSI es muy alto (indicando movimiento real)
  return (hasSignificantRssiChange && hasSignificantPositionChange) || rssiChange >= MIN_RSSI_CHANGE_THRESHOLD * 2;
}

export const insertData = async (deviceId, data) => {
  console.log("Inserting data");
  console.log(data);
  const deviceEuid = data?.end_device_ids?.dev_eui;
  const battery = data?.uplink_message?.decoded_payload?.batt_level || null;
  const posData = data?.uplink_message?.decoded_payload?.pos_data || null;

  if (!posData || !deviceEuid) {
    console.log("No pos data or device euid");
    return;
  }

  // Calcular nueva posición
  const estimatedPosition = estimatePosition(posData);

  if (!estimatedPosition) {
    console.log("No estimated position - skipping data insertion");
    return;
  }

  // Obtener última posición del dispositivo para comparar
  const lastData = await getLastDevicePosition(deviceId);

  // Verificar si hay un cambio significativo
  const significantChange = hasSignificantChange(posData, estimatedPosition, lastData);

  // Determinar qué posición usar
  let finalPosition;
  if (significantChange) {
    finalPosition = estimatedPosition;
    console.log("Significant change detected - using new position");
  } else {
    // Mantener la posición anterior si no hay cambio significativo
    finalPosition = lastData?.position || estimatedPosition;
    console.log("No significant change - keeping previous position");
  }

  const { error } = await supabase.from("data").insert({
    device_id: deviceId,
    device_euid: deviceEuid,
    battery: battery ? parseInt(convertBatteryLevel(battery)) : null,
    pos_data: finalPosition,
    values: posData  // Siempre guardar los valores actuales de RSSI para referencia
  });

  if (error) {
    console.log(error.message);
  }

  console.log("Data inserted successfully");
}

export const getDeviceData = async ({
  deviceId = null,
  limit = 100,
}) => {
  const { data, error } = await supabase
    .from("data")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data;
}

export const getDeviceDataByDate = async ({
  deviceId = null,
  startDate = null,
  endDate = null,
}) => {
  const { data, error } = await supabase
  .rpc('get_data_by_device_and_date', {
    p_device_id: deviceId,
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.log(error.message);
  }

  return data;
}
