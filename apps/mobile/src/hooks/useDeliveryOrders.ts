import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { deliveryApi } from '@/services/endpoints';

export function useDeliveryOrders() {
  const query = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: deliveryApi.getOrders,
    refetchInterval: 30000,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query.refetch]),
  );

  return query;
}
