function normalizeTargetType(targetType) {
  return String(targetType ?? "").trim().toLowerCase();
}

function buildTargetKey(targetType, targetId) {
  return `${normalizeTargetType(targetType)}:${String(targetId ?? "").trim()}`;
}

export function buildReviewStats(reviews) {
  const statsMap = new Map();

  reviews.forEach((review) => {
    const rating = Number(review.rating ?? 0);
    const targetKey = buildTargetKey(review.targetType, review.targetId);

    if (!targetKey || !Number.isFinite(rating) || rating <= 0) {
      return;
    }

    const current = statsMap.get(targetKey) ?? {
      average: 0,
      count: 0,
      total: 0,
      latestDate: "",
    };

    const nextTotal = current.total + rating;
    const nextCount = current.count + 1;

    statsMap.set(targetKey, {
      total: nextTotal,
      count: nextCount,
      average: nextTotal / nextCount,
      latestDate:
        !current.latestDate || String(review.createdAt ?? "") > current.latestDate
          ? String(review.createdAt ?? "")
          : current.latestDate,
    });
  });

  return statsMap;
}

export function getReviewStat(statsMap, targetType, targetId) {
  return (
    statsMap.get(buildTargetKey(targetType, targetId)) ?? {
      average: 0,
      count: 0,
      latestDate: "",
    }
  );
}

export function calculateDistanceKm(from, to) {
  if (
    !from ||
    !to ||
    !Number.isFinite(Number(from.latitude)) ||
    !Number.isFinite(Number(from.longitude)) ||
    !Number.isFinite(Number(to.latitude)) ||
    !Number.isFinite(Number(to.longitude))
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRadians(Number(to.latitude) - Number(from.latitude));
  const dLon = toRadians(Number(to.longitude) - Number(from.longitude));
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return "Not available";
  }

  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

export function parseSortDate(value) {
  const timestamp = new Date(value ?? "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
