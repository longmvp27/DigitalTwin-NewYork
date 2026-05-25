"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import * as THREE from "three";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { message } from "antd";

Cesium.Ion.defaultAccessToken =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;
(window as any).CESIUM_BASE_URL = "/cesium/";

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      timeline: false,
      animation: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      requestRenderMode: false,
      shadows: false,
    });

    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    const credit = viewer.cesiumWidget.creditContainer as HTMLElement;
    credit.style.display = "none";

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        105.818413,
        21.035685,
        80
      ),
    });


    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "none";

    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight(0xffffff, 5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(100, 100, 100);
    scene.add(dirLight);


    const width = containerRef.current!.clientWidth;
    const height = containerRef.current!.clientHeight;

    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      1,
      10_000_000
    );

    // const mesh = new THREE.Mesh(
    //   new THREE.SphereGeometry(10, 32, 32),
    //   new THREE.MeshNormalMaterial()
    // );
    const loader = new GLTFLoader();

    let model: THREE.Object3D | null = null;

    loader.load(
      "https://s3.yootek.com.vn/models/a50d9cc3-8ba0-4d27-a860-9ecb08ca96fc/textured_mesh.glb",
      (gltf) => {
        model = gltf.scene;
        model.rotation.x = Math.PI / 2;

        model.scale.setScalar(100);

        scene.add(model);
      },
    );

    const worldPos = Cesium.Cartesian3.fromDegrees(
      105.818413,
      21.035685,
      30
    );


    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.canvas
    );

    handler.setInputAction((click: any) => {
      const w = containerRef.current!.clientWidth;
      const h = containerRef.current!.clientHeight;

      mouse.x = (click.position.x / w) * 2 - 1;
      mouse.y = -(click.position.y / h) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(scene.children, true);

      if (hits.length) {
        console.log("Hit object:", hits[0].object);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


    viewer.scene.postRender.addEventListener(() => {
      const cesiumCam = viewer.camera;

      camera.projectionMatrix.fromArray(
        cesiumCam.frustum.projectionMatrix
      );

      camera.matrixWorld.fromArray(
        cesiumCam.inverseViewMatrix
      );

      camera.matrixWorldInverse.fromArray(
        cesiumCam.viewMatrix
      );

      camera.matrixAutoUpdate = false;

      if (model) {
        model.position.set(worldPos.x, worldPos.y, worldPos.z);
      }

      renderer.render(scene, camera);
    });


    const onResize = () => {
      const w = containerRef.current!.clientWidth;
      const h = containerRef.current!.clientHeight;

      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      handler.destroy();
      renderer.dispose();
      if (!viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}