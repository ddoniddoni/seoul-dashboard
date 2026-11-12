"""보관한 공식 XLSX와 공개 표시 좌표를 대조해 전체 카탈로그를 생성한다. 네트워크/키 접근 없음."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'docs/sources/catalog.xlsx'
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as archive:
    strings = [''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    areas = []
    for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//s:row', ns):
        values = {}
        for cell in row.findall('s:c', ns):
            value = cell.find('s:v', ns)
            if value is not None:
                values[cell.attrib['r'].rstrip('0123456789')] = strings[int(value.text)] if cell.attrib.get('t') == 's' else value.text
        if values.get('C', '').startswith('POI'):
            areas.append({'sourceRow': int(row.attrib['r']), 'category': values['A'], 'areaCode': values['C'], 'areaName': values['D']})

points = json.loads((ROOT / 'docs/sources/seoul-hotspot-display-points.json').read_text())
assert len(areas) == len({area['areaCode'] for area in areas})
assert {(area['areaCode'], area['areaName']) for area in areas} == {(point['areaCode'], point['areaName']) for point in points['points']}
result = {
    'verifiedOn': points['retrievedOn'],
    'source': {'provider': '서울특별시 서울 열린데이터광장',
               'datasetUrl': 'https://data.seoul.go.kr/dataList/OA-21285/F/1/datasetView.do',
               'filename': '서울시 주요 121장소 목록.xlsx', 'attachmentModifiedOn': '2026-04-02',
               'sheet': '장소목록', 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()},
    'scope': '도시데이터 API의 전체 공식 장소 목록. 서울 전역의 인구나 자동 수집 활성 목록을 의미하지 않는다.',
    'areas': areas,
}
(ROOT / 'docs/area-catalog.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'catalogAreas': len(areas), 'officialPointsMatched': len(points['points'])}, ensure_ascii=False))
