"use client";

import { Button, Select } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useRef, useState } from "react";
import CesiumViewerOrbit from "./cesium-viewer-orbit";
import CesiumViewer from "./cesium-viewer";
import styled from "@emotion/styled";
import CesiumWithThree from "./cesium-with-three";
import CesiumCityGml from "./cesium-city-gml";
const Layout = () => {
  return (
    <Wrapper>
      <Logo src="https://assets.yoolife.com.vn/yootek/1779695510809-1884.png" />
      <CesiumCityGml />
    </Wrapper>
  );
}
export default Layout;
const Wrapper = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
`;

const Logo = styled.img`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  height: 40px;
  z-index: 1000;
  pointer-events: none;
`;

const SettingButton = styled(Button)`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1001;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #195658;
  color: white;
  border: none;
`;

const Panel = styled.div`
  position: absolute;
  top: 60px;
  left: 12px;
  z-index: 1000;
  width: 200px;
  padding: 12px;
  background: rgba(25, 86, 88, 0.95);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ViewButton = styled(Button)`
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 1000;
  background: #195658;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 16px;
`;
