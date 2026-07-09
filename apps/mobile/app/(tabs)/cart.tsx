import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { cartApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import { AppButton, EmptyState, PriceDisplay, FloatingActionBar } from '@/components';

export default function CartScreen() {
  const { isAuthenticated, guestCart, updateGuestCartItem, removeFromGuestCart } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: serverCart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      cartApi.updateItem(id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const items = isAuthenticated
    ? serverCart?.items || []
    : guestCart.map((g) => ({
        id: g.productId + g.selectedPriceType,
        productId: g.productId,
        quantity: g.quantity,
        selectedPriceType: g.selectedPriceType,
        product: g.product,
      }));

  const subtotal = items.reduce((sum: number, item: { product?: { normalPrice: number; companyPrice: number }; selectedPriceType?: string; quantity: number }) => {
    const price =
      item.selectedPriceType === 'company'
        ? item.product?.companyPrice || 0
        : item.product?.normalPrice || 0;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (items.length === 0) return;
    router.push('/checkout');
  };

  if (isLoading && isAuthenticated) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          subtitle="Browse products and add items to your cart"
          action={<AppButton title="Start Shopping" onPress={() => router.push('/(tabs)')} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item: { id: string; product?: { id: string; name: string; imageUrl?: string; normalPrice: number; companyPrice: number }; quantity: number; selectedPriceType?: string }) => {
          const price =
            item.selectedPriceType === 'company'
              ? item.product?.companyPrice || 0
              : item.product?.normalPrice || 0;
          return (
            <View key={item.id} style={styles.item}>
              <Image
                source={{ uri: item.product?.imageUrl || '' }}
                style={styles.image}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product?.name}
                </Text>
                <PriceDisplay price={price} size="sm" showCompanyBadge={item.selectedPriceType === 'company'} />
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity <= 1) {
                        if (isAuthenticated) removeMutation.mutate(item.id);
                        else removeFromGuestCart(item.product!.id, item.selectedPriceType as 'normal' | 'company');
                      } else if (isAuthenticated) {
                        updateMutation.mutate({ id: item.id, quantity: item.quantity - 1 });
                      } else {
                        updateGuestCartItem(item.product!.id, item.quantity - 1, item.selectedPriceType as 'normal' | 'company');
                      }
                    }}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (isAuthenticated) {
                        updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 });
                      } else {
                        updateGuestCartItem(item.product!.id, item.quantity + 1, item.selectedPriceType as 'normal' | 'company');
                      }
                    }}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Remove item', 'Remove this item from cart?', [
                    { text: 'Cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => {
                        if (isAuthenticated) removeMutation.mutate(item.id);
                        else removeFromGuestCart(item.product!.id, item.selectedPriceType as 'normal' | 'company');
                      },
                    },
                  ]);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <FloatingActionBar avoidTabBar>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <AppButton title="Proceed to Checkout" onPress={handleCheckout} fullWidth size="lg" />
        {!isAuthenticated ? (
          <Text style={styles.guestNote}>Sign in required to place order</Text>
        ) : null}
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.xl },
  content: { padding: spacing.md, paddingBottom: 180 },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  image: { width: 72, height: 72, borderRadius: borderRadius.md, backgroundColor: colors.border },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { ...typography.bodySmall, color: colors.text, fontWeight: '500' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { ...typography.body, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { ...typography.body, color: colors.mutedText },
  summaryValue: { ...typography.h3, color: colors.text },
  guestNote: { ...typography.caption, color: colors.mutedText, textAlign: 'center', marginTop: spacing.sm },
});
