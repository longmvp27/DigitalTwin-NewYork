"use client";

import { Touch, useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import gsap from "gsap";
import ThreeToCesium from "three-to-cesium";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;
(window as any).CESIUM_BASE_URL = "/cesium/";
// Cesium.RequestScheduler.maximumRequests = 2;
// Cesium.RequestScheduler.maximumRequestsPerServer = 1;

const CesiumViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const tilesetCollectionRef = useRef<Cesium.PrimitiveCollection | null>(null);

  let cameraTween: gsap.core.Tween | null = null;

  const input = {
    isDragging: false,
    yaw: 0,
    pitch: 0,
    lastX: 0,
    lastY: 0,
    wheelForward: 0,
    keys: {} as Record<string, boolean>,
    touches: [] as Touch[],
    lastTouchDist: 0,
  };

  const onMouseDown = (m: any) => {
    input.isDragging = true;
  };
  const onMouseUp = (m: any) => {
    input.isDragging = false;
  };

  const onMouseMove = (m: any) => {
    if (!viewerRef.current) return;
    if (!input.isDragging) {
      input.lastX = m.endPosition.x;
      input.lastY = m.endPosition.y;
      return;
    }

    const dx = m.endPosition.x - input.lastX;
    const dy = m.endPosition.y - input.lastY;

    input.lastX = m.endPosition.x;
    input.lastY = m.endPosition.y;

    input.yaw -= dx * 0.001;
    input.pitch += dy * 0.001;

    viewerRef.current.camera.setView({
      orientation: { heading: input.yaw, pitch: input.pitch },
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    input.keys[e.code] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    input.keys[e.code] = false;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    input.wheelForward += -e.deltaY * 0.01;
  };

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    input.isDragging = true;

    if (e.touches.length === 1) {
      input.lastX = e.touches[0].clientX;
      input.lastY = e.touches[0].clientY;
    }

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      input.lastTouchDist = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!viewerRef.current) return;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - input.lastX;
      const dy = t.clientY - input.lastY;

      input.lastX = t.clientX;
      input.lastY = t.clientY;

      input.yaw -= dx * 0.002;
      input.pitch += dy * 0.002;

      viewerRef.current.camera.setView({
        orientation: { heading: input.yaw, pitch: input.pitch },
      });
    }

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      const delta = dist - input.lastTouchDist;
      input.lastTouchDist = dist;

      input.wheelForward += delta * 0.02;
    }
  };

  const onTouchEnd = () => {
    input.isDragging = false;
    input.touches = [];
  };

  const onLeftClick = (movement: any) => {
    if (!viewerRef.current) return;
    const hit = viewerRef.current.scene.pickPosition(movement.position);

    if (!Cesium.defined(hit)) return;

    const carto = Cesium.Cartographic.fromCartesian(hit);
    const eyeHeight = viewerRef.current.camera.positionCartographic.height;
    const target = Cesium.Cartesian3.fromRadians(
      carto.longitude,
      carto.latitude,
      eyeHeight
    );
    console.log("Picked:", viewerRef.current.scene.pick(movement.position));

    moveCameraTo(target);
  };

  const moveCameraTo = (target: Cesium.Cartesian3) => {
    if (!viewerRef.current) return;
    const camera = viewerRef.current.camera;

    if (cameraTween) cameraTween.kill();

    const start = camera.position.clone();
    const cartographic = Cesium.Cartographic.fromCartesian(target);
    // console.log(cartographic);

    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const state = {
      x: start.x,
      y: start.y,
      z: start.z,
    };

    cameraTween = gsap.to(state, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.position = new Cesium.Cartesian3(state.x, state.y, state.z);
      },
    });
  };

  const updateCamera = (delta: number, viewer: Cesium.Viewer) => {
    const keyboardSpeed = 8.0;
    const wheelSpeed = 15.0;

    const camera = viewer.camera;
    const position = camera.position;

    const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const inverseEnu = Cesium.Matrix4.inverse(
      enuTransform,
      new Cesium.Matrix4()
    );

    const localDir = Cesium.Matrix4.multiplyByPointAsVector(
      inverseEnu,
      camera.direction,
      new Cesium.Cartesian3()
    );

    const forward = new Cesium.Cartesian3(localDir.x, localDir.y, 0);
    Cesium.Cartesian3.normalize(forward, forward);

    const right = new Cesium.Cartesian3(forward.y, -forward.x, 0);

    const move = new Cesium.Cartesian3();

    if (input.keys["KeyW"]) Cesium.Cartesian3.add(move, forward, move);
    if (input.keys["KeyS"]) Cesium.Cartesian3.subtract(move, forward, move);
    if (input.keys["KeyA"]) Cesium.Cartesian3.subtract(move, right, move);
    if (input.keys["KeyD"]) Cesium.Cartesian3.add(move, right, move);

    if (!Cesium.Cartesian3.equalsEpsilon(move, Cesium.Cartesian3.ZERO, 1e-6)) {
      Cesium.Cartesian3.normalize(move, move);
      Cesium.Cartesian3.multiplyByScalar(move, keyboardSpeed * delta, move);
    }

    const wheelMove = Cesium.Cartesian3.multiplyByScalar(
      forward,
      input.wheelForward * wheelSpeed * delta,
      new Cesium.Cartesian3()
    );

    input.wheelForward *= 0.82;

    const totalMove = Cesium.Cartesian3.add(
      move,
      wheelMove,
      new Cesium.Cartesian3()
    );

    if (
      !Cesium.Cartesian3.equalsEpsilon(totalMove, Cesium.Cartesian3.ZERO, 1e-6)
    ) {
      const worldMove = Cesium.Matrix4.multiplyByPointAsVector(
        enuTransform,
        totalMove,
        new Cesium.Cartesian3()
      );

      Cesium.Cartesian3.add(camera.position, worldMove, camera.position);
    }
  };

  const initTileset = async (
    viewer: Cesium.Viewer,
    collection: Cesium.PrimitiveCollection,
    cancelledRef: { current: boolean }
  ) => {
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(
        // "http://api.yoolife.vn:9900/models/03 FLA_DVTM_MEPF/tileset.json"
        "http://api.yoolife.vn:9900/models/ACT_luxembourg_pont_rouge_high_detail/tileset.json"
        // "./2507-4BI-TOW-PAR-L25-AA2-M3/tileset.json"
        // "http://api.yoolife.vn:9900/models/51218213-3ef7-4cbb-90cb-96eb903d76b6/tileset.json"
        // "./7/tileset.json"
        // "http://api.yoolife.vn:9900/models/0f318d29-31a0-4375-9a90-c75fedb12c9c/tileset.json"
        // "http://api.yoolife.vn:9900/models/07115c1a-53ef-4cab-ad20-b4475367af70/tileset.json"
        // "https://development.imaxhitech.com:9990/models/3d-tiles/04242e52-d530-47f6-9def-b242a1961338/tileset.json"
        // "./city/tileset.json"
        // "https://s3.yootek.com.vn/models/f2cf95d2-1237-4461-9196-254cbc59df1b/tileset.json"
        // "http://api.yoolife.vn:9900/models/955521df-2c4e-401a-a973-6fc3c5639798/tileset.json"
        // "http://api.yoolife.vn:9900/models/a2680f98-0520-46c4-abd5-de431ab4b534/tileset.json"
      );
      // tileset.debugShowBoundingVolume = true;
      // tileset.debugShowContentBoundingVolume = true;
      // tileset.debugColorizeTiles = true;

      tileset.style = new Cesium.Cesium3DTileStyle({ color: "color() * 1.1" });

      tileset.cacheBytes = 512 * 1024 * 1024;
      tileset.maximumCacheOverflowBytes = 64 * 1024 * 1024;
      tileset.maximumScreenSpaceError = 24;
      tileset.preloadWhenHidden = false;
      tileset.dynamicScreenSpaceError = true;
      tileset.dynamicScreenSpaceErrorDensity = 0.0025;
      tileset.dynamicScreenSpaceErrorFactor = 4.0;
      tileset.dynamicScreenSpaceErrorHeightFalloff = 0.25;

      tileset.foveatedScreenSpaceError = true;
      tileset.foveatedConeSize = 0.5;
      tileset.foveatedInterpolationCallback = Cesium.Math.lerp;
      tileset.shadows = Cesium.ShadowMode.DISABLED;

      if (cancelledRef.current || viewer.isDestroyed()) {
        tileset.destroy();
        return;
      }

      const position = Cesium.Cartesian3.fromDegrees(105.818413, 21.035685, 0);

      tileset.root.transform =
        Cesium.Transforms.eastNorthUpToFixedFrame(position);

      collection.add(tileset);
      tilesetRef.current = tileset;

      const start = Cesium.Cartesian3.fromDegrees(
        105.81787494340277,
        21.035709888152525,
        1.6
      );

      viewer.camera.setView({
        destination: start,
        orientation: { heading: 0, pitch: 0, roll: 0 },
      });

    } catch (err) {
      console.error(err);
      // if (!cancelledRef.current) console.error(err);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const cancelledRef = { current: false };

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
      targetFrameRate: 60,
    });

    // viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.sun!.show = false;
    viewer.scene.shadowMap.enabled = false;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.debugShowFramesPerSecond = true;

    viewerRef.current = viewer;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(105.818413, 21.035685, 50),
    });

    // vô hiệu default control của cesium
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableLook = false;

    const credit = viewer.cesiumWidget.creditContainer as HTMLElement;
    credit.style.display = "none";

    const collection = new Cesium.PrimitiveCollection();
    viewer.scene.primitives.add(collection);
    tilesetCollectionRef.current = collection;

    initTileset(viewer, collection, cancelledRef);

    const FIXED_DT = 1 / 90;
    let accumulator = 0;
    let lastTime = performance.now();
    viewer.scene.preUpdate.addEventListener(() => {
      const now = performance.now();
      let frameTime = (now - lastTime) / 1000;
      lastTime = now;

      frameTime = Math.min(frameTime, 0.25);

      accumulator += frameTime;
      while (accumulator >= FIXED_DT) {
        updateCamera(FIXED_DT, viewer);
        accumulator -= FIXED_DT;
      }
    });

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    renderer.setSize(width, height);

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "none";

    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight(0xffffff, 5);
    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(100, 100, 100);
    scene.add(ambient);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      1,
      10_000_000
    );

    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;
    const anchor = new THREE.Object3D();
    loader.load("https://s3.yootek.com.vn/models/a50d9cc3-8ba0-4d27-a860-9ecb08ca96fc/textured_mesh.glb", (gltf) => {
      model = gltf.scene;
      model.rotation.x = -Math.PI / 2;
      model.rotation.z = Math.PI;
      // model.scale.setScalar(2);
      // anchor.add(model);
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("https://development.imaxhitech.com:9990/yootek/1770085515937-8186.webp", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      const geo = new THREE.PlaneGeometry(5, 5);

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.y = Math.PI / 2;

      // anchor.add(mesh);
    });

    const worldPos = Cesium.Cartesian3.fromDegrees(105.818413, 21.035685, 0);

    scene.add(anchor);

    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(worldPos);
    anchor.matrixAutoUpdate = false;
    anchor.matrix.fromArray(enu);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.canvas
    );

    handler.setInputAction((click: any) => {
      mouse.x = (click.position.x / width) * 2 - 1;
      mouse.y = -(click.position.y / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      if (hits.length) {
        console.log("Object: ", hits[0].object);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewer.scene.postRender.addEventListener(() => {
      const cesiumCam = viewer.camera;

      camera.projectionMatrix.fromArray(cesiumCam.frustum.projectionMatrix);
      camera.matrixWorld.fromArray(cesiumCam.inverseViewMatrix);
      camera.matrixWorldInverse.fromArray(cesiumCam.viewMatrix);
      camera.matrixAutoUpdate = false;

      // if (model) {
      //   const enu = Cesium.Transforms.eastNorthUpToFixedFrame(worldPos);

      //   const enuMatrix = new THREE.Matrix4().fromArray(enu);
      //   const fixUp = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      //   const fixHeading = new THREE.Matrix4().makeRotationZ(Math.PI);
      //   const scaleMatrix = new THREE.Matrix4().makeScale(50, 50, 50);

      //   enuMatrix.multiply(fixUp);
      //   enuMatrix.multiply(fixHeading);
      //   enuMatrix.multiply(scaleMatrix);

      //   model.matrixAutoUpdate = false;
      //   model.matrix.copy(enuMatrix);
      // }

      renderer.render(scene, camera);
    })

    return () => {
      handler.destroy();
      renderer.dispose();
      cancelledRef.current = true;
      if (!viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    const canvas = viewer.canvas;
    const handler = viewerRef.current.screenSpaceEventHandler;

    handler.setInputAction(onMouseDown, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(onMouseUp, Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(onLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
      handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
      handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", touchAction: "none" }}
    />
  );
};

export default CesiumViewer;