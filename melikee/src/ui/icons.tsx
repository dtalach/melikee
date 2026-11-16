/**
 * Icons, drawn from the prototype's inline SVG on a 16×16 grid.
 */
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

type P = { size?: number; color: string; fill?: string; strokeWidth?: number };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 16 16' });

export const SPARKLE = 'M8 0l1.6 6.4L16 8l-6.4 1.6L8 16 6.4 9.6 0 8l6.4-1.6z';

export function Sparkle({ size = 12, color }: { size?: number; color: string }) {
  return (
    <Svg {...base(size)} fill={color}>
      <Path d={SPARKLE} />
    </Svg>
  );
}

export function Bell({ size = 16, color, fill = 'none', strokeWidth = 1.3 }: P) {
  return (
    <Svg {...base(size)} fill={fill} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M8 2a4 4 0 014 4c0 3 1.5 4.5 1.5 4.5h-11S4 9 4 6a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0" />
    </Svg>
  );
}

export function Chevron({ size = 20, color, dir = 'left', strokeWidth = 1.6 }: P & { dir?: 'left' | 'right' | 'down' | 'up' }) {
  const d = { left: 'M10 3L5 8l5 5', right: 'M6 3l5 5-5 5', down: 'M4 6l4 4 4-4', up: 'M4 10l4-4 4 4' }[dir];
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d={d} />
    </Svg>
  );
}

export function Close({ size = 16, color, strokeWidth = 1.8 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </Svg>
  );
}

export function Lock({ size = 11, color, strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M4.5 7.5V5.5a3.5 3.5 0 017 0v2" />
      <Rect x="3" y="7.5" width="10" height="6.5" rx="1.5" />
    </Svg>
  );
}

export function People({ size = 11, color, strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx="5.5" cy="5.5" r="2.2" />
      <Circle cx="11" cy="6.5" r="1.8" />
      <Path d="M1.5 13.5c.5-2.4 2-3.6 4-3.6s3.5 1.2 4 3.6M9.5 10.5c1.8.2 3 1.2 3.5 3" />
    </Svg>
  );
}

export function LinkIcon({ size = 11, color, strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" />
    </Svg>
  );
}

export function Share({ size = 12, color, strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="3.5" r="2" />
      <Circle cx="4" cy="8" r="2" />
      <Circle cx="12" cy="12.5" r="2" />
      <Path d="M6 7l4-2.5M6 9l4 2.5" />
    </Svg>
  );
}

export function Gift({ size = 12, color, strokeWidth = 1.4 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x="2" y="6.5" width="12" height="7.5" rx="1" />
      <Path d="M2 9.5h12M8 6.5v7.5M8 6.5C8 4 5.5 3 4.5 4S6 6.5 8 6.5zm0 0c0-2.5 2.5-3.5 3.5-2.5S10 6.5 8 6.5z" />
    </Svg>
  );
}

export function Shield({ size = 16, color, strokeWidth = 1.3 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M8 1.5l5.5 2v4c0 3.3-2.3 5.9-5.5 7-3.2-1.1-5.5-3.7-5.5-7v-4z" />
      <Path d="M5.5 8l1.8 1.8L10.8 6" />
    </Svg>
  );
}

export function Gear({ size = 16, color, strokeWidth = 1.3 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="8" cy="8" r="2" />
      <Path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Svg>
  );
}

export function Search({ size = 14, color, strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="7" cy="7" r="4.5" />
      <Path d="M10.5 10.5L14 14" />
    </Svg>
  );
}

export function Heart({ size = 13, color, fill = 'none', strokeWidth = 1.5 }: P) {
  return (
    <Svg {...base(size)} fill={fill} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M8 13.5S2 9.8 2 5.8C2 3.8 3.5 2.5 5.1 2.5c1.2 0 2.2.6 2.9 1.6.7-1 1.7-1.6 2.9-1.6C12.5 2.5 14 3.8 14 5.8c0 4-6 7.7-6 7.7z" />
    </Svg>
  );
}

export function Eye({ size = 26, color, strokeWidth = 1.3 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M2 8c2-3.5 10-3.5 12 0M2 8c2 3.5 10 3.5 12 0" />
      <Circle cx="8" cy="8" r="1.8" />
    </Svg>
  );
}

export function Photos({ size = 17, color, strokeWidth = 1.4 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x="2" y="3" width="12" height="10" rx="1.5" />
      <Circle cx="6" cy="6.5" r="1.2" />
      <Path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3" />
    </Svg>
  );
}

export function Torch({ size = 17, color, fill = 'none', strokeWidth = 1.4 }: P) {
  return (
    <Svg {...base(size)} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M5 1.5h6v3l-1.5 2v8h-3v-8L5 4.5z" />
      <Path d="M8 9v2" fill="none" />
    </Svg>
  );
}

export function Plus({ size = 24, color, strokeWidth = 1.8 }: P) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M8 2.5v11M2.5 8h11" />
    </Svg>
  );
}

export function TrendLine({ color }: { color: string }) {
  return (
    <Svg width={90} height={22} viewBox="0 0 90 22" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Polyline points="0,6 15,6 30,9 45,8 60,14 75,13 90,16" />
    </Svg>
  );
}

// Dock tab icons.
export function TabFeed({ color }: { color: string }) {
  return (
    <Svg {...base(22)} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round">
      <Path d="M8 1.5l1.5 4.6 4.8.1-3.9 2.8 1.5 4.6L8 10.8l-3.9 2.8 1.5-4.6-3.9-2.8 4.8-.1z" />
    </Svg>
  );
}

export function TabLists({ color }: { color: string }) {
  return (
    <Svg {...base(22)} fill="none" stroke={color} strokeWidth={1.4}>
      <Rect x="2.5" y="5" width="11" height="9" rx="2" />
      <Path d="M4.5 3h7M6 1.3h4" />
    </Svg>
  );
}

export function TabMe({ color }: { color: string }) {
  return (
    <Svg {...base(22)} fill="none" stroke={color} strokeWidth={1.4}>
      <Circle cx="8" cy="8" r="6.2" />
      <Circle cx="8" cy="6.5" r="1.9" />
      <Path d="M4.5 12.5c.6-1.8 1.9-2.7 3.5-2.7s2.9.9 3.5 2.7" />
    </Svg>
  );
}
