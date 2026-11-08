"""Privacy-preserving campus-area responses; raw presence never leaves this boundary."""
from collections import Counter

# Approximately 110m east-west x 89m north-south at UBC. The user's own shared
# position may be read through /presence/me, but is deliberately not exact here.
AREA_LATITUDE_DEGREES = 0.0008
AREA_LONGITUDE_DEGREES = 0.0011


def aggregate_cell(latitude: float, longitude: float) -> tuple[float, float]:
    return (
        round((round(latitude / AREA_LATITUDE_DEGREES) * AREA_LATITUDE_DEGREES), 6),
        round((round(longitude / AREA_LONGITUDE_DEGREES) * AREA_LONGITUDE_DEGREES), 6),
    )


def aggregate_heat_points(points):
    areas = Counter(aggregate_cell(point[0], point[1]) for point in points)
    return [{'area': {'lat': key[0], 'lng': key[1]}, 'count': count} for key, count in sorted(areas.items())]
