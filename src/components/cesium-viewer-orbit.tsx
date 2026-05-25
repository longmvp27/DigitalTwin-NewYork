"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { message } from "antd";

Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;
(window as any).CESIUM_BASE_URL = "/cesium/";

const CesiumViewerOrbit = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const tilesetCollectionRef = useRef<Cesium.PrimitiveCollection | null>(null);

  useEffect(() => {
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
      requestRenderMode: false,
      contextOptions: {
        webgl: {
          alpha: true,
        },
      },
      // infoBox: false,
      // selectionIndicator: false,
    });
    viewerRef.current = viewer;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    const scene = viewer.scene;
    const controller = scene.screenSpaceCameraController;
    controller.inertiaSpin = 0.85;
    controller.inertiaTranslate = 0.9;
    controller.inertiaZoom = 0.7;
    controller.minimumZoomDistance = 1;
    controller.maximumZoomDistance = 50_000_000;
    controller.enableRotate = false;
    controller.enableTilt = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;

    scene.postProcessStages.fxaa.enabled = true;

    // containerRef.current.style.background = `url('./dt.png') center/cover no-repeat`
    // viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
    viewer.scene.globe.show = false;
    viewer.scene.sun!.show = false;
    viewer.scene.moon!.show = false;
    viewer.scene.skyBox!.show = false;
    viewer.scene.skyAtmosphere!.show = false;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, 20_000_000),
    });

    const credit = viewer.cesiumWidget.creditContainer as HTMLElement;
    credit.style.display = "none";

    const collection = new Cesium.PrimitiveCollection();
    viewer.scene.primitives.add(collection);

    (async () => {
      try {
        const tileset = await Cesium.Cesium3DTileset.fromUrl(
          // "./2507-4BI-TOW-PAR-L25-AA2-M3/tileset.json"     
          // "./MEP-DA NANG/tileset.json"
          // "http://api.yoolife.vn:9900/models/NVW_DCR-LOD300_Arch/tileset.json"
          // "http://api.yoolife.vn:9900/models/20210219Architecture/tileset.json"
          // "http://api.yoolife.vn:9900/models/002fb357-0a2b-42f9-8ce0-2826d7a881bc/tileset.json"
          // "http://api.yoolife.vn:9900/models/03 FLA_DVTM_MEPF/tileset.json"
          // "http://api.yoolife.vn:9900/models/DVTM LINHTRUONG_THANG 2022 11 01/tileset.json"
          // "http://api.yoolife.vn:9900/models/LTA - DVTM - 2023_06_07/tileset.json"
          // "http://api.yoolife.vn:9900/models/ACT2023v2_bati3d_Luxembourg/tileset.json"
          // "http://api.yoolife.vn:9900/models/03 FLA_DVTM_MEPF/tileset.json"
          // "http://api.yoolife.vn:9900/models/DVTM LINHTRUONG_THANG 2022 11 01/tileset.json"
          "http://api.yoolife.vn:9900/models/LTA - DVTM - 2023_06_07/tileset.json"
        );

        tileset.maximumScreenSpaceError = 16;

        if (cancelled || viewer.isDestroyed()) {
          tileset.destroy();
          return;
        }

        const bs = tileset.boundingSphere;
        const recenter = Cesium.Matrix4.fromTranslation(
          Cesium.Cartesian3.negate(bs.center, new Cesium.Cartesian3()),
        );
        tileset.root.transform = recenter;
        const position = Cesium.Cartesian3.fromDegrees(
          105.818413,
          21.035685,
          0,
        );
        tileset.modelMatrix =
          Cesium.Transforms.eastNorthUpToFixedFrame(position);

        if (!viewer.isDestroyed()) {
          collection.add(tileset);
          viewer.zoomTo(tileset);
          tilesetRef.current = tileset;

          //customize orbit camera
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          const target = tileset.boundingSphere.center;
          const radius = tileset.boundingSphere.radius;
          let heading = 0;
          let pitch = -0.5;

          let lastX = 0;
          let lastY = 0;
          let dragging = false;

          let distance = radius * 2;

          handler.setInputAction((delta: number) => {
            distance *= 1 - delta * 0.001;
            
            viewer.camera.lookAt(
              target,
              new Cesium.HeadingPitchRange(heading, pitch, distance),
            );
          }, Cesium.ScreenSpaceEventType.WHEEL);

          handler.setInputAction((movement: any) => {
            dragging = true;
            lastX = movement.position.x;
            lastY = movement.position.y;
          }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

          handler.setInputAction(() => {
            dragging = false;
          }, Cesium.ScreenSpaceEventType.LEFT_UP);

          handler.setInputAction((movement: any) => {
            if (!dragging) return;

            const dx = movement.endPosition.x - lastX;
            const dy = movement.endPosition.y - lastY;
            lastX = movement.endPosition.x;
            lastY = movement.endPosition.y;
            heading += dx * 0.003;
            pitch -= dy * 0.003;

            viewer.camera.lookAt(
              target,
              new Cesium.HeadingPitchRange(heading, pitch, distance),
            );
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        }
      } catch (err) {
        if (!cancelled) console.error('err: ', err);
      }
    })();

    let lastFeature: Cesium.Cesium3DTileFeature | null = null;
    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.position);

      if (!Cesium.defined(picked)) {
        console.log("Không pick được object");
        return;
      }

      console.log("picked:", picked);

      if (picked instanceof Cesium.Cesium3DTileFeature) {
        const propertyIds = picked.getPropertyIds();

        const properties: Record<string, any> = {};

        propertyIds.forEach((id) => {
          properties[id] = picked.getProperty(id);
        });

        if (lastFeature) {
          lastFeature.color = Cesium.Color.WHITE;
        }
        picked.color = Cesium.Color.RED;
        lastFeature = picked;

        // const cartesian = viewer.scene.pickPosition(movement.position);
        // if (Cesium.defined(cartesian)) {
        //   const offset = new Cesium.HeadingPitchRange(
        //     0,
        //     -0.5,
        //     8,
        //   );

        //   viewer.camera.flyToBoundingSphere(
        //     new Cesium.BoundingSphere(cartesian, 1),
        //     {
        //       offset,
        //       duration: 2,
        //     },
        //   );
        // }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      cancelled = true;

      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }

      viewerRef.current = null;
      tilesetRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default CesiumViewerOrbit;
