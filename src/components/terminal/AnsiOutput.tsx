import { useMemo, type CSSProperties } from "react";

interface AnsiOutputProps {
  value: string;
}

interface Segment {
  text: string;
  style: CSSProperties;
}

const csiPattern = new RegExp(String.raw`\u001B\[([0-?]*)([ -/]*)([@-~])`, "g");
const oscPattern = new RegExp(String.raw`\u001B\][^\u0007]*(?:\u0007|\u001B\\)`, "g");

const normalColors = [
  "#1f2937",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#60a5fa",
  "#c084fc",
  "#06b6d4",
  "#d1d5db",
];

const brightColors = [
  "#6b7280",
  "#f87171",
  "#4ade80",
  "#fbbf24",
  "#93c5fd",
  "#d8b4fe",
  "#67e8f9",
  "#f9fafb",
];

export default function AnsiOutput({ value }: AnsiOutputProps) {
  const segments = useMemo(() => parseAnsi(value), [value]);

  return (
    <>
      {segments.map((segment, index) => (
        <span key={index} style={segment.style}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

function parseAnsi(value: string): Segment[] {
  const cleanValue = value.replace(oscPattern, "");
  const segments: Segment[] = [];
  let currentStyle: CSSProperties = {};
  let lastIndex = 0;

  for (const match of cleanValue.matchAll(csiPattern)) {
    const index = match.index ?? 0;
    pushSegment(segments, cleanValue.slice(lastIndex, index), currentStyle);

    if (match[3] === "m") {
      currentStyle = applySgrCodes(currentStyle, parseSgrCodes(match[1]));
    }

    lastIndex = index + match[0].length;
  }

  pushSegment(segments, cleanValue.slice(lastIndex), currentStyle);
  return segments;
}

function pushSegment(segments: Segment[], text: string, style: CSSProperties) {
  if (!text) return;
  segments.push({ text, style: { ...style } });
}

function parseSgrCodes(params: string) {
  if (!params) return [0];
  return params
    .split(";")
    .map((part) => Number(part || "0"))
    .filter((code) => Number.isFinite(code));
}

function applySgrCodes(style: CSSProperties, codes: number[]) {
  let nextStyle: CSSProperties = { ...style };

  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];

    if (code === 0) {
      nextStyle = {};
    } else if (code === 1) {
      nextStyle.fontWeight = 700;
    } else if (code === 2) {
      nextStyle.opacity = 0.72;
    } else if (code === 3) {
      nextStyle.fontStyle = "italic";
    } else if (code === 4) {
      nextStyle.textDecoration = "underline";
    } else if (code === 22) {
      delete nextStyle.fontWeight;
      delete nextStyle.opacity;
    } else if (code === 23) {
      delete nextStyle.fontStyle;
    } else if (code === 24) {
      delete nextStyle.textDecoration;
    } else if (code >= 30 && code <= 37) {
      nextStyle.color = normalColors[code - 30];
    } else if (code >= 90 && code <= 97) {
      nextStyle.color = brightColors[code - 90];
    } else if (code === 39) {
      delete nextStyle.color;
    } else if (code >= 40 && code <= 47) {
      nextStyle.backgroundColor = normalColors[code - 40];
    } else if (code >= 100 && code <= 107) {
      nextStyle.backgroundColor = brightColors[code - 100];
    } else if (code === 49) {
      delete nextStyle.backgroundColor;
    } else if ((code === 38 || code === 48) && codes[index + 1] === 5) {
      const color = xterm256Color(codes[index + 2]);
      if (color) {
        if (code === 38) nextStyle.color = color;
        if (code === 48) nextStyle.backgroundColor = color;
      }
      index += 2;
    } else if ((code === 38 || code === 48) && codes[index + 1] === 2) {
      const color = rgbColor(codes[index + 2], codes[index + 3], codes[index + 4]);
      if (color) {
        if (code === 38) nextStyle.color = color;
        if (code === 48) nextStyle.backgroundColor = color;
      }
      index += 4;
    }
  }

  return nextStyle;
}

function xterm256Color(code: number) {
  if (!Number.isInteger(code) || code < 0 || code > 255) return null;
  if (code < 8) return normalColors[code];
  if (code < 16) return brightColors[code - 8];

  if (code >= 16 && code <= 231) {
    const adjusted = code - 16;
    const red = Math.floor(adjusted / 36);
    const green = Math.floor((adjusted % 36) / 6);
    const blue = adjusted % 6;
    return `rgb(${xtermColorStep(red)}, ${xtermColorStep(green)}, ${xtermColorStep(blue)})`;
  }

  const gray = 8 + (code - 232) * 10;
  return `rgb(${gray}, ${gray}, ${gray})`;
}

function xtermColorStep(value: number) {
  return value === 0 ? 0 : 55 + value * 40;
}

function rgbColor(red: number, green: number, blue: number) {
  if (![red, green, blue].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    return null;
  }

  return `rgb(${red}, ${green}, ${blue})`;
}
