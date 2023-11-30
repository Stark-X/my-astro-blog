import {
  init,
  type WalineInitOptions,
  type WalineInstance,
} from "@waline/client";
import React, { useEffect, useRef } from "react";

import "@waline/client/dist/waline.css";

export type WalineOptions = Omit<WalineInitOptions, "el"> & { path: string };

export const Waline = (props: WalineOptions) => {
  const walineInstanceRef = useRef<WalineInstance | null>(null);
  const containerRef = React.createRef<HTMLDivElement>();

  useEffect(() => {
    walineInstanceRef.current = init({
      ...props,
      el: containerRef.current,
    });

    return () => walineInstanceRef.current?.destroy();
  }, []);

  useEffect(() => {
    walineInstanceRef.current?.update(props);
  }, [props]);

  return <div ref={containerRef} />;
};