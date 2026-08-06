import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius } from '@/theme';

type SignatureImageProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

function decodeSvgDataUrl(uri: string): string | null {
  if (uri.startsWith('data:image/svg+xml;charset=utf-8,')) {
    return decodeURIComponent(uri.slice('data:image/svg+xml;charset=utf-8,'.length));
  }
  if (uri.startsWith('data:image/svg+xml;utf8,')) {
    return decodeURIComponent(uri.slice('data:image/svg+xml;utf8,'.length));
  }
  if (uri.startsWith('data:image/svg+xml,')) {
    return decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
  }
  if (uri.startsWith('data:image/svg+xml;base64,')) {
    const b64 = uri.slice('data:image/svg+xml;base64,'.length);
    try {
      // eslint-disable-next-line no-undef
      return decodeURIComponent(escape(atob(b64)));
    } catch {
      return null;
    }
  }
  if (uri.trim().startsWith('<svg')) return uri;
  return null;
}

/** Renders a stored signature data-URL (SVG) reliably on native. */
export function SignatureImage({ uri, style }: SignatureImageProps) {
  const xml = decodeSvgDataUrl(uri);
  if (!xml) return <View style={[styles.box, style]} />;

  return (
    <View style={[styles.box, style]}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: 100,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
