/**
 * The app's icon set, ported path-for-path from the prototype's inline SVGs.
 * Every glyph is drawn on a 16×16 grid so sizes stay interchangeable, and
 * strokes use `currentColor` semantics via an explicit `color` prop — the mode
 * selector relies on icon and label lighting up as one unit.
 */
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, type SvgProps } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
} & Omit<SvgProps, 'color' | 'width' | 'height' | 'viewBox'>;

const box = (size: number) => ({ width: size, height: size, viewBox: '0 0 16 16' });

/** The magpie star — the brand mark, used for sparkles, toasts and badges. */
export function SparkleIcon({ size = 14, color = '#c8f542', ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M8 0l1.6 6.4L16 8l-6.4 1.6L8 16 6.4 9.6 0 8l6.4-1.6z" fill={color} />
    </Svg>
  );
}

/** Slightly rounder star used inside the shutter core. */
export function StarIcon({ size = 26, color = '#1a2004', ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5z" fill={color} />
    </Svg>
  );
}

/** The shutter glyph — "add a shiny" from anywhere (the chosen option). */
export function PlusIcon({ size = 24, color = '#1a2004', strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path
        d="M8 2.5v11M2.5 8h11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Gift box — birthdays, and the "no app needed" reassurance. */
export function GiftIcon({ size = 16, color = '#ff5da2', strokeWidth = 1.3, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Rect x={2} y={6.5} width={12} height={7.5} rx={1} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M2 9.5h12M8 6.5v7.5M8 6.5C8 4 5.5 3 4.5 4S6 6.5 8 6.5zm0 0c0-2.5 2.5-3.5 3.5-2.5S10 6.5 8 6.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

export function BellIcon({ size = 16, color = '#f6f2ff', strokeWidth = 1.3, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path
        d="M8 2a4 4 0 014 4c0 3 1.5 4.5 1.5 4.5h-11S4 9 4 6a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

// ── Capture mode glyphs ────────────────────────────────────────────────────

export function ScanIcon({ size = 13, color = '#c8f542', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path
        d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3M4.5 8h7"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

export function CameraIcon({ size = 13, color = '#c8f542', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Rect x={1.5} y={4} width={13} height={9.5} rx={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={8} cy={8.7} r={2.6} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M5.5 4l1-2h3l1 2" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function MicIcon({ size = 13, color = '#c8f542', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Rect x={6} y={1.5} width={4} height={8} rx={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M3.5 7.5a4.5 4.5 0 009 0M8 12v2.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────

export function ListsIcon({ size = 19, color = '#a79ecf', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function FeedIcon({ size = 19, color = '#a79ecf', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M2 8c2-3.5 10-3.5 12 0M2 8c2 3.5 10 3.5 12 0" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={8} cy={8} r={1.8} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function FriendsIcon({ size = 19, color = '#a79ecf', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={5.5} cy={5.5} r={2.2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={11} cy={6.5} r={1.8} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M1.5 13.5c.5-2.4 2-3.6 4-3.6s3.5 1.2 4 3.6M9.5 10.5c1.8.2 3 1.2 3.5 3"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

export function MeIcon({ size = 19, color = '#a79ecf', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={8} cy={8} r={6} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={8} cy={6.5} r={1.8} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M4.5 12.5c.6-1.8 1.9-2.7 3.5-2.7s2.9.9 3.5 2.7" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

// ── Utility ────────────────────────────────────────────────────────────────

export function CloseIcon({ size = 14, color = '#a79ecf', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M3 3l10 10M13 3L3 13" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 14, color = '#a79ecf', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M6 3l5 5-5 5" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 20, color = '#a79ecf', strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Path d="M10 3L5 8l5 5" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function ShareIcon({ size = 12, color = '#c8f542', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={12} cy={3.5} r={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={4} cy={8} r={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={12} cy={12.5} r={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M6 7l4-2.5M6 9l4 2.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

/** Visibility badge — a list only you can see. */
export function LockIcon({ size = 11, color = '#a78bfa', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Rect x={3} y={7} width={10} height={7} rx={1.5} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M5 7V5a3 3 0 016 0v2" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

/** Visibility badge — a list your friends can see. */
export function GlobeIcon({ size = 11, color = '#c8f542', strokeWidth = 1.4, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={8} cy={8} r={6} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M2 8h12M8 2c-2 2-2 10 0 12 2-2 2-10 0-12z" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function GearIcon({ size = 15, color = '#a79ecf', strokeWidth = 1.3, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={8} cy={8} r={2} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 15, color = '#a79ecf', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={7} cy={7} r={4.5} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M10.5 10.5L14 14" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

/** Person-plus — "Find your people". */
export function PersonPlusIcon({ size = 14, color = '#c8f542', strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <Svg {...box(size)} {...rest}>
      <Circle cx={6} cy={5} r={2.5} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M1.5 13.5c.5-2.6 2.2-4 4.5-4s4 1.4 4.5 4M12 4v5M9.5 6.5h5"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

/**
 * The viewfinder's corner brackets.
 *
 * Drawn as four bordered corners rather than one stretched SVG: the prototype
 * scaled a 100×100 path to a tall frame, which turns the corner radii into
 * long straight runs. Real corners keep the stroke uniform at any aspect.
 */
export function ViewfinderBrackets({
  color = '#a78bfa',
  size = 34,
  thickness = 1.5,
  radius = 14,
  opacity = 0.9,
}: {
  color?: string;
  /** Arm length of each corner. */
  size?: number;
  thickness?: number;
  radius?: number;
  opacity?: number;
}) {
  const corners = [
    { top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: radius },
    { top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: radius },
    { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: radius },
    { bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: radius },
  ];

  return (
    <View style={{ flex: 1 }} pointerEvents="none">
      {corners.map((corner, index) => (
        <View
          key={index}
          style={{ position: 'absolute', width: size, height: size, borderColor: color, opacity, ...corner }}
        />
      ))}
    </View>
  );
}
