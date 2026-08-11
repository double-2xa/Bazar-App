import { Redirect } from 'expo-router';

/** Legacy deep-link route from the old Whish gateway flow. */
export default function WhishReturnScreen() {
  return <Redirect href="/(tabs)/orders" />;
}
