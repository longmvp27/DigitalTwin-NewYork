"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhODUwOGNkNS0zMTcxLTQ0MWItOTUwYy04NTNiZjNlNDgyMTkiLCJpZCI6MzcwMDc4LCJpYXQiOjE3NjU4NTg0MzR9.Fm4O3_VjyKQ5uPNTRt38X7NIuTn1p5gXp1XO2VQU6uI";
(window as any).CESIUM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/cesium@1.136.0/Build/Cesium/";

interface BuildingInfo {
  id: string;
  name: string;
  height: number | null;
  floors: number | null;
  area: number | null;
  type: string;
  status: string;
  longitude: number | null;
  latitude: number | null;
  address: string;
  dataSource: string;
  crs: string;
  updatedAt: string;
}

function extractBuildingInfo(feature: Cesium.Cesium3DTileFeature, position: Cesium.Cartesian3): BuildingInfo {
  const get = (key: string) => {
    try { return feature.getProperty(key); } catch { return undefined; }
  };

  const ids = feature.getPropertyIds();
  const props: Record<string, any> = {};
  ids.forEach((id) => { props[id] = get(id); });
  console.log('ids: ', ids);

  const name =
    get("name") ?? get("gml:name") ?? get("id") ?? get("building_id") ?? "—";
  const id =
    get("gml:id") ?? get("id") ?? get("building_id") ?? name;

  const rawHeight =
    get("measuredHeight") ?? get("height") ?? get("roofHeight") ??
    get("heightAboveGround") ?? get("z_max") ?? null;
  const height = rawHeight !== null && rawHeight !== undefined
    ? parseFloat(rawHeight) : null;

  const floors = height !== null ? Math.round(height / 3) : null;

  const rawArea = get("area") ?? get("footprintArea") ?? get("groundArea") ?? null;
  const area = rawArea !== null ? parseFloat(rawArea) : null;

  const type = get("class") ?? get("function") ?? get("usage") ?? "Building";
  const status = get("status") ?? "Đang sử dụng";

  const carto = Cesium.Cartographic.fromCartesian(position);
  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);

  const address =
    get("address") ?? get("addr") ?? get("streetAddress") ?? "New York";

  const dataSource = get("dataSource") ?? get("source") ?? "CityGML";
  const crs = get("crs") ?? get("srsName") ?? "EPSG:4326";
  const updatedAt =
    get("updatedAt") ?? get("lastModified") ?? get("creationDate") ??
    new Date().toLocaleDateString("vi-VN");

  return { id, name, height, floors, area, type, status,
    longitude: lon, latitude: lat, address, dataSource, crs, updatedAt };
}

const BuildingPopup = ({
  info,
  onClose,
}: {
  info: BuildingInfo;
  onClose: () => void;
}) => {
  console.log('info: ', info);
  const fmt = (v: number | null, decimals = 2) =>
    v !== null ? v.toFixed(decimals) : "—";

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      width: 360,
      background: "#1a2332",
      borderRadius: 16,
      overflow: "hidden",
      fontFamily: "sans-serif",
      fontSize: 13,
      color: "#e0e6f0",
      border: "0.5px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      zIndex: 1000,
      maxHeight: "calc(100vh - 80px)",
      overflowY: "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px",
        background: "#1e2c40",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <img src="https://assets.yoolife.com.vn/yootek/1779681147170-7120.png"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#fff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {info.name}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 8, color: "#7a9ab0",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {info.id}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            marginLeft: "auto", cursor: "pointer",
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#aaa", fontSize: 18, flexShrink: 0,
            border: "none", lineHeight: 1,
          }}
        >×</button>
      </div>

      {[
        {
          title: "✦ Thông tin chung",
          rows: [
            ["ID", info.id.length > 24 ? info.id.slice(0, 24) + "…" : info.id],
            ["Chiều cao", info.height !== null ? `${fmt(info.height)} m` : "—"],
            ["Số tầng (ước tính)", info.floors !== null ? `~ ${info.floors} tầng` : "—"],
            ["Diện tích", info.area !== null ? `~ ${info.area.toLocaleString()} m²` : "—"],
            ["Loại công trình", info.type],
            ["Trạng thái", info.status, "badge"],
          ],
        },
        {
          title: "✦ Thông tin vị trí",
          rows: [
            ["Kinh độ", info.longitude !== null ? info.longitude.toFixed(7) : "—"],
            ["Vĩ độ", info.latitude !== null ? info.latitude.toFixed(7) : "—"],
            ["Địa chỉ (ước tính)", info.address],
          ],
        },
        {
          title: "✦ Thông tin GIS",
          rows: [
            ["Tên", info.name],
            ["Nguồn dữ liệu", info.dataSource],
            ["Hệ quy chiếu", info.crs],
            ["Ngày cập nhật", info.updatedAt],
          ],
        },
      ].map((section) => (
        <div key={section.title}>
          <p style={{
            margin: 0, padding: "10px 16px 6px",
            fontSize: 11, fontWeight: 500, color: "#5bc8a8",
            letterSpacing: "0.5px", textTransform: "uppercase",
          }}>
            {section.title}
          </p>
          <div style={{
            margin: "0 12px 8px",
            background: "#14202e",
            borderRadius: 10,
            border: "0.5px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}>
            {section.rows.map(([label, value, type], i) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "8px 12px",
                borderBottom: i < section.rows.length - 1
                  ? "0.5px solid rgba(255,255,255,0.05)" : "none",
                gap: 12,
              }}>
                <span style={{ color: "#7a9ab0", fontSize: 12, whiteSpace: "nowrap" }}>
                  {label}
                </span>
                {type === "badge" ? (
                  <span style={{
                    background: "rgba(91,200,168,0.15)",
                    color: "#5bc8a8", borderRadius: 20,
                    padding: "2px 8px", fontSize: 11,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#5bc8a8", flexShrink: 0,
                    }} />
                    {value}
                  </span>
                ) : (
                  <span style={{
                    color: "#d4e4f0", fontSize: 12,
                    textAlign: "right", wordBreak: "break-all",
                  }}>
                    {value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
};

const CesiumCityGml = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const lastFeatureRef = useRef<Cesium.Cesium3DTileFeature | null>(null);

  // State popup
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);

  useEffect(() => {
    const initTileset = async () => {
      if (!containerRef.current) return;
      let cancelled = false;

      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        contextOptions: { webgl: { alpha: true } },
        infoBox: false,
        selectionIndicator: false,
      });

      Cesium.RequestScheduler.maximumRequestsPerServer = 18;
      viewerRef.current = viewer;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = false;

      const credit = viewer.cesiumWidget.creditContainer as HTMLElement;
      credit.style.display = "none";

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      const collection = new Cesium.PrimitiveCollection();
      viewer.scene.primitives.add(collection);

      (async () => {
        try {
          const urls = [
            "https://cdn.yoolife.com.vn/models/DA13_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA19_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA17_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA15_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA5_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA12_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA4_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA7_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA9_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA8_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA11_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA20_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA10_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA16_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA1_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA3_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA14_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA2_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA6_3D_Buildings_Merged/tileset.json",
            "https://cdn.yoolife.com.vn/models/DA18_3D_Buildings_Merged/tileset.json",
          ];

          const loadedTilesets: Cesium.Cesium3DTileset[] = [];

          await Promise.allSettled(
            urls.map(async (url) => {
              try {
                const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
                  maximumScreenSpaceError: 16,
                });
                if (cancelled) return;

                const cart = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
                const surface = Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, 0);
                const offset = Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, -30);
                tileset.modelMatrix = Cesium.Matrix4.fromTranslation(
                  Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3())
                );

                collection.add(tileset);
                loadedTilesets.push(tileset);
                viewer.scene.requestRender();
              } catch (err) {
                console.warn("Failed:", url, err);
              }
            })
          );

          if (loadedTilesets.length === 0) return;
          tilesetRef.current = loadedTilesets[0];

          const maxRadius = Math.max(...loadedTilesets.map((t) => t.boundingSphere.radius));
          viewer.camera.flyToBoundingSphere(loadedTilesets[0].boundingSphere, {
            duration: 0,
            offset: new Cesium.HeadingPitchRange(0, -0.5, maxRadius * 2.5),
          });
        } catch (err) {
          if (!cancelled) console.error("err:", err);
        }
      })();

      handler.setInputAction((movement: any) => {
        const picked = viewer.scene.pick(movement.position);
        const propertyIds = picked.getPropertyIds();

        const properties: Record<string, any> = {};
        propertyIds.forEach((id: any) => {
          properties[id] = picked.getProperty(id);
        });

        console.log("Property IDs:", propertyIds);
        console.table(properties);
        // Reset màu feature cũ
        if (lastFeatureRef.current) {
          lastFeatureRef.current.color = Cesium.Color.WHITE;
          lastFeatureRef.current = null;
        }

        if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) {
          setSelectedBuilding(null);
          return;
        }

        // Highlight feature mới
        picked.color = Cesium.Color.fromCssColorString("#5bc8a8").withAlpha(0.9);
        lastFeatureRef.current = picked;
        viewer.scene.requestRender();

        // Lấy vị trí world của điểm click
        const worldPos = viewer.scene.pickPosition(movement.position);
        if (!Cesium.defined(worldPos)) return;

        // Trích xuất thông tin & cập nhật state
        const info = extractBuildingInfo(picked, worldPos);
        setSelectedBuilding(info);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      return () => {
        cancelled = true;
        handler.destroy();
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
        viewerRef.current = null;
        tilesetRef.current = null;
      };
    };

    initTileset();
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {selectedBuilding && (
        <BuildingPopup
          info={selectedBuilding}
          onClose={() => {
            setSelectedBuilding(null);
            if (lastFeatureRef.current) {
              lastFeatureRef.current.color = Cesium.Color.WHITE;
              lastFeatureRef.current = null;
              viewerRef.current?.scene.requestRender();
            }
          }}
        />
      )}
    </div>
  );
};

export default CesiumCityGml;