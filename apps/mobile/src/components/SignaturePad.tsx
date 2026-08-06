import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography, radius } from '@/theme';

type Point = { x: number; y: number };

type SignaturePadProps = {
  label: string;
  onChange: (dataUrl: string | null) => void;
  height?: number;
};

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} l 0.1 0`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function strokesToSvgDataUrl(strokes: Point[][], width: number, height: number): string {
  const paths = strokes
    .map((stroke) => pointsToPath(stroke))
    .filter(Boolean)
    .map((d) => `<path d="${d}" stroke="#1F1F1F" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function SignaturePad({ label, onChange, height = 140 }: SignaturePadProps) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [size, setSize] = useState({ width: 300, height });
  const currentStroke = useRef<Point[]>([]);

  const emit = useCallback(
    (next: Point[][]) => {
      if (next.length === 0) {
        onChange(null);
        return;
      }
      onChange(strokesToSvgDataUrl(next, size.width, size.height));
    },
    [onChange, size.height, size.width],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          currentStroke.current = [{ x: e.x, y: e.y }];
          setStrokes((prev) => [...prev, currentStroke.current]);
        })
        .onUpdate((e) => {
          currentStroke.current = [...currentStroke.current, { x: e.x, y: e.y }];
          setStrokes((prev) => {
            if (prev.length === 0) return prev;
            const copy = prev.slice(0, -1);
            copy.push(currentStroke.current);
            return copy;
          });
        })
        .onEnd(() => {
          setStrokes((prev) => {
            emit(prev);
            return prev;
          });
        }),
    [emit],
  );

  const clear = () => {
    currentStroke.current = [];
    setStrokes([]);
    onChange(null);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setSize({ width, height });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={clear} hitSlop={8}>
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <View style={[styles.pad, { height }]} onLayout={onLayout}>
          <Svg width={size.width} height={size.height}>
            {strokes.map((stroke, index) => (
              <Path
                key={index}
                d={pointsToPath(stroke)}
                stroke={colors.text}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          {strokes.length === 0 ? (
            <Text style={styles.placeholder}>Sign here</Text>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  clear: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  pad: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  placeholder: {
    ...typography.caption,
    color: colors.mutedText,
    position: 'absolute',
    alignSelf: 'center',
  },
});
