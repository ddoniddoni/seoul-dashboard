import catalog from "../../../docs/area-catalog.json" with { type: "json" };
import initialCatalog from "../../../docs/initial-area-catalog.json" with { type: "json" };

/** 공식 명칭/코드만 공유한다. 시연 관측값은 별도의 합성 fixture다. */
export const areaCatalog = catalog.areas.map(({ areaCode, areaName, category }) => ({
  areaCode, areaName, category,
}));

/** 최초 5곳 선정 기록. 현재 화면과 수집 범위는 monitoredAreaCatalog를 사용한다. */
export const initialAreaCatalog = initialCatalog.areas.map(({ areaCode, areaName, category }) => ({
  areaCode, areaName, category,
}));

/** 기존 5곳과 역세권, 관광지, 상권, 공원을 포함한 기본 모니터링 20곳. */
const monitoredAreaCodes = [
  "POI014", "POI007", "POI003", "POI072", "POI068",
  "POI002", "POI005", "POI008", "POI009", "POI015",
  "POI033", "POI046", "POI053", "POI054", "POI060",
  "POI073", "POI083", "POI091", "POI101", "POI105",
] as const;
export const monitoredAreaCatalog = monitoredAreaCodes.map((code) => {
  const area = areaCatalog.find((item) => item.areaCode === code);
  if (!area) throw new Error(`공식 카탈로그에 없는 모니터링 장소: ${code}`);
  return area;
});

export function isAreaCode(code: string) {
  return areaCatalog.some((area) => area.areaCode === code);
}
