"""공식 공개 자료를 대시보드 위치 개요용 SVG 경로로 가공한다. 네트워크/키 접근 없음."""
from pathlib import Path
import json, math, struct, zipfile, hashlib

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs/sources'
WIDTH, HEIGHT, PAD = 720, 520, 30

def mercator(point):
    lon, lat = point
    return math.radians(lon), math.asinh(math.tan(math.radians(lat)))

def rings(geometry):
    if geometry['type'] == 'Polygon':
        return geometry['coordinates']
    if geometry['type'] == 'MultiPolygon':
        return [ring for polygon in geometry['coordinates'] for ring in polygon]
    raise ValueError('지원하지 않는 원천 도형')

districts = json.loads((SOURCE / 'seoul-districts-20250630.geojson').read_text())
catalog = json.loads((ROOT / 'docs/area-catalog.json').read_text())['areas']
point_source = json.loads((SOURCE / 'seoul-hotspot-display-points.json').read_text())
points = point_source['points']

projected = [mercator(point) for feature in districts['features'] for ring in rings(feature['geometry']) for point in ring]
west, east = min(p[0] for p in projected), max(p[0] for p in projected)
south, north = min(p[1] for p in projected), max(p[1] for p in projected)
scale = min((WIDTH - 2 * PAD) / (east - west), (HEIGHT - 2 * PAD) / (north - south))
left, top = (WIDTH - (east - west) * scale) / 2, (HEIGHT - (north - south) * scale) / 2

def display(point):
    x, y = mercator(point)
    return round(left + (x - west) * scale, 2), round(top + (north - y) * scale, 2)

def svg_path(raw_rings):
    return ''.join('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in map(display, ring)) + 'Z' for ring in raw_rings)

def label_center(raw_ring):
    coords = list(map(display, raw_ring))
    terms = [(x1 * y2 - x2 * y1, x1 + x2, y1 + y2) for (x1, y1), (x2, y2) in zip(coords, coords[1:] + coords[:1])]
    area = sum(term[0] for term in terms)
    if not area:
        return coords[0]
    return round(sum(c * x for c, x, _ in terms) / (3 * area), 2), round(sum(c * y for c, _, y in terms) / (3 * area), 2)

def largest_ring(raw_rings):
    def area(ring):
        return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1])))
    return max(raw_rings, key=area)

# 기존 공식 SHP/DBF에서 전체 장소의 도형을 그대로 읽는다. 원본은 수정하지 않는다.
with zipfile.ZipFile(SOURCE / 'areas.zip') as archive:
    shp = archive.read(next(name for name in archive.namelist() if name.endswith('.shp')))
    dbf = archive.read(next(name for name in archive.namelist() if name.endswith('.dbf')))
    prj = archive.read(next(name for name in archive.namelist() if name.endswith('.prj'))).decode('utf-8')
count = struct.unpack_from('<I', dbf, 4)[0]
header_length, record_length = struct.unpack_from('<HH', dbf, 8)
fields = []
for offset in range(32, header_length - 1, 32):
    if dbf[offset] == 13:
        break
    fields.append((dbf[offset:offset + 11].split(b'\0')[0].decode('ascii'), dbf[offset + 16]))
records = []
for index in range(count):
    offset = header_length + index * record_length + 1
    record = {}
    for name, length in fields:
        record[name] = dbf[offset:offset + length].decode('utf-8').strip()
        offset += length
    records.append(record)
shape_paths = {}
offset, index = 100, 0
wanted = {area['areaCode'] for area in catalog}
assert {(record['AREA_CD'], record['AREA_NM'], record['CATEGORY']) for record in records} == {(area['areaCode'], area['areaName'], area['category']) for area in catalog}
while offset < len(shp):
    size = struct.unpack_from('>I', shp, offset + 4)[0] * 2
    content = shp[offset + 8:offset + 8 + size]
    record = records[index]
    if record['AREA_CD'] in wanted:
        if struct.unpack_from('<I', content, 0)[0] != 5:
            raise ValueError('원천 polygon 형식 불일치')
        part_count, point_count = struct.unpack_from('<II', content, 36)
        parts = list(struct.unpack_from(f'<{part_count}I', content, 44)) + [point_count]
        coords = [struct.unpack_from('<dd', content, 44 + part_count * 4 + i * 16) for i in range(point_count)]
        shape_paths[record['AREA_CD']] = svg_path([coords[start:end] for start, end in zip(parts, parts[1:])])
    offset += 8 + size
    index += 1

result = {
    'viewBox': [0, 0, WIDTH, HEIGHT],
    'districts': [{'name': feature['properties']['name'], 'path': svg_path(rings(feature['geometry'])), 'label': label_center(largest_ring(rings(feature['geometry'])))} for feature in districts['features']],
    'places': [{**point, 'position': display([point['longitude'], point['latitude']]), 'path': shape_paths[point['areaCode']]} for point in points],
    'scope': '정적 위치 개요. 자치구는 배경이며 자치구별 관측/혼잡 자료가 아님.',
}
output = ROOT / 'src/lib/geo/seoul-overview.json'
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
metadata = {
    'generatedOn': '2026-10-15', 'districtSource': 'https://data.seoul.go.kr/opendata/seoulStay/grid_viewer.html',
    'districtBoundaryDate': '2025-06-30', 'districtSourceField': '공개 HTML의 SIGUNGU GeoJSON',
    'pointSource': point_source['sourceUrl'], 'placePolygonSource': 'https://data.seoul.go.kr/dataList/OA-21285/F/1/datasetView.do',
    'placePolygonCrs': prj, 'projection': 'WGS84 경위도 → 구면 Web Mercator → 720×520 고정 SVG 좌표',
    'projectionReference': 'https://proj.org/en/stable/operations/projections/webmerc.html',
    'displayPrecision': 'SVG 0.1 단위. 원본 경위도/경계 파일은 별도 보관.',
    'districtSourceSha256': hashlib.sha256((SOURCE / 'seoul-districts-20250630.geojson').read_bytes()).hexdigest(),
    'assetSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'geometryScope': '표시용 경로 가공만 수행. 폴리곤 유효성/위상/대표점 전체 GIS 검증과 MapLibre 카메라/확대축소는 M4에 남김.',
    'rights': '서울특별시 출처 표시. 장소 영역은 기존 공공누리 제1유형. 격자 지도 내 자치구 자산의 별도 재배포 조건은 공개 배포 전에 확인 필요.',
}
(SOURCE / 'seoul-overview.meta.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'districts': len(result['districts']), 'places': len(result['places']), 'svgAssetBytes': output.stat().st_size, 'sourceCoordinatesUsed': True}, ensure_ascii=False))
