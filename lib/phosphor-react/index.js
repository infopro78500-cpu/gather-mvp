import React, { forwardRef } from "react";

const Tree = forwardRef(function Tree(props, ref) {
  const {
    size = 24,
    weight = "regular",
    color,
    className,
    ...rest
  } = props;

  const dimension = size ?? 24;
  const fillColor = color ?? "currentColor";
  const filled = weight === "fill";

  return (
    <svg
      ref={ref}
      width={dimension}
      height={dimension}
      viewBox="0 0 256 256"
      fill={fillColor}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M216 192h-54.3l33.1-40.6a12 12 0 00-9.3-19.4H152l31.1-38.2a12 12 0 00-9.3-19.4H152l25.5-31.1A12 12 0 00168 24H88a12 12 0 00-8.7 19.7L104.8 75H92.5a12 12 0 00-9.3 19.4L114.4 132H90.2a12 12 0 00-9.3 19.4L113.9 192H64a12 12 0 000 24h64v24a12 12 0 0024 0v-24h64a12 12 0 000-24z"
        opacity={filled || weight === "duotone" ? 1 : 0.9}
      />
      {!filled && weight !== "duotone" && (
        <path
          d="M128 192v0"
          fill={fillColor}
          opacity={0}
        />
      )}
    </svg>
  );
});

export { Tree };
export default Tree;
