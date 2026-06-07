export const sceneConfig={
    backgroundColor:0xdedede,
    gridColor:0xb5b5b5,
    axisXColor:0xcf5a5a,
    axisZColor:0x5fa55f,
    lightColor:0xffffff
} as const;

export const extrudeConfig={
    toggleKey:'e',
    stepPixels:40,
    stepFactor:0.15,
    minFactor:0.2,
} as const;

export const measureConfig={
    toggleKey:'m',
    cmPerUnit:100,
    decimals:1,
    lineColor:0x1d6fff,
    markerColor:0xff3b30,
    liftFactor:0.003,
} as const;

